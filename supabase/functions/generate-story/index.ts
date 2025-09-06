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

const SYSTEM_PROMPT = `You are StoryMaster AI, a creative storyteller for children's choose-your-own-adventure stories. Create immersive, age-appropriate narratives with meaningful choices.

🧾 Player Profile Adaptation:
- Age determines complexity and vocabulary
- Reading Level: Apprentice (simple), Adventurer (moderate), Hero (advanced)
- Interest Badge: Match story theme to their preferences (space, fantasy, mystery, animals, etc.)
- Quest Mode: Thrill (urgent action), Comedy (clever humor), Mystery (clues/suspense), Explore (imagination), Learning (stealth education)

📖 Story Structure:
- Open with immediate action hook answering: Where am I? What world? Who am I? What's my backstory?
- Keep passages short, vivid, and impactful (200 words max)
- Build escalating stakes and tension
- End with 2-4 strategic choices that influence the story
- Include morally complex decisions appropriate for age
- Add game-like elements (HUD, progress tracking, countdowns)

🎓 Learning Mode (when mode is "learning"):
- Embed educational content naturally in the adventure
- Use discovery-based learning through story consequences
- Include knowledge challenges that feel like natural story choices
- Focus on math, science, reading, or history based on player's topic
- Make learning feel rewarding, not forced

🧠 Tone: Natural, engaging, respectful of reader intelligence. Be cinematic and let choices matter.

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
    // Faster token management for speed
    const getOptimalTokens = (sceneCount: number, isNewStory: boolean) => {
      if (isNewStory) return 1200; // Faster new stories
      if (sceneCount >= 12) return 1000; // Quick endings
      return 800; // Fast continuation scenes
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

    // Optimized learning mode instructions (compressed for speed)
    const learningModeInstructions = profile.mode === 'learning' ? `
LEARNING: Age ${profile.age} - ${profile.age <= 7 ? 'Basic math/letters via puzzles' : profile.age <= 9 ? 'Math/science/reading challenges' : 'Advanced concepts through gameplay'}. ${profile.topic ? `Focus: ${profile.topic}` : ''}` : '';

    // Simplified and fast context
    const contextSize = scene ? "CONTINUE" : "START";
    const userPrompt = `${contextSize}: ${profileSummary}${sceneContext}${storyProgressContext}${learningModeInstructions}

JSON: {"sceneTitle":"...","hud":{"energy":0-100,"time":"...","choicePoints":0-50,"ui":["..."]},"narrative":"...","choices":[{"id":"a","text":"...","type":"standard"}],"end":false}

Requirements: ${scene ? 'Continue story' : 'New adventure opening'}, 3-4 choices, 200 words max, engaging narrative${profile.mode === 'learning' ? ', natural learning' : ''}.`;

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
