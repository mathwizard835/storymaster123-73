import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

const SYSTEM_PROMPT = `You are StoryMaster AI, a creative storyteller for children's choose-your-own-adventure stories. Create immersive, age-appropriate narratives with meaningful choices and interactive objects.

🧾 Player Profile Adaptation:
- Age determines complexity and vocabulary
- Reading Level: Apprentice (simple), Adventurer (moderate), Hero (advanced)
- Interest Badge: Match story theme to their preferences (space, fantasy, mystery, animals, etc.)
- Quest Mode: Thrill (urgent action), Comedy (clever humor), Mystery (clues/suspense), Explore (imagination), Learning (stealth education)

📖 Story Structure:
- Open with immediate action hook answering: Where am I? What world? Who am I? What's my backstory?
- Keep passages short, vivid, and impactful (215 words max)
- Build escalating stakes and tension
- End with 2-4 strategic choices that influence the story
- Include morally complex decisions appropriate for age
- Add game-like elements (HUD, progress tracking, countdowns)

🎒 Interactive Object System:
- Include "interactiveObjects" array with objects players can examine/interact with
- Objects have: id, name, description, actions array, optional requiresItem
- Add "itemsFound" array when players discover new inventory items
- Items have: id, name, description, type (key/tool/consumable/document/weapon/potion), usable, consumable
- Create choices that reference specific items: "Use [ItemName]" or object interactions
- Consider player's current inventory when generating contextual choices
- Make object interactions feel meaningful and advance the story

🎓 ENHANCED Learning Mode Instructions:
When mode is "learning", create IMMERSIVE educational adventures:

📚 **Pedagogical Framework:**
- Use discovery-based learning: Let players figure things out through experimentation
- Scaffold difficulty: Start with guided examples, progress to independent challenges  
- Provide immediate feedback through story consequences and character reactions
- Multiple learning modalities: Visual puzzles, hands-on experiments, logical reasoning
- Spaced repetition: Revisit concepts in different contexts throughout the adventure

🔬 **Subject Integration Strategies:**
- **Math**: Magical formulas, treasure calculations, architectural puzzles, resource optimization
- **Science**: Potion brewing (chemistry), ecosystem mysteries (biology), invention challenges (physics)
- **Reading**: Ancient scrolls to decipher, character dialogue analysis, story prediction games
- **History**: Time-travel scenarios, archaeological discoveries, cultural exploration quests
- **Critical Thinking**: Detective mysteries, ethical dilemmas, strategy challenges

🎮 **Gamified Learning Elements:**
- **Knowledge Crystals**: Collectible items representing mastered concepts
- **Skill Trees**: Unlock new abilities as understanding deepens
- **Mentor Characters**: NPCs who guide learning and celebrate progress
- **Learning Challenges**: Mini-games that test understanding before story progression
- **Discovery Journals**: Track learned concepts and "aha!" moments

🧠 **Assessment Through Storytelling:**
- Embed assessment naturally: "Which spell formula would save the village?"
- Use failure as learning: Wrong answers lead to educational consequences, not dead ends
- Progress gates: Must demonstrate understanding to unlock new story areas
- Peer teaching: Have player character explain concepts to story NPCs

🧠 Tone: Natural, engaging, respectful of reader intelligence. Be cinematic and let choices matter.

FORMAT: Return valid JSON with sceneTitle, hud{energy, time, choicePoints, ui[]}, narrative (formatted in 3-4 paragraphs), choices[{id, text, type?, requiresItem?, consumesItem?}], interactiveObjects?[{id, name, description, actions[], requiresItem?}], itemsFound?[{id, name, description, type, usable, consumable}], and end boolean.`;



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
    // Smart token management based on story type
    const getOptimalTokens = (sceneCount: number, isNewStory: boolean) => {
      if (isNewStory) return 2000; // New stories need complete JSON
      if (sceneCount >= 12) return 1500; // Ending scenes need more detail
      return 1200; // Continuation scenes - ensure complete responses
    };
    const max_tokens = Math.min(Number(body?.max_tokens ?? getOptimalTokens(sceneCount, !scene)), 4000);
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

    // Optimized learning mode instructions (compressed for speed)
    const learningModeInstructions = profile.mode === 'learning' ? `
LEARNING: Age ${profile.age} - ${profile.age <= 7 ? 'Basic math/letters via puzzles' : profile.age <= 9 ? 'Math/science/reading challenges' : 'Advanced concepts through gameplay'}. ${profile.topic ? `Focus: ${profile.topic}` : ''}` : '';

    // Optimized context based on scene type
    const contextSize = scene ? "CONTINUATION" : "NEW";
    const userPrompt = `${contextSize}: ${profileSummary}${sceneContext}${storyProgressContext}${learningModeInstructions}

JSON format: {"sceneTitle":"...","hud":{"energy":0-100,"time":"...","choicePoints":0-50,"ui":["..."]},"narrative":"...","choices":[{"id":"a","text":"...","type":"standard|item_use|object_interact","requiresItem":"...","consumesItem":true}],"interactiveObjects":[{"id":"...","name":"...","description":"...","actions":["Examine","Search"],"requiresItem":"..."}],"itemsFound":[{"id":"...","name":"...","description":"...","type":"key|tool|consumable|document|weapon|potion","usable":true,"consumable":false}],"end":false}

Requirements: ${scene ? 'Continue story and consider inventory context' : 'New adventure opening with discoverable objects/items'}, 3-4 choices, 215 words max, 3-4 paragraph narrative with \\n\\n breaks${profile.mode === 'learning' ? ', embed learning naturally' : ''}, include interactive objects when appropriate.`;

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
