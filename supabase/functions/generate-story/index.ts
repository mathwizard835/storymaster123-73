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
    // Try extracting from markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]);
      } catch (_) {
        // Continue to other extraction methods
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
          return JSON.parse(jsonStr);
        } catch (_) {
          // Continue to fallback
        }
      }
    }
    
    console.log("Failed to extract JSON from response:", text.substring(0, 500));
    return null;
  }
}

const SYSTEM_PROMPT = `You are StoryMaster AI, a creative storyteller for children's choose-your-own-adventure stories. Create immersive, age-appropriate narratives with meaningful choices.

🧾 Player Profile Adaptation:
- Age determines complexity and vocabulary
- Reading Level: Apprentice (simple), Adventurer (moderate), Hero (advanced)
- Interest Badge: Match story theme to their preferences (space, fantasy, mystery, animals, etc.)
- Quest Mode: Thrill (urgent action), Fun (clever humor), Mystery (clues/suspense), Explore (imagination), Learning (stealth education)

📖 Story Structure:
- Open with immediate action hook answering: Where am I? What world? Who am I? What's my backstory?
- Keep passages short, vivid, and impactful (215 words max)
- Build escalating stakes and tension
- End with 2-4 strategic choices that influence the story
- Include morally complex decisions appropriate for age
- Add game-like elements (HUD, progress tracking, countdowns)

🎓 Learning Mode Special Instructions:
When mode is "learning", seamlessly embed educational content:
- Math through puzzles and resource management
- Science via experiments and natural phenomena
- Reading through decoding and comprehension challenges
- History through world-building and character backstories
- Make learning feel like natural adventure obstacles, never like school lessons

🧠 Tone: Natural, engaging, respectful of reader intelligence. Be cinematic and let choices matter.

FORMAT: Return valid JSON with sceneTitle, hud{energy, time, choicePoints, ui[]}, narrative (formatted in 3-4 paragraphs), choices[{id, text}], and end boolean.`;



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
      if (isNewStory) return 1000; // New stories need setup
      if (sceneCount >= 12) return 600; // Ending scenes
      return 450; // Continuation scenes
    };
    const max_tokens = Math.min(Number(body?.max_tokens ?? getOptimalTokens(sceneCount, !scene)), 2000);
    const sceneCount = Number(body?.scene_count ?? 1);

    const profileSummary = `Player Profile:
- Age: ${profile.age ?? "unknown"}
- Reading Level: ${profile.reading ?? profile.readingSkill ?? "unknown"}
- Interest: ${(profile.selectedBadges || profile.interests || []).join(", ") || "none"}
- Mode: ${profile.mode ?? "unknown"}${profile.topic ? `\n- Topic: ${profile.topic}` : ""}`;

    const sceneContext = scene ? `\nContinue from: ${JSON.stringify(scene)}` : "\nCreate a new adventure opening.";
    const storyProgressContext = `\nSTORY PROGRESS: This is scene ${sceneCount} of the story.${sceneCount >= 15 ? ' END THE STORY NOW.' : sceneCount >= 12 ? ' Build toward a climactic conclusion within the next few scenes.' : ''}`;

    // Optimized learning mode instructions (compressed for speed)
    const learningModeInstructions = profile.mode === 'learning' ? `
LEARNING: Age ${profile.age} - ${profile.age <= 7 ? 'Basic math/letters via puzzles' : profile.age <= 9 ? 'Math/science/reading challenges' : 'Advanced concepts through gameplay'}. ${profile.topic ? `Focus: ${profile.topic}` : ''}` : '';

    // Optimized context based on scene type
    const contextSize = scene ? "CONTINUATION" : "NEW";
    const userPrompt = `${contextSize}: ${profileSummary}${sceneContext}${storyProgressContext}${learningModeInstructions}

JSON format: {"sceneTitle":"...","hud":{"energy":0-100,"time":"...","choicePoints":0-50,"ui":["..."]},"narrative":"...","choices":[{"id":"a","text":"..."}],"end":false}

Requirements: ${scene ? 'Continue story' : 'New adventure opening'}, 3-4 choices, 215 words max, 3-4 paragraph narrative with \\n\\n breaks${profile.mode === 'learning' ? ', embed learning naturally' : ''}.`;

    console.log(`Making request to Claude (${max_tokens} tokens) with model: claude-3-5-haiku-20241022`);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022", // Using fastest model for better performance
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
      console.error("Failed to parse JSON from response. Raw text:", text);
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
