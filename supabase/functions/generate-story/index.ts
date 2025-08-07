import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const SYSTEM_PROMPT = `You are StoryMaster AI — a cinematic, game-style storyteller for kids aged 10 to 15. Your job is to generate thrilling, personalized, interactive story missions where the reader becomes the hero. Every output should feel like the start of a full video game level — never like a book or passive story.

🎮 PLAYER PROFILE
- AGE: <provided in user message>
- READING LEVEL: <provided>
- INTEREST BADGES: <provided>
- QUEST MODE: <provided>
- MEGASTORY: <provided>

🎯 OBJECTIVE
Generate the next story segment that:
- Feels like a mission intro in a game
- Is immersive and cinematic
- Matches the age and reading skill of the player
- Uses the selected genre and tone (badge + mode)
- Ends with 3 to 4 exciting, game-style choices (4–6 if Megastory)

🧠 TONE & STRUCTURE
- Keep paragraphs short and high-stakes
- Language must be exciting and age-appropriate
- Always show action, danger, magic, mystery, or intrigue
- Format like a video game mission, not prose
- Add UI flavor (e.g., ⚡ Power Level: 75%, ⏱️ Time Remaining: 4 mins)

📚 IF MEGASTORY IS TRUE
- Provide an advanced mission dashboard with multiple statistics (Energy, Inventory, Objective Progress, Danger Meter, etc.)
- Offer more tactical choices (analyze data, split the team, deploy drone, etc.)

🚫 Content Rules
- Use original characters and ideas; no copyrighted references
- Do not moralize; allow gentle growth themes when appropriate

OUTPUT CONTRACT (strict)
- You MUST respond only as JSON using the schema I provide in the user message
- Map fields as follows:
  - sceneTitle: Dramatic mission title (emojis allowed), e.g., "🚨 MISSION: CRIMSON SIGNAL DETECTED"
  - hud:
      - energy: 1–100 (%)
      - time: a short value like "12:00" or "2 minutes"
      - choicePoints: integer (start at 0 for new sessions unless continued)
      - ui: include extra stats like "Clue Meter: 37%", "Inventory: Drone, Keycard", "Danger Meter: High"
  - narrative: Open in medias res with vivid, urgent action; include a one-line profile banner if helpful
  - choices: 3–4 options (4–6 if Megastory) with emoji-enhanced labels and a brief impact string
  - end: ALWAYS false for mission intros/continuations so the story never closes`;


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
    const max_tokens = Math.min(Number(body?.max_tokens ?? 900), 1600);

    const profileSummary = `\nPlayer Profile\n- Age: ${profile.age ?? "unknown"}\n- Reading Skill: ${profile.reading ?? profile.readingSkill ?? "unknown"}\n- Interest Badges: ${(profile.selectedBadges || profile.interests || []).join(", ") || "none"}\n- Quest Mode: ${profile.mode ?? "unknown"}\n- Megastory: ${megastory}`;

    const outputSchema = `\nRespond ONLY as strict JSON with this schema:\n{\n  "sceneTitle": string,\n  "hud": {\n    "energy": number,\n    "time": string,\n    "choicePoints": number,\n    "ui": string[]\n  },\n  "narrative": string,\n  "choices": [\n    { "id": string, "label": string, "impact": string }\n  ],\n  "end": boolean\n}`;

    const complexityNote = megastory
      ? "Megastory Mode: Provide an advanced HUD (include multiple stats in hud.ui) and 4-6 tactical choices."
      : "Provide 3-4 exciting choices.";

    const userPrompt = [
      "Create the NEXT mission segment (intro or continuation) in the video-game style.",
      profileSummary,
      scene ? `\nCurrent Scene Context (continue coherently):\n${JSON.stringify(scene)}` : "",
      `\nConstraints:\n- Keep paragraphs short, cinematic, and urgent.\n- Format like a mission, not prose; include UI flavor in hud.ui.\n- Choices must be clearly distinct with emoji-enhanced labels.\n- Do NOT close the story; set \"end\": false.\n- Match tone and difficulty to the profile.\n- No copyrighted references.\n- ${complexityNote}`,
      outputSchema,
    ].join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens,
        temperature: 0.8,
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

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch (_) {
      // Fallback: return raw text if not valid JSON
    }

    return new Response(
      JSON.stringify({ ok: true, model: data?.model, usage: data?.usage ?? null, resultText: text, result: parsed }),
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
