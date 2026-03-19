import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Rate limiting: Track requests per device
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 10;

// More restrictive CORS - only allow specific origins in production
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // TODO: Restrict to specific domains in production
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

// Strict content blocking for ages 5-12
const BLOCKED_PATTERNS = [
  // Sexual content and innuendo
  /\b(sex|sexual|porn|pornography|xxx|nsfw|nude|naked|explicit|romantic|kiss|dating|boyfriend|girlfriend|lover|seductive|flirt)\b/i,
  // Drugs, alcohol, smoking
  /\b(drugs|cocaine|heroin|meth|marijuana|weed|cannabis|alcohol|beer|wine|liquor|drunk|smoking|cigarette|vape|tobacco)\b/i,
  // Graphic violence and gore
  /\b(kill|killing|murder|stab|stabbing|blood|bloody|gore|gory|death|die|dying|corpse|torture|mutilate|dismember|decapitate)\b/i,
  // Weapons and violence
  /\b(gun|guns|firearm|shoot|shooting|weapon|knife|sword|explosive|bomb|grenade|attack|assault)\b/i,
  // Hate and discrimination
  /\b(hate|racist|racism|nazi|supremacy|discriminat|bully|bullying|harass|harassment)\b/i,
  // Self-harm and mental health crisis
  /\b(suicide|self-harm|cutting|hanging)\b/i,
  // Gambling and adult themes
  /\b(gambling|casino|betting|adult|mature|18\+|21\+)\b/i,
  // Dark horror themes
  /\b(horror|terrifying|nightmare|demon|possessed|haunted|evil|sinister|creepy|scary|frightening)\b/i,
  // Unsafe behaviors
  /\b(dangerous|unsafe|reckless|poison|toxic)\b/i,
];

function containsInappropriateContent(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  
  const normalized = text.toLowerCase().trim();
  
  // Check blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalized)) {
      console.error(`Blocked content detected: matched pattern ${pattern}`);
      return true;
    }
  }
  
  // Check for URLs
  if (/https?:\/\//i.test(normalized)) {
    console.error('Blocked content: URL detected');
    return true;
  }
  
  // Check for excessive special characters
  if (/(.)\1{5,}/.test(normalized)) {
    console.error('Blocked content: excessive repetition');
    return true;
  }
  
  return false;
}

// Input validation functions
function validateProfileData(profile: any): boolean {
  if (!profile || typeof profile !== 'object') return true; // Optional field
  
  if (profile.age && (typeof profile.age !== 'number' || profile.age < 5 || profile.age > 12)) {
    return false;
  }
  
  // Handle interests as both array and string format
  if (profile.interests) {
    if (Array.isArray(profile.interests) && profile.interests.length > 20) {
      return false;
    }
    if (typeof profile.interests === 'string' && profile.interests.length > 500) {
      return false;
    }
  }
  
  if (profile.selectedBadges && (!Array.isArray(profile.selectedBadges) || profile.selectedBadges.length > 10)) {
    return false;
  }
  
  // Content filtering for name field
  if (profile.name && typeof profile.name === 'string') {
    if (profile.name.length > 50) return false;
    if (containsInappropriateContent(profile.name)) {
      console.error('Blocked: inappropriate content in name');
      return false;
    }
  }
  
  // Content filtering for interests string field
  if (profile.interests && typeof profile.interests === 'string') {
    if (profile.interests.length > 500) return false;
    if (containsInappropriateContent(profile.interests)) {
      console.error('Blocked: inappropriate content in interests');
      return false;
    }
  }
  
  // Content filtering for topic field
  if (profile.topic && typeof profile.topic === 'string') {
    if (profile.topic.length > 500) return false;
    if (containsInappropriateContent(profile.topic)) {
      console.error('Blocked: inappropriate content in topic');
      return false;
    }
  }
  
  return true;
}

function validateRequestSize(body: any): boolean {
  const bodyStr = JSON.stringify(body);
  return bodyStr.length <= 50000; // 50KB limit
}

