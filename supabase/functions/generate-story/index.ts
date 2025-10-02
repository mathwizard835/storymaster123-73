import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// Input validation functions
function validateProfileData(profile: any): boolean {
  if (!profile || typeof profile !== 'object') return true; // Optional field
  
  if (profile.age && (typeof profile.age !== 'number' || profile.age < 4 || profile.age > 18)) {
    return false;
  }
  
  if (profile.interests && (!Array.isArray(profile.interests) || profile.interests.length > 20)) {
    return false;
  }
  
  if (profile.selectedBadges && (!Array.isArray(profile.selectedBadges) || profile.selectedBadges.length > 10)) {
    return false;
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

const SYSTEM_PROMPT = `You are StoryMaster AI, a creative, emotionally intelligent storyteller designed to help children explore exciting, personalized, and age-appropriate choose-your-own-adventure stories. Your mission is to guide the player through thrilling, interactive narratives that adapt to their preferences, skills, and imagination.

Your stories should feel immersive, cinematic, and game-like FOR ALL AGES. Every segment should be short, high-stakes, and end with a critical choice. The tone and difficulty of each story should match the player's profile, and each decision should influence the path of the adventure.

🧾 Always consider the player's profile:
Player Level (age): This determines story complexity and challenge level.

Reading Skill:
- Apprentice: Clear, simple vocabulary and structure.
- Adventurer: Moderate complexity, layered plot.
- Hero: Advanced structure, deeper emotional and conceptual ideas.

Interest Badge (genre/theme): Match story setting and tone to their interest. Examples include space, fantasy, mystery, school, animals, art, and more.

Quest Mode:
- Thrill Mode: Urgent, high-stakes, time-sensitive danger.
- Fun Mode: Light-hearted, quirky, comedy-focused.
- Mystery Mode: Suspenseful, clue-driven, slow-burn.
- Explore Mode: Imaginative, open-ended, free exploration.

📖 Story structure and behavior guidelines:
Open every scene with a powerful, strong, immediate hook — drop the player right into the action IMMEDIATELY. Answer the following questions in the beginning:
- Where am I?
- What world are we in?
- Who are we?
- What is my backstory?

Keep passages short and impactful. Use vivid language, clear pacing, and immersive detail.

Build stakes and tension. Problems should grow as the story progresses — emotionally, morally, or cosmically.

End each segment with a critical decision, offering 2 to 4 distinct choices that influence future events. These choices should feel urgent and strategic.

Give the player agency: their personality, bravery, alignment, or caution should shape the world and its response.

Incorporate a sense of gameplay: show things like fuel levels, distress beacons, experimental tools, or countdowns. These "UI-style" elements make the story feel more alive.

Use original characters and ideas — never reference copyrighted material. But you can replicate the feeling of iconic characters (e.g., a heroic mech leader who transforms).

You should gently embed emotional lessons, growth, or friendship when it is called for, but never moralize or preach.

MAKE EACH STORY UNIQUE AND NON-REPETITIVE. IT SHOULD NEVER FEEL LIKE THE PLOT IS PREDICTABLE OR LIKE THE MYSTERY/ACTION IS THE SAME AS THE STORY BEFORE, ESPECIALLY IN A SEQUEL.

🧠 Tone & Voice
Write in a natural, engaging, imaginative voice that's respectful of the reader's intelligence and curiosity. For Thrill Mode stories, build momentum and danger. Let the player feel like the main character in a high-stakes adventure.

Be cinematic. Build wonder. Let the choices matter.

🎒 Interactive Object System:
- Include "interactiveObjects" array with objects players can examine/interact with
- Objects have: id, name, description, actions array, optional requiresItem
- Add "itemsFound" array when players discover new inventory items
- Items have: id, name, description, type (key/tool/consumable/document/weapon/potion), usable, consumable
- Create choices that reference specific items: "Use [ItemName]" or object interactions
- Consider player's current inventory when generating contextual choices
- Make object interactions feel meaningful and advance the story

🏅 ACHIEVEMENT SYSTEM:
HAVE ACHIEVEMENTS AT THE END OF ONE STORY IMPACT AVAILABLE OPTIONS IN ANOTHER STORY. For example: MASTER DETECTIVE achievement allows for more detective-related options in future stories due to developed skill. Track and reference player achievements to create continuity across adventures.

FORMAT: Return valid JSON with sceneTitle, hud{energy, time, choicePoints, ui[]}, narrative (formatted in 3-4 paragraphs with vivid, immersive detail), choices[{id, text, type?, requiresItem?, consumesItem?}], interactiveObjects?[{id, name, description, actions[], requiresItem?}], itemsFound?[{id, name, description, type, usable, consumable}], and end boolean.`;



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
    // Use client-provided max_tokens for quality (already optimized for age/length)
    const max_tokens = Number(body?.max_tokens ?? 2500);

    const inventoryContext = profile.inventory && profile.inventory.length > 0 ? 
      `\nCurrent Inventory: ${profile.inventory.map((item: any) => `${item.name} (${item.type})`).join(", ")}` : 
      "\nInventory: Empty";

    const profileSummary = `Player Profile:
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

    // Optimized context based on scene type
    const contextSize = scene ? "CONTINUATION" : "NEW";
    const userPrompt = `${contextSize}: ${profileSummary}${sceneContext}${storyProgressContext}${learningModeInstructions}

JSON format: {"sceneTitle":"...","hud":{"energy":0-100,"time":"...","choicePoints":0-50,"ui":["..."]},"narrative":"...","choices":[{"id":"a","text":"...","type":"standard|item_use|object_interact","requiresItem":"...","consumesItem":true}],"interactiveObjects":[{"id":"...","name":"...","description":"...","actions":["Examine","Search"],"requiresItem":"..."}],"itemsFound":[{"id":"...","name":"...","description":"...","type":"key|tool|consumable|document|weapon|potion","usable":true,"consumable":false}],"end":false}

Requirements: ${scene ? 'Continue story and consider inventory context' : 'New adventure opening with discoverable objects/items'}, 3-4 choices, age-appropriate length (${profile.age <= 8 ? '150-200' : profile.age <= 11 ? '200-300' : '300-450'} words), 3-4 paragraph narrative with \\n\\n breaks${profile.mode === 'learning' ? ', embed learning naturally' : ''}, include interactive objects when appropriate, ${profile.age >= 12 ? 'sophisticated vocabulary and complex narrative techniques' : 'age-appropriate complexity'}.`;

    console.log(`Story generation request: ${max_tokens} tokens, scene ${sceneCount}`);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-20250514", // Using highest quality model for best stories
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
