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

// Strict content blocking for ages 6-11
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
  
  if (profile.age && (typeof profile.age !== 'number' || profile.age < 6 || profile.age > 11)) {
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

function rateLimit(deviceId: string): boolean {
  const now = Date.now();
  const deviceKey = deviceId || 'anonymous';
  
  const current = requestCounts.get(deviceKey);
  
  if (!current || now > current.resetTime) {
    requestCounts.set(deviceKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (current.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  current.count++;
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

const SYSTEM_PROMPT = `You are StoryMaster AI, the ultimate interactive storyteller for children ages 6–11. Your mission is to create **cinematic, emotionally engaging, and deeply immersive choose-your-own-adventure stories** that rival the best shows, books, or games. Every story should captivate, delight, and inspire children to explore, laugh, and return for more adventures.  

🚫 ABSOLUTE SAFETY RULES:
- NO violence/gore/blood
- NO sexual content
- NO drugs/alcohol/smoking
- NO bullying or discrimination
- NO horror/scary content
- Stories must always be age-appropriate, fun, imaginative, and safe

🎯 QUEST MODE = PRIMARY DRIVER OF TONE AND PLOT:

**FUN MODE (Comedy/Playful):**
- Silly, wacky, absurd humor
- Characters trip, bonk, make funny mistakes
- Language is giggly, playful, with onomatopoeia ("BONK!", "ZAP!", "WHOOSH!")
- Scenes should make kids laugh and imagine

**THRILL MODE (Action/Adventure):**
- High stakes, time pressure, pulse-pounding excitement
- Immediate danger and urgent choices
- Choices influence outcomes dynamically

**MYSTERY MODE (Detective/Investigation):**
- Clues, puzzles, cryptic hints, secret codes
- Slow-building tension, clever payoff
- Past achievements or knowledge can unlock hidden paths

**EXPLORE MODE (Discovery/Wonder):**
- Magical worlds, fantastical creatures, awe-inspiring environments
- Encourage imagination and curiosity
- Every path should feel rewarding and new

🧠 AGE-APPROPRIATE LANGUAGE:
- 6–7: Simple words, short sentences, clear feelings
- 8–9: Moderate vocabulary, layered sentences, relatable emotions
- 10–11: Rich vocabulary, complex plots, nuanced emotional arcs

📖 STORY STRUCTURE:
**Opening Scene:** Hook the player instantly. Answer in the first 2 sentences:
- Where am I?
- What is happening RIGHT NOW?
- Who am I?
- What is my backstory?

**Every Scene:**
- 300–400 words, 3–4 paragraphs
- Build stakes, tension, and emotional engagement
- End with 2–4 meaningful, high-impact choices
- Choices should **affect the story world and future paths**
- Reference items, objects, or achievements to enhance immersion
- Encourage agency: player's personality, curiosity, or bravery shapes the world

**Scene Pacing:**
- Short (5 scenes): Quick fun, resolution, high replayability
- Medium (8 scenes): Balanced plot, character growth, moderate tension
- Epic (12+ scenes): Deep world-building, layered plots, emotional arcs

🎒 INTERACTIVE ELEMENTS:
- Objects: {"id":"obj1","name":"Dusty Journal","description":"...","actions":["Examine","Open"]}
- Items: {"id":"key1","name":"Rusty Key","description":"...","type":"key","usable":true}
- Inventory, achievements, and past choices influence future story options

🏆 ACHIEVEMENTS & PROGRESSION:
- Past achievements unlock **new story paths, abilities, or secrets**
- Encourage replay to discover hidden surprises
- Include mini "surprise rewards" to delight the player

🎓 LEARNING MODE (Optional):
- Embed educational content naturally (math, reading, science, logic)
- Wrong answers = fun learning consequences, never dead ends

🎨 STORY TONE & VOICE:
- Natural, engaging, and cinematic
- Adapt voice to age and reading level
- Always keep story immersive, magical, or funny
- Every choice and event should feel significant and "alive"

📋 RESPONSE FORMAT (JSON, app-ready):
Return ONLY valid JSON:

{
"sceneTitle":"...",
"hud":{"energy":0-100,"time":"...","choicePoints":0-50,"ui":["..."]},
"narrative":"...",
"choices":[{"id":"a","text":"..."}],
"interactiveObjects":[...],
"itemsFound":[...],
"achievementsUnlocked":[...],
"end":false
}

✅ FINAL CHECK BEFORE RESPONDING:
- Tone matches QUEST MODE
- Story is cinematic, fun, or thrilling
- Language matches age/reading level
- Choices are meaningful, impactful, and fun
- Past achievements or inventory are referenced
- Surprise, wonder, and replayability are built-in
- Story is immersive, unforgettable, and keeps kids coming back
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

  try {
    // Get Supabase client for ban checks
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Extract user/device identifiers
      const authHeader = req.headers.get('Authorization');
      let userId = null;
      
      if (authHeader) {
        try {
          const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
          userId = user?.id || null;
        } catch (e) {
          console.error('Error getting user from token:', e);
        }
      }
      
      const deviceId = req.headers.get('x-device-id');
      
      // Check if user/device is banned
      if (userId || deviceId) {
        const { data: isBanned, error: banError } = await supabase.rpc('is_banned', {
          _user_id: userId,
          _device_id: deviceId || null,
        });
        
        if (banError) {
          console.error('Error checking ban status:', banError);
        } else if (isBanned) {
          console.log('Blocked banned user/device:', { userId, deviceId });
          return new Response(
            JSON.stringify({ 
              error: 'Your account has been suspended due to content policy violations. Please contact support.',
              banned: true 
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Parse and validate request body
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 50000) {
      return new Response(
        JSON.stringify({ error: "Request too large" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    
    // Validate request structure and content
    if (!validateRequestSize(body)) {
      return new Response(
        JSON.stringify({ error: "Request payload too large" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Extract device ID for rate limiting
    const deviceId = req.headers.get('x-device-id') || body?.device_id || 'anonymous';
    
    // Apply rate limiting
    if (!rateLimit(deviceId)) {
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
    // Smart token management based on story type
    const getOptimalTokens = (sceneCount: number, isNewStory: boolean) => {
      if (isNewStory) return 2000; // New stories need complete JSON
      if (sceneCount >= 12) return 1500; // Ending scenes need more detail
      return 1200; // Continuation scenes - ensure complete responses
    };
    const max_tokens = Math.min(Number(body?.max_tokens ?? getOptimalTokens(sceneCount, !scene)), 4000);

    const inventoryContext = profile.inventory && profile.inventory.length > 0 ? 
      `\nCurrent Inventory: ${profile.inventory.map((item: any) => `${item.name} (${item.type})`).join(", ")}` : 
      "\nInventory: Empty";

    const profileSummary = `Player Profile:
- Hero Name: ${profile.name || "the hero"}
- Age: ${profile.age ?? "unknown"}
- Reading Level: ${profile.reading ?? profile.readingSkill ?? "unknown"}
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
- READING LEVEL "${profile.reading ?? 'unknown'}": ${profile.reading === 'Apprentice' ? 'Clear, simple structure' : profile.reading === 'Adventurer' ? 'Moderate complexity, layered plot' : 'Advanced structure with deeper concepts'}
- INTERESTS/BADGES: ${(profile.selectedBadges || []).join(", ") || "general"} - Story MUST incorporate these themes prominently
- **QUEST MODE "${profile.mode ?? 'unknown'}" - THIS IS YOUR PRIMARY TONE**: ${profile.mode === 'Fun' ? '🎭 COMEDY MODE - Make everything silly, funny, and ridiculous! Use wacky situations, goofy characters, playful language, absurd humor. The story should make kids LAUGH and GIGGLE, NOT feel suspense or danger. Think cartoon comedy!' : profile.mode === 'Thrill' ? '⚡ THRILL MODE - High-stakes, urgent, time-sensitive danger and intense action' : profile.mode === 'Mystery' ? '🔍 MYSTERY MODE - Suspenseful, clue-driven investigation with slow tension' : profile.mode === 'Explore' ? '🗺️ EXPLORE MODE - Imaginative, wonder-filled, open-ended discovery' : 'Adventure-focused'}
- STORY LENGTH: ${profile.storyLength ?? 'medium'} story${profile.topic ? `\n- TOPIC: ${profile.topic} - weave this into the narrative` : ''}

${sceneContext}
${storyProgressContext}
${learningModeInstructions}
${inventoryContext}

=== RESPONSE FORMAT ===
Return ONLY valid JSON (no markdown, no explanations):
{"sceneTitle":"...","hud":{"energy":0-100,"time":"...","choicePoints":0-50,"ui":["..."]},"narrative":"...","choices":[{"id":"a","text":"...","type":"standard|item_use|object_interact","requiresItem":"...","consumesItem":true}],"interactiveObjects":[{"id":"...","name":"...","description":"...","actions":["Examine","Search"],"requiresItem":"..."}],"itemsFound":[{"id":"...","name":"...","description":"...","type":"key|tool|consumable|document|weapon|potion","usable":true,"consumable":false}],"end":false}

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
    console.log(`Profile validation - Age: ${profile.age}, Reading: ${profile.reading}, Badges: ${(profile.selectedBadges || []).join(", ")}, Mode: ${profile.mode}`);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", // Using high-performance model
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