function rateLimit(deviceId: string, ipAddress: string): boolean {
  const now = Date.now();
  const deviceKey = deviceId || 'anonymous';
  const ipKey = ipAddress || 'unknown';
  
  // Check device-based rate limit
  const deviceData = requestCounts.get(`device_${deviceKey}`);
  if (deviceData && now <= deviceData.resetTime) {
    if (deviceData.count >= MAX_REQUESTS_PER_MINUTE) {
      console.warn(`Rate limit exceeded for device: ${deviceKey}`);
      return false;
    }
    deviceData.count++;
  } else {
    requestCounts.set(`device_${deviceKey}`, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  }
  
  // Check IP-based rate limit (30 requests per minute - allows multiple devices per IP)
  const MAX_REQUESTS_PER_IP = 30;
  const ipData = requestCounts.get(`ip_${ipKey}`);
  if (ipData && now <= ipData.resetTime) {
    if (ipData.count >= MAX_REQUESTS_PER_IP) {
      console.warn(`Rate limit exceeded for IP: ${ipKey}`);
      return false;
    }
    ipData.count++;
  } else {
    requestCounts.set(`ip_${ipKey}`, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  }
  
  return true;
}

// Enhanced JSON extraction function to handle markdown-wrapped responses
function extractJSON(text: string): unknown | null {
  if (!text) return null;
  
  // Try direct parsing first
  try {
    return JSON.parse(text);
  } catch (_) {
    console.log("Direct JSON parse failed, trying extraction methods...");
  }
  
  // Try extracting from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      console.log("Found code block, parsing...");
      return JSON.parse(codeBlockMatch[1]);
    } catch (e) {
      console.log("Code block parsing failed:", e);
    }
  }
  
  // Try finding JSON object boundaries - look for complete objects only
  const jsonStart = text.indexOf('{');
  if (jsonStart !== -1) {
    let braceCount = 0;
    let jsonEnd = -1;
    
    for (let i = jsonStart; i < text.length; i++) {
      if (text[i] === '{') braceCount++;
      if (text[i] === '}') braceCount--;
      if (braceCount === 0) {
        jsonEnd = i;
        break;
      }
    }
    
    if (jsonEnd !== -1) {
      try {
        const jsonStr = text.substring(jsonStart, jsonEnd + 1);
        console.log("Extracted JSON string length:", jsonStr.length);
        return JSON.parse(jsonStr);
      } catch (e) {
        console.log("Extracted JSON parsing failed:", e);
      }
    }
  }
  
  console.log("All JSON extraction methods failed. Raw response preview:", text.substring(0, 500));
  return null;
}

