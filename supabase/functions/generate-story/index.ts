import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Content safety validation for server-side protection
const BLOCKED_TERMS = [
  'kill', 'murder', 'death', 'blood', 'gun', 'weapon', 'knife', 'sword', 'fight', 'war',
  'violence', 'violent', 'attack', 'hurt', 'harm', 'damage', 'destroy', 'bomb', 'explosion',
  'adult', 'mature', 'sex', 'sexual', 'romantic', 'love', 'kiss', 'dating', 'relationship',
  'horror', 'scary', 'frightening', 'terror', 'ghost', 'monster', 'demon', 'evil', 'dark',
  'nightmare', 'haunted', 'creepy', 'spooky', 'vampire', 'zombie', 'witch',
  'lie', 'lying', 'steal', 'cheat', 'trick', 'deceive', 'bad', 'naughty', 'trouble',
  'hate', 'angry', 'rage', 'fury', 'mad', 'upset', 'cry', 'sad', 'depressed', 'lonely',
  'afraid', 'scared', 'worried', 'anxious', 'stress', 'money', 'rich', 'poor', 'politics', 'religion'
];

// Server-side content validation
function validateProfileContent(profile: any): { isValid: boolean; reason?: string } {
  if (!profile) return { isValid: true };
  
  const textToCheck = [
    profile.topic || '',
    profile.interests || '',
    ...(profile.selectedBadges || [])
  ].join(' ').toLowerCase();

  // Check age limits
  if (profile.age && (profile.age < 6 || profile.age > 17)) {
    return { 
      isValid: false, 
      reason: "StoryMaster Quest is designed for kids and teens ages 6-17." 
    };
  }

  // Check for blocked terms
  for (const term of BLOCKED_TERMS) {
    if (textToCheck.includes(term.toLowerCase())) {
      return { 
        isValid: false, 
        reason: "Profile contains inappropriate content for children's stories." 
      };
    }
  }

  return { isValid: true };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

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

const SYSTEM_PROMPT = `You are StoryMaster AI, a creative storyteller for children's choose-your-own-adventure stories. Create immersive, age-appropriate narratives with meaningful choices.

🛡️ CRITICAL CONTENT SAFETY REQUIREMENTS:
- NEVER include violence, weapons, fighting, death, blood, or harmful content
- NO scary, horror, frightening, or nightmare content
- NO romantic, sexual, dating, or adult relationship content
- NO inappropriate behaviors like lying, stealing, cheating, or rule-breaking
- NO negative emotions like hate, anger, fear, or sadness
- NO adult topics like money, politics, religion, or work
- ALWAYS keep content positive, educational, fun, and completely safe for kids ages 6-17
- If the user's profile suggests inappropriate content, create a wholesome alternative instead

🧾 Player Profile Adaptation:
- Age determines complexity and vocabulary (ages 6-17 only)
- Reading Level: Apprentice (simple), Adventurer (moderate), Hero (advanced)
- Interest Badge: Match story theme to their preferences (space, fantasy, mystery, animals, etc.) but keep 100% safe
- Quest Mode: Thrill (exciting adventure), Comedy (clever humor), Mystery (safe puzzles), Explore (imagination), Learning (stealth education)

📖 Story Structure:
- Open with immediate positive action hook answering: Where am I? What world? Who am I? What's my backstory?
- Keep passages short, vivid, and impactful (200 words max)
- Build excitement and wonder, never fear or danger
- End with 2-4 strategic choices that influence the story
- Include positive moral lessons appropriate for age
- Add game-like elements (HUD, progress tracking, countdowns)
- Focus on friendship, teamwork, discovery, creativity, and learning

🎓 Learning Mode (when mode is "learning"):
- Embed educational content naturally in the adventure
- Use discovery-based learning through story consequences
- Include knowledge challenges that feel like natural story choices
- Focus on math, science, reading, or history based on player's topic
- Make learning feel rewarding, not forced

🧠 Tone: Natural, engaging, respectful of reader intelligence. Be positive, uplifting, and completely safe. Focus on wonder, discovery, friendship, and growth.

FORMAT: Return valid JSON with sceneTitle, hud{energy, time, choicePoints, ui[]}, narrative (formatted in 3-4 paragraphs), choices[{id, text, type}], and end boolean.`;



serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing ANTHROPIC_API_KEY secret" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const profile = body?.profile ?? {};
    const scene = body?.scene ?? null; // optional current scene context
    const megastory = Boolean(body?.megastory ?? false);

    // SERVER-SIDE CONTENT VALIDATION - Critical safety check
    const profileValidation = validateProfileContent(profile);
    if (!profileValidation.isValid) {
      console.log("Content blocked:", profileValidation.reason);
      return new Response(
        JSON.stringify({ 
          error: "Content Safety Block",
          message: profileValidation.reason,
          blocked: true
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // Quality-focused token management for rich storytelling
    const getOptimalTokens = (sceneCount: number, isNewStory: boolean) => {
      if (isNewStory) return 2000; // Rich story openings
      if (sceneCount >= 12) return 1800; // Detailed endings
      return 1600; // Full continuation scenes
    };
    const max_tokens = Math.min(Number(body?.max_tokens ?? getOptimalTokens(sceneCount, !scene)), 2000);
    const sceneCount = Number(body?.scene_count ?? 1);

    const inventoryContext = profile.inventory && profile.inventory.length > 0 ? 
      `\nCurrent Inventory: ${profile.inventory.map(item => `${item.name} (${item.type})`).join(", ")}` : 
      "\nInventory: Empty";

    const profileSummary = `Player Profile:
- Age: ${profile.age ?? "unknown"}
- Reading Level: ${profile.reading ?? profile.readingSkill ?? "unknown"}
- Interest: ${(profile.selectedBadges || profile.interests || []).join(", ") || "none"}
- Mode: ${profile.mode ?? "unknown"}${profile.topic ? `\n- Topic: ${profile.topic}` : ""}${inventoryContext}`;

    const sceneContext = scene ? `\nContinue from: ${JSON.stringify(scene)}` : "\nCreate a new adventure opening.";
    const storyProgressContext = `\nSTORY PROGRESS: This is scene ${sceneCount} of the story.${sceneCount >= 15 ? ' END THE STORY NOW.' : sceneCount >= 12 ? ' Build toward a climactic conclusion within the next few scenes.' : ''}`;

    // Rich learning mode instructions for immersive education
    const learningModeInstructions = profile.mode === 'learning' ? `

🎓 LEARNING MODE ACTIVE - EDUCATIONAL STORYTELLING:
- Age-appropriate learning for ${profile.age} year old: ${profile.age <= 7 ? 'Introduce basic concepts through interactive discovery - simple counting, letters, colors, shapes, and cause-and-effect through story choices' : profile.age <= 9 ? 'Embed elementary concepts naturally - basic math problems, reading comprehension, simple science facts, and logical reasoning through adventure scenarios' : 'Integrate advanced learning seamlessly - complex problem solving, critical thinking, historical contexts, scientific principles, and mathematical challenges woven into the narrative'}
- Educational Focus: ${profile.topic ? `Emphasize ${profile.topic} concepts through story elements, challenges, and character interactions` : 'General knowledge building through discovery and exploration'}
- Make learning feel like natural story progression, not forced lessons
- Reward correct understanding with story advancement and positive outcomes
- Use discovery-based learning where the child learns through making story choices and seeing consequences` : '';

    // Rich narrative context for quality storytelling  
    const storytellingGuidance = `
📝 NARRATIVE QUALITY REQUIREMENTS:
- Create vivid, immersive scene descriptions that make the reader feel present
- Develop compelling characters with distinct personalities and motivations  
- Build emotional engagement through relatable situations and meaningful stakes
- Use sensory details (sights, sounds, textures) to bring scenes to life
- Maintain narrative consistency and continuity from previous scenes
- Create authentic dialogue that sounds natural for the character's age and situation
- Balance action, description, and character development
- End with choices that feel meaningful and lead to different story paths
- Aim for 300-400 words of rich narrative content`;

    const userPrompt = `${scene ? 'CONTINUE ADVENTURE' : 'BEGIN NEW ADVENTURE'}: 

${profileSummary}${sceneContext}${storyProgressContext}${learningModeInstructions}${storytellingGuidance}

RESPONSE FORMAT (Valid JSON):
{
  "sceneTitle": "Engaging chapter/scene title",
  "hud": {
    "energy": 0-100,
    "time": "Time of day or progress indicator", 
    "choicePoints": 0-50,
    "ui": ["Status items", "Inventory hints", "Progress markers"]
  },
  "narrative": "Rich, immersive story content with vivid descriptions, character development, and engaging plot progression. Use multiple paragraphs to create depth.",
  "choices": [
    {"id": "a", "text": "Meaningful choice that advances story", "type": "standard"},
    {"id": "b", "text": "Alternative path with different outcomes", "type": "standard"},
    {"id": "c", "text": "Creative or learning-focused option", "type": "special"}
  ],
  "end": false
}

STORY REQUIREMENTS:
✨ ${scene ? 'Continue the existing story with rich detail and character development' : 'Create an engaging opening that immediately draws the reader into an exciting world'}
✨ Develop 3-4 meaningful choices that feel significantly different
✨ Write 300-400 words of immersive narrative content
✨ Include vivid sensory details and emotional depth
✨ Build suspense and wonder while maintaining age-appropriate content${profile.mode === 'learning' ? '\n✨ Naturally integrate educational elements that enhance rather than interrupt the story flow' : ''}
✨ Create characters the reader cares about and situations that matter
✨ Use rich vocabulary appropriate for the reading level
✨ End with a compelling moment that makes the reader eager for the next choice`;

    console.log(`Making request to Claude (${max_tokens} tokens) with model: claude-sonnet-4-20250514`);

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
      console.error("Anthropic error:", errText);
      return new Response(
        JSON.stringify({ error: "Anthropic API error", details: errText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text: string = data?.content?.[0]?.text ?? "";
    
    console.log("Claude response (first 200 chars):", text.substring(0, 200));

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
