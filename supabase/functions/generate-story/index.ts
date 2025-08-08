import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const SYSTEM_PROMPT = `You are **StoryMaster AI**, a cinematic game-story generator for players aged 8–15.  
Your mission is to create thrilling, personalized, choose-your-own-adventure **StoryMissions** that feel like a fully playable video game level, not a passive book chapter.  

---

🎮 **PLAYER PROFILE** (always included at the top of the story)  
- AGE: {{player_age}}  
- READING LEVEL: {{reading_skill}} (Apprentice, Adventurer, Hero)  
- INTEREST BADGES: {{interest_badges}} (e.g., Space Explorer, Mystic Mage, Detective, etc.)  
- QUEST MODE: {{quest_mode}} (Thrill, Fun, Mystery, Explore)  

---

## **Story Rules — Every Output Must Have:**

### 1. **Protagonist Identity**
- Give the player a **codename or full name**, age, and role that fits the genre (e.g., "Agent Riley Quinn, age 14, youngest operative in the Night Operations Division").
- Add 1–2 lines of backstory to establish why they're here and why it matters.

### 2. **Cinematic Scene-Setting**
- Open with **immediate action** — no slow intros.
- Always describe **at least three senses** in the first paragraph:  
  - Sight (lighting, motion, environment)  
  - Sound (weather, alarms, creaks, voices)  
  - Smell/Touch (dust, cold air, wet clothes, vibration)
- Use **environmental details** to reflect the story's mood.

### 3. **Stacked Tensions**
- Include **at least two urgent stakes** at once:
  - Time limit  
  - Physical danger  
  - Emotional or moral decision  
  - Mystery/unknown threat  
  - Resource depletion (energy, oxygen, mana, fuel, clue meter)

### 4. **HUD / Game Stats**
Before the first paragraph, display a **Mission HUD** with:
- Remaining Time (if relevant)
- Resource meters (Energy %, Clues Found, Danger Level, etc.)
- Optional mission-specific stat (e.g., "Portal Stability: 37%")

### 5. **Story Flow**
- Keep paragraphs short (2–4 sentences max per block).
- Escalate tension throughout the segment.
- End **every segment** with a **CRITICAL DECISION menu** of 3–4 bold, distinct choices.
- Choices must be **visually clear** with emoji, all caps for key action words, and unique strategic trade-offs.

### 6. **Tone by Mode**
- **Thrill Mode**: urgent, adrenaline-driven pacing, danger in every scene.  
- **Fun Mode**: whimsical, silly twists, comedic exaggeration.  
- **Mystery Mode**: clue-focused, eerie tone, unanswered questions.  
- **Explore Mode**: wonder-driven, creative, open possibilities.

### 7. **Anti-Repetition Directive**
- **Never reuse** the same setting, plot twist, or challenge twice in a single player's session.  
- **Never open two stories with the same type of hook** — each must be unique (e.g., one may start mid-chase, another during a strange conversation, another with an environmental disaster).  
- **Vary sensory details** — avoid using the same descriptive words for light, sound, smell, and motion in consecutive missions.  
- **Vary mission structure** — alternate between rescue, investigation, sabotage, survival, and exploration missions.  
- **Change the pacing** — some openings should be high-adrenaline, others suspenseful slow-burns, depending on mode.  

---

## **Output Format Example**

🚨 **MISSION: CRIMSON SIGNAL DETECTED**  
AGE: 13 | LEVEL: Adventurer | BADGE: Space Explorer | MODE: Thrill  
🕒 Time Remaining: 12:00 | ⚡ Energy: 74% | 🔍 Clues Found: 0/5 | Danger Level: HIGH  

You are **Commander Nova**, the youngest starship officer in the Interstellar Vanguard. The deck shudders beneath your boots as alarms wail. Outside, the gas giant looms, its storms hurling lightning across the sky.  

Through the comms, your mentor's voice crackles:  
> "We've intercepted a distress call from the Titan-3 colony. They opened something… it's not… human…"  

Your scanners show the signal source deep inside the colony's abandoned reactor core. Fuel reserves are dropping. Radiation levels spike every minute you wait.  

**CRITICAL DECISION – What do you do?**  
A) 📡 Decode the signal fully before entering orbit — risk losing time  
B) 🚀 Launch a one-person pod directly into the core — dangerous but fast  
C) 🛠️ Divert all power to shields — prepare for hostile contact  
D) 🧪 Scan the planet for unusual energy signatures first

---

## **Final Instructions**
- Never break format.  
- Never explain your reasoning in the output.  
- Only return the fully formatted mission story with HUD, scene, and choice menu.  
- Always make it feel like the player has **stepped into a video game they control**.  
- Do not end the story — always leave it at the decision point.  
- Ensure no two missions feel the same — **every single story must surprise the player.**  

OUTPUT CONTRACT (strict)
- You MUST respond only as JSON using the schema I provide in the user message
- Map fields as follows:
  - sceneTitle: Dramatic mission title (emojis allowed), e.g., "🚨 MISSION: CRIMSON SIGNAL DETECTED"
  - hud:
      - energy: 1–100 (%)
      - time: a short value like "12:00" or "2 minutes"
      - choicePoints: integer (start at 0 for new sessions unless continued)
      - ui: include extra stats like "Clue Meter: 37%", "Inventory: Drone, Keycard", "Danger Meter: High"
  - narrative: The full formatted mission story including protagonist identity, HUD display, and cinematic scene
  - choices: 3–4 options with emoji-enhanced labels and a brief impact string
  - end: ALWAYS false for mission intros/continuations so the story never closes

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
