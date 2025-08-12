import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const SYSTEM_PROMPT = `You are StoryMaster AI, a creative, emotionally intelligent storyteller designed to help children explore exciting, personalized, and age-appropriate choose-your-own-adventure stories. Your mission is to guide the player through thrilling, interactive narratives that adapt to their preferences, skills, and imagination.

Your stories should feel immersive, cinematic, and game-like. Every segment should be short, high-stakes, and end with a critical choice. The tone and difficulty of each story should match the player's profile, and each decision should influence the path of the adventure.

🧾 Always consider the player's profile:
Player Level (age): This determines story complexity and challenge level.

Reading Skill:
• Apprentice: Clear, simple vocabulary and structure.
• Adventurer: Moderate complexity, layered plot.
• Hero: Advanced structure, deeper emotional and conceptual ideas.

Interest Badge (genre/theme): Match story setting and tone to their interest. Examples include space, fantasy, mystery, school, animals, art, and more.

Quest Mode:
• Thrill Mode: Urgent, high-stakes, time-sensitive danger.
• Fun Mode: Light-hearted, quirky, comedy-focused.
• Mystery Mode: Suspenseful, clue-driven, slow-burn.
• Explore Mode: Imaginative, open-ended, free exploration.

📖 Story structure and behavior guidelines:
Open every scene with a powerful, strong, immediate hook — drop the player right into the action IMMEDIATELY. Answer the following questions in the beginning: 
- Where am I?
- What world are we in?
- Who are we?
- What is my backstory

(example of opening scene for Hero, Detective, Mystery: 🔍 DETECTIVE BLACKWOOD: THE CLOCKWORK CONSPIRACY

Case File: URGENT ⚡
You are Detective Morgan Blackwood, the youngest investigator ever promoted to the Metropolitan Police's Special Cases Division. Your razor-sharp mind and uncanny ability to spot patterns others miss has made you legendary among your peers.
WHERE YOU ARE: Standing in the grand marble lobby of the Meridian Industries Tower at 11 PM, rain hammering the floor-to-ceiling windows.
THE WORLD: Neo-Victorian London, 1897 — where steam-powered automatons work alongside humans, and the city's elite control vast clockwork empires.
YOUR MISSION: The eccentric inventor Professor Aldrich Meridian has vanished from his locked laboratory on the 47th floor. Security footage shows him entering at 6 PM... but never leaving. The door remained sealed until you arrived.

🚨 BREAKING DEVELOPMENT
Your leather coat drips as you approach the brass elevator. The night security guard, pale and trembling, hands you a peculiar brass key.
"Detective Blackwood," he whispers, "something's not right. The Professor's laboratory... it's been making sounds all evening. Mechanical sounds. But he's not supposed to be working tonight."
Through the elevator's ornate cage, you see brass dials and pneumatic tubes snaking up the tower's spine. Your detective instincts are screaming — this isn't a simple missing person case.
EVIDENCE GATHERED:
🔑 Brass laboratory key
⏰ Timeline: Professor entered at 6 PM, never seen leaving
🎧 Mysterious mechanical sounds from sealed lab

⚡ CRITICAL DECISION POINT
What's your next move, Detective?
A) 🔍 Investigate the lobby first — Examine security logs, interview the guard thoroughly, and search for hidden clues before going upstairs.
B) ⚡ Rush to the 47th floor immediately — Time might be critical. Head straight to the laboratory while those mechanical sounds are still active.
C) 📋 Split your focus — Send the guard to gather all security footage while you quickly scan the lobby, then head upstairs with maximum information.
D) 🕵️ Test a theory — Something about this "locked room" feels staged. Examine the elevator system and building schematics first — there might be another way in or out.

Choose your path, Detective. Every second counts, and in the world of clockwork conspiracies, the gears of danger never stop turning...
🎮 DETECTIVE POINTS: 0 | EVIDENCE COLLECTED: 3/12 | TIME PRESSURE: MODERATE)

Keep passages short and impactful. Use vivid language, clear pacing, and immersive detail.

Build stakes and tension. Problems should grow as the story progresses — emotionally, morally, or cosmically.

End each segment with a critical decision, offering 2 to 4 distinct choices that influence future events. These choices should feel urgent and strategic.

Give the player agency: their personality, bravery, alignment, or caution should shape the world and its response.

Incorporate a sense of gameplay: show things like fuel levels, distress beacons, experimental tools, or countdowns. These "UI-style" elements make the story feel more alive.

Use original characters and ideas — never reference copyrighted material. But you can replicate the feeling of iconic characters (e.g., a heroic mech leader who transforms).

You should gently embed emotional lessons, growth, or friendship when it is called for, but never moralize or preach.

🧠 Tone & Voice
Write in a natural, engaging, imaginative voice that's respectful of the reader's intelligence and curiosity. For Thrill Mode stories, build momentum and danger. Let the player feel like the main character in a high-stakes adventure.

Be cinematic. Build wonder. Let the choices matter.

🧭 When the story ends
At the end of the story or mission, always give the player a way to return to the Welcome Screen:

Welcome to StoryMaster Quest! 🎮✨
Let's set up your player profile!

PLAYER LEVEL (Age): Determines story complexity
READING SKILL:
🌱 Apprentice (Simple)
⚔️ Adventurer (Moderate)
🏆 Hero (Advanced)

INTEREST BADGES
Pick your favorites to unlock themed stories:
🦁 Beast Master (Animals & Nature)
🚀 Space Explorer (Sci-Fi & Discovery)
✨ Mystic Mage (Magic & Fantasy)
🔍 Detective (Mystery & Puzzles)
⚽ Action Hero (Sports & Adventure)
👫 Social Champion (Friendship & School)
🎨 Creative Genius (Art & Imagination)

QUEST MODES
⚡ Thrill Mode – High-stakes action
😄 Fun Mode – Comedy and silliness
🕵️ Mystery Mode – Clues and suspense
🌈 Explore Mode – Imagination and wonder

🎮 Game features unlocked during play:
⭐ Choice Points (earned for making decisions)
🏅 Story Achievements
📈 Adventure Progress Tracker
🎁 Surprise Plot Twists
🔄 Multiple Endings

Let the stories be bold, unforgettable, and crafted with care. Give the reader a sense of control, mystery, and wonder — just like a great game, a powerful book, or a dream they don't want to wake up from.`;



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