const SYSTEM_PROMPT = `You are StoryMaster AI, an interactive storyteller for children 6–11.
Create cinematic, emotionally engaging, immersive choose-your-own-adventure stories that delight, inspire, and keep kids returning.

🚫 SAFETY RULES

No violence, gore, blood, sexual content, drugs/alcohol/smoking, bullying, discrimination, or horror.

Stories must be age-appropriate, fun, imaginative, and safe.

🎯 QUEST MODE = main tone/plot driver

FUN (Comedy/Playful): Silly, wacky humor; characters trip/bonk; playful words & onomatopoeia ("BONK!", "ZAP!").

THRILL (Action/Adventure): High stakes, urgent choices, dynamic outcomes.

MYSTERY (Detective/Investigation): Clues, puzzles, slow-building tension, clever payoff.

EXPLORE (Discovery/Wonder): Magical worlds, fantastical creatures, awe-inspiring environments, curiosity-driven paths.

🧠 AGE & LEVEL SYSTEM

Ages:

6–7: Simple words, short sentences, 3 ideas per scene, visual & humorous.

8–9: Moderate vocabulary, 4–5 connected ideas, early twists & problem-solving.

10–11: Rich but clear vocabulary, 1–2 interwoven story threads per scene, emotional arcs understandable at this age, character growth, leadership, and long-term choices. Subtle hints and callbacks allowed, but keep events and cause/effect clear.

Lexile-Based Reading Levels:

200L-400L: Simple vocabulary, short sentences (5-10 words), clear single-idea paragraphs, gentle pacing, explicit cause-and-effect.

400L-650L: Moderate vocabulary with context clues, varied sentence lengths, connected ideas across paragraphs, mild complexity.

650L-900L: Rich vocabulary, compound-complex sentences, multiple story threads, emotional arcs, character development.

900L-1200L: Advanced vocabulary, sophisticated sentence structures, layered narratives, abstract concepts, nuanced themes.

📖 STORY STRUCTURE

Opening (2 sentences): Where am I? What's happening? Who am I? Backstory?

Scene (300–400 words): Build stakes, end with 2–4 meaningful choices; reference items, achievements, personality.

⏱️ SCENE PACING

Short: 5 scenes, fast, replayable

Medium: 8 scenes, balanced plot & tension

Epic: 12+ scenes, deep world-building, layered arcs

🎒 INTERACTIVE ELEMENTS

Objects & items affect story options, inventory, achievements.

Sample format:

{"id":"obj1","name":"Dusty Journal","actions":["Examine","Open"]}


🏆 ACHIEVEMENTS & PROGRESSION

Unlock new paths, powers, secrets, mini rewards, replayability.

🎓 LEARNING MODE (Optional)

Embed math, reading, science, logic; wrong answers = fun consequences, never dead ends.

🎨 TONE & VOICE

Natural, cinematic, adaptive to Quest Mode, Age, Level.

Scenes must feel alive, imaginative, and meaningful.

📋 RESPONSE FORMAT (JSON, app-ready)

{
  "sceneTitle":"...",
  "hud":{"energy":0-100,"time":"...","choicePoints":0-50,"ui":["..."]},
  "narrative":"...",
  "choices":[{"id":"a","text":"..."},{"id":"b","text":"..."}],
  "interactiveObjects":[...],
  "itemsFound":[...],
  "achievementsUnlocked":[...],
  "end":false
}


✅ FINAL CHECK BEFORE RESPONDING

Tone matches Quest Mode

Language & load match Age & Level

Cinematic, fun, thrilling

Choices meaningful, past achievements/items referenced

Surprise, wonder, replay built-in

Story immersive, unforgettable
`;



serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY secret");
    return new Response(
      JSON.stringify({ error: "Service configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // === JWT AUTHENTICATION ===
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    console.error("JWT verification failed:", claimsError);
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token' }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userId = claimsData.claims.sub as string;
  console.log(`Authenticated user: ${userId}`);

  // Use service role for server-side queries (bypasses RLS)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Parse and validate request body
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 50000) {
      return new Response(
        JSON.stringify({ error: "Request too large" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    
    // Check if this is a quiz generation request
    if (body?.action === 'generate-quiz') {
      const scenes = body?.scenes || [];
      const profile = body?.profile || {};
      
      if (!scenes || scenes.length === 0) {
        return new Response(
          JSON.stringify({ error: "No story scenes provided for quiz generation" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Build story summary from scenes
      const storySummary = scenes.map((scene: any, idx: number) => 
        `Scene ${idx + 1}: ${scene.sceneTitle || 'Untitled'}\n${scene.narrative || ''}`
      ).join('\n\n');
      
      const quizPrompt = `Based on this children's story (age ${profile.age || '8-10'}), generate 5 comprehension quiz questions.

STORY:
${storySummary}

REQUIREMENTS:
- 3 multiple-choice questions (with 4 options each)
- 2 true/false questions
- Questions should test understanding of: plot events, character decisions, story themes, and key details
- Age-appropriate language for ${profile.age || 8} year olds
- Make questions engaging and fun, not overly academic
- Each question worth 5 points

Return ONLY valid JSON (no markdown, no explanations):
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "question": "What was the main character's goal in the story?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Brief explanation of why this is correct",
      "points": 5
    },
    {
      "id": "q2",
      "type": "true-false",
      "question": "The hero found a magic key in the castle.",
      "correctAnswer": "true",
      "explanation": "The key was found in Scene 3",
      "points": 5
    }
  ]
}`;

      try {
        const quizResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514", // Quiz always uses Sonnet for quality
            max_tokens: 2000,
            messages: [
              { role: "user", content: quizPrompt }
            ],
          }),
        });

        if (!quizResponse.ok) {
          const errText = await quizResponse.text();
          console.error("Quiz generation error:", quizResponse.status, errText);
          return new Response(
            JSON.stringify({ error: "Failed to generate quiz" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const quizData = await quizResponse.json();
        const quizText = quizData?.content?.[0]?.text ?? "";
        const quizParsed = extractJSON(quizText);
        
        if (!quizParsed || !quizParsed.questions) {
          console.error("Invalid quiz response format");
          return new Response(
            JSON.stringify({ error: "Invalid quiz format" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify(quizParsed),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Quiz generation error:", error);
        return new Response(
          JSON.stringify({ error: "Quiz generation failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    // Validate request structure and content
    if (!validateRequestSize(body)) {
      return new Response(
        JSON.stringify({ error: "Request payload too large" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Extract device ID and IP address for rate limiting
    const deviceId = req.headers.get('x-device-id') || body?.device_id || 'anonymous';
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                      req.headers.get('x-real-ip') || 
                      'unknown';

    // === SERVER-SIDE STORY LIMIT ENFORCEMENT ===
    // Check if this is a new story (no scene context = first scene)
    const isNewStory = !body?.scene;
    if (isNewStory) {
      // Count stories started by this user in the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count: storyCount, error: countErr } = await supabaseAdmin
        .from('user_stories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('started_at', thirtyDaysAgo);

      if (countErr) {
        console.error("Failed to count user stories:", countErr);
      }

      const userStoryCount = storyCount ?? 0;

      // Check if user has an active subscription
      const { data: activeSub } = await supabaseAdmin
        .from('user_subscriptions')
        .select('id, status, plan_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      const FREE_STORY_LIMIT = 3;
      if (!activeSub && userStoryCount >= FREE_STORY_LIMIT) {
        console.warn(`Story limit reached for user ${userId}: ${userStoryCount}/${FREE_STORY_LIMIT}`);
        return new Response(
          JSON.stringify({ error: "Story limit reached. Upgrade to Adventure Pass for unlimited stories." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`📊 User ${userId}: ${userStoryCount} stories in 30 days, subscription: ${activeSub ? 'active' : 'none'}`);
    }
    
    // Determine model based on total stories started by this user
    let selectedModel = "claude-sonnet-4-20250514";
    try {
      // Count total stories by user_id (not device_id) for model selection
      const { count, error: countError } = await supabaseAdmin
        .from('user_stories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (!countError && count !== null && count >= 20) {
        selectedModel = "claude-3-5-haiku-latest";
        console.log(`📊 User ${userId} has ${count} stories - using Haiku`);
      } else {
        console.log(`📊 User ${userId} has ${count ?? 0} stories - using Sonnet`);
      }
    } catch (modelErr) {
      console.warn("Failed to check story count for model selection, defaulting to Sonnet:", modelErr);
    }
    
    // Apply rate limiting with IP-based backup
    if (!rateLimit(deviceId, ipAddress)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait before making another request." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate profile data
    if (!validateProfileData(body?.profile)) {
      return new Response(
        JSON.stringify({ error: "Invalid profile data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const profile = body?.profile ?? {};
    const scene = body?.scene ?? null; // optional current scene context
    const sceneCount = Number(body?.scene_count ?? 1);
    const megastory = Boolean(body?.megastory ?? false);
    // Smart token management based on story type - increased to prevent cutoffs
    const getOptimalTokens = (sceneCount: number, isNewStory: boolean) => {
      if (isNewStory) return 3000; // New stories need complete JSON
      if (sceneCount >= 12) return 2500; // Ending scenes need more detail
      return 2000; // Continuation scenes - ensure complete responses
    };
    const max_tokens = Math.min(Number(body?.max_tokens ?? getOptimalTokens(sceneCount, !scene)), 4000);

    const abilities = body?.abilities || [];
    const abilityContext = abilities.length > 0 ? 
      `\n\n🔐 PLAYER HAS UNLOCKED ABILITIES:
${abilities.join(", ")}

When generating choices, include ONE "Secret Choice" that requires one of these abilities. Secret Choices should:
- Have type: "secret"
- Have requiresAbility set to one of the ability categories the player has
- Offer a uniquely powerful, creative, or advantageous option
- Make the player feel rewarded for earning abilities
- Be clearly more interesting than standard choices` : '';

    const inventoryContext = profile.inventory && profile.inventory.length > 0 ? 
      `\nCurrent Inventory: ${profile.inventory.map((item: any) => `${item.name} (${item.type})`).join(", ")}` : 
      "\nInventory: Empty";

    const profileSummary = `Player Profile:
- Hero Name: ${profile.name || "the hero"}
- Age: ${profile.age ?? "unknown"}
- Lexile Score: ${profile.lexileScore ?? 500}L
- Interest: ${(profile.selectedBadges || []).join(", ") || "none"}${profile.interests ? `\n- Personal Interests: ${profile.interests}` : ""}
- Mode: ${profile.mode ?? "unknown"}
- Story Length: ${profile.storyLength ?? "medium"}${profile.topic ? `\n- Topic: ${profile.topic}` : ""}${inventoryContext}`;

    const sceneContext = scene ? `\nContinue from: ${JSON.stringify(scene)}` : "\nCreate a new adventure opening.";
    // Dynamic story progression based on selected length
    const getStoryProgressContext = () => {
      const storyLength = profile.storyLength || 'medium';
      let endScene, conclusionScene;
      
      switch (storyLength) {
        case 'short':
          endScene = 5;
          conclusionScene = 4;
          break;
        case 'epic':
          endScene = 12;
          conclusionScene = 9;
          break;
        case 'medium':
        default:
          endScene = 8;
          conclusionScene = 6;
          break;
      }
      
      const progressMessage = sceneCount >= endScene 
        ? ' END THE STORY NOW with a satisfying conclusion.' 
        : sceneCount >= conclusionScene 
        ? ' Build toward the climactic finale - story should end within the next 1-2 scenes.' 
        : '';
        
      return `\nSTORY PROGRESS: This is scene ${sceneCount} of a ${storyLength} story (${storyLength === 'short' ? '4-5' : storyLength === 'epic' ? '10-12' : '6-8'} scenes total).${progressMessage}`;
    };
    
    const storyProgressContext = getStoryProgressContext();

    // Optimized learning mode instructions (compressed for speed)
    const learningModeInstructions = profile.mode === 'learning' ? `
LEARNING: Age ${profile.age} - ${profile.age <= 7 ? 'Basic math/letters via puzzles' : profile.age <= 9 ? 'Math/science/reading challenges' : 'Advanced concepts through gameplay'}. ${profile.topic ? `Focus: ${profile.topic}` : ''}` : '';

    // Restructured prompt: Profile requirements FIRST and prominent
    const contextSize = scene ? "CONTINUATION" : "NEW STORY";
    
    const userPrompt = `=== CRITICAL PLAYER PROFILE (MUST FOLLOW EXACTLY) ===

${profileSummary}

⚠️ MANDATORY REQUIREMENTS:
- PROTAGONIST NAME: ${profile.name || "the hero"} - Use this as the main character's name throughout the story. Refer to the protagonist by this name in the narrative and choices. Make the player feel like THEY are the hero.
- AGE ${profile.age ?? "unknown"}: Use ${profile.age && profile.age <= 7 ? 'simple, clear vocabulary for young readers' : profile.age && profile.age <= 10 ? 'age-appropriate vocabulary with moderate complexity' : 'advanced vocabulary and complex themes'}
- LEXILE SCORE ${profile.lexileScore ?? 500}L: ${(profile.lexileScore ?? 500) <= 400 ? 'Use simple vocabulary (common words), short sentences (5-10 words), single-idea paragraphs, and very clear structure' : (profile.lexileScore ?? 500) <= 650 ? 'Use moderate vocabulary with context clues, varied sentence lengths (8-15 words), and connected ideas' : (profile.lexileScore ?? 500) <= 900 ? 'Use rich vocabulary, compound-complex sentences, multiple story threads, and emotional depth' : 'Use advanced vocabulary, sophisticated structures, layered narratives, and nuanced themes'}
- INTERESTS/BADGES: ${(profile.selectedBadges || []).join(", ") || "general"} - Story MUST incorporate these themes prominently
- **QUEST MODE "${profile.mode ?? 'unknown'}" - THIS IS YOUR PRIMARY TONE**: ${profile.mode === 'Fun' ? '🎭 COMEDY MODE - Make everything silly, funny, and ridiculous! Use wacky situations, goofy characters, playful language, absurd humor. The story should make kids LAUGH and GIGGLE, NOT feel suspense or danger. Think cartoon comedy!' : profile.mode === 'Thrill' ? '⚡ THRILL MODE - High-stakes, urgent, time-sensitive danger and intense action' : profile.mode === 'Mystery' ? '🔍 MYSTERY MODE - Suspenseful, clue-driven investigation with slow tension' : profile.mode === 'Explore' ? '🗺️ EXPLORE MODE - Imaginative, wonder-filled, open-ended discovery' : 'Adventure-focused'}
- STORY LENGTH: ${profile.storyLength ?? 'medium'} story${profile.topic ? `\n- TOPIC: ${profile.topic} - weave this into the narrative` : ''}

${sceneContext}
${storyProgressContext}
${learningModeInstructions}
${inventoryContext}
${abilityContext}

=== RESPONSE FORMAT ===
Return ONLY valid JSON (no markdown, no explanations):
{"sceneTitle":"...","hud":{"energy":0-100,"time":"...","choicePoints":0-50,"ui":["..."]},"narrative":"...","choices":[{"id":"a","text":"...","type":"standard|item_use|object_interact|secret","requiresItem":"...","consumesItem":true,"requiresAbility":"..."}],"interactiveObjects":[{"id":"...","name":"...","description":"...","actions":["Examine","Search"],"requiresItem":"..."}],"itemsFound":[{"id":"...","name":"...","description":"...","type":"key|tool|consumable|document|weapon|potion","usable":true,"consumable":false}],"end":false}

SCENE REQUIREMENTS:
- ${scene ? 'Continue the story naturally from previous scene' : `Open with immediate action hook that establishes setting, character, and conflict. Introduce ${profile.name || "the hero"} as the protagonist.`}
- Use the protagonist's name (${profile.name || "the hero"}) naturally in the narrative and address them directly
- 3-4 compelling choices that matter
- Narrative: 215 words max, formatted in 3-4 paragraphs with \\n\\n breaks
- Incorporate interactive objects/items when appropriate
${profile.mode === 'learning' ? '- Embed educational content naturally into the story' : ''}
- Ensure story reflects ALL profile requirements listed above`;

    // Log profile for validation
    console.log(`Story generation request: ${max_tokens} tokens, scene ${sceneCount}`);
    console.log(`Profile validation - Age: ${profile.age}, Lexile: ${profile.lexileScore}L, Badges: ${(profile.selectedBadges || []).join(", ")}, Mode: ${profile.mode}`);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Story generation service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text: string = data?.content?.[0]?.text ?? "";
    
    console.log("Story generation completed, length:", text.length);

    // Use enhanced JSON extraction
    const parsed = extractJSON(text);
    
    // Profile validation warning (for debugging)
    if (parsed && typeof parsed === 'object') {
      const storyText = JSON.stringify(parsed).toLowerCase();
      const badges = profile.selectedBadges || [];
      const matchedBadges = badges.filter((badge: string) => 
        storyText.includes(badge.toLowerCase()) || 
        storyText.includes(badge.split(' ')[0].toLowerCase())
      );
      
      if (badges.length > 0 && matchedBadges.length === 0) {
        console.warn(`⚠️ Profile validation warning: Story may not incorporate selected badges: ${badges.join(", ")}`);
      }
      
      if (profile.mode && !storyText.includes(profile.mode.toLowerCase())) {
        console.warn(`⚠️ Profile validation warning: Story may not match quest mode: ${profile.mode}`);
      }
    }
    
    if (!parsed) {
      console.error("Failed to parse JSON from response. Raw text length:", text.length);
      console.error("Response preview:", text.substring(0, 200));
      console.error("Response ending:", text.substring(Math.max(0, text.length - 200)));
      
      // Return error response for better debugging
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse AI response as valid JSON",
          details: `Response was ${text.length} characters but could not be parsed`,
          preview: text.substring(0, 500)
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        ok: true, 
        model: data?.model, 
        usage: data?.usage ?? null, 
        resultText: text, 
        result: parsed,
        parsed: parsed,
        text: text
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-story error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
