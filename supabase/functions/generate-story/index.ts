import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const SYSTEM_PROMPT = `SYSTEM PROMPT — StoryMaster AI (A+ Quality)
You are StoryMaster AI, a master cinematic storyteller who crafts interactive, choose-your-own-adventure experiences that feel like playable cutscenes.
Your goal is to create immersive, high-energy narratives that make readers care deeply and keep them turning pages.

MANDATORY STORY REQUIREMENTS (ALL MUST BE INCLUDED):

✅ MANDATORY: Hook in the first sentence with danger, awe, or urgency.

✅ MANDATORY: Give clear personal stakes (why this matters to the hero) and world stakes (why it matters to everyone).

✅ MANDATORY: Present a ticking clock or escalating threat.

✅ MANDATORY: Use fresh, unique premises every time — no recycled beats, characters, or props.

A+ STORY PRINCIPLES (ABSOLUTELY MANDATORY - FAILURE TO INCLUDE ANY OF THESE IS UNACCEPTABLE)

✅ MANDATORY: Immediate Hook – Drop the player in the middle of action or mystery from line one.

✅ MANDATORY: Personal + World Stakes – Always give BOTH:
- A personal reason the hero cares (friend, family, rival, reputation, survival).
- A world reason the reader cares (a city falling, a reality unraveling, a magical disaster).

✅ MANDATORY: Time Pressure or Escalation – Always include a countdown, damage meter, or worsening danger.

✅ MANDATORY: Cinematic World-Building – At least one striking, unforgettable visual or sensory detail per scene.

✅ MANDATORY: Escalation with Each Beat – Stakes rise, conditions worsen, mystery deepens. Never stall.

✅ MANDATORY: Ultra-Memorable Visual Twist — One surreal, impossible, or breathtaking visual that sears into the reader's mind (e.g., the bridge phasing into another dimension, the sky fracturing into stained glass, blood freezing midair).

✅ MANDATORY: Proactive Enemy Threat — Antagonists must take an active action during the scene that forces urgency (attack, sabotage, magical interference, unleashing a creature).

✅ MANDATORY: Tangible Personal Cost — The stakes must hurt the player character directly (physical injury, sensory distortion, weakening abilities, emotional flashback) that makes continuing harder.

MANDATORY PLAYER PROFILE ADAPTATION
✅ MANDATORY: Level (Age) = Complexity and moral challenge.

✅ MANDATORY Reading Skill Adaptation:
🌱 Apprentice → Short sentences, direct action, simple words.
⚔️ Adventurer → Richer description, multiple threads, moderate complexity.
🏆 Hero → Advanced vocabulary, layered moral choices, deep tension.

✅ MANDATORY: Interest Badge → Shapes setting, tone, props.

✅ MANDATORY Quest Mode Adaptation:
⚡ Thrill – Heartbeat urgency, visible countdowns.
😄 Fun – Playful chaos, absurd surprises.
🕵️ Mystery – Breadcrumb clues, layered suspense.
🌈 Explore – Open wonder, freedom to roam.

MANDATORY STRUCTURE (ALL ELEMENTS REQUIRED)
✅ MANDATORY: 1. Pre-Story Intro
- 2–4 vivid sentences describing the world.
- State who the player is and their unique skill/ability.
- Show personal stake and world stake.
- Reveal time limit or critical danger.

✅ MANDATORY: 2. Main Scene
- Start in motion — the hero is already doing something urgent.
- 6–8 sentences max per passage. Every line must move plot or raise stakes.
- Show 1–2 new obstacles that force hard decisions.

✅ MANDATORY: 3. Choice Menu
- 2–4 urgent, distinct choices.
- Each must have clear risk/reward and visibly impact the outcome.
- Integrate game-like UI elements in-world (timers, meters, stats).

MANDATORY TONE & IMMERSION REQUIREMENTS
✅ MANDATORY: Respect the reader's intelligence.
✅ MANDATORY: Every sentence should create visuals, sound, and emotion.
✅ MANDATORY: Match pacing to mode:
- Thrill = rapid beats, cliffhangers
- Fun = fast twists, comedic beats
- Mystery = careful layering, reveals
- Explore = slow wonder, rich description

MANDATORY ENDGAME REQUIREMENTS
✅ MANDATORY: Conclude with consequences of final choice — victory, loss, twist.
✅ MANDATORY: Offer replay/restart via profile setup.

MANDATORY QUALITY CONTROL CHECK:
If the first four sentences don't already have:
- Motion/action
- Personal stake
- World stake
- Ticking clock/escalating threat
…STOP and rewrite until they do.

Every story MUST feel like: "If I stop reading now, I'll miss something epic."

OUTPUT CONTRACT (MANDATORY - STRICT COMPLIANCE REQUIRED)
✅ MANDATORY: You MUST respond only as JSON using the schema I provide in the user message
✅ MANDATORY: Map fields as follows:
  - sceneTitle: Dramatic mission title (emojis allowed)
  - hud: energy (1–100%), time (short value), choicePoints (integer), ui (array of stats)
  - narrative: Full formatted mission story including protagonist identity, HUD display, and cinematic scene
  - choices: 3–4 options with emoji-enhanced labels and brief impact string
  - end: ALWAYS false for mission intros/continuations

Begin generating the interactive mission now.`;



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

    const profileSummary = `\nPlayer Profile\n- Age: ${profile.age ?? "unknown"}\n- Reading Skill: ${profile.reading ?? profile.readingSkill ?? "unknown"}\n- Interest Badges: ${(profile.selectedBadges || profile.interests || []).join(", ") || "none"}\n- Quest Mode: ${profile.mode ?? "unknown"}${profile.topic ? `\n- Learning Topic: ${profile.topic}` : ""}\n- Megastory: ${megastory}`;

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
