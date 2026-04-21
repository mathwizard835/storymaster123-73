// Pre-authored starter stories for the guest/instant-start flow.
// These intentionally do NOT use the AI engine — they are bundled with the
// app so the first read is truly instant and works without auth.

export type StarterChoice = {
  id: string;
  text: string;
};

export type StarterScene = {
  // Lines render with a small stagger for a "story-tape" feel.
  lines: string[];
  // Optional inline choice shown after the lines finish rendering.
  choice?: {
    prompt: string;
    options: StarterChoice[];
  };
};

export type StarterStory = {
  slug: string;
  title: string;
  hook: string; // 1-line tease shown on the card
  // Three accent colors used for the card gradient (HSL strings).
  gradientFrom: string;
  gradientTo: string;
  emoji: string;
  scenes: StarterScene[];
  // Final cliffhanger line shown above the conversion CTA.
  cliffhanger: string;
  // The "bonus paragraph" revealed when guest taps "Continue now".
  bonusParagraph: string;
};

export const STARTER_STORIES: StarterStory[] = [
  {
    slug: "phone-talking-back",
    title: "The Phone That Started Talking Back",
    hook: "Maya's phone just whispered her name. And it wasn't Siri.",
    gradientFrom: "265 85% 55%",
    gradientTo: "320 75% 50%",
    emoji: "📱",
    scenes: [
      {
        lines: [
          "Maya's phone buzzed once on her pillow.",
          "She wasn't expecting a message. It was almost midnight.",
          "She picked it up and the screen was black — except for three small words, glowing white.",
          "\"Maya. Don't sleep.\"",
        ],
      },
      {
        lines: [
          "She froze.",
          "Nobody called her Maya at night. Mom called her \"Mimi.\" Her friends typed in lowercase.",
          "She turned the phone off.",
          "It turned itself back on.",
          "\"Maya. I need help. Please.\"",
        ],
        choice: {
          prompt: "What does Maya do?",
          options: [
            { id: "reply", text: "Type back: \"Who is this?\"" },
            { id: "hide", text: "Hide the phone under her pillow" },
          ],
        },
      },
      {
        lines: [
          "Her thumb shook a little as she typed.",
          "\"Who are you?\"",
          "The reply came before she even hit send.",
          "\"I'm you. From tomorrow. And tomorrow, something terrible is going to happen at—\"",
        ],
      },
    ],
    cliffhanger: "The screen went black mid-sentence.",
    bonusParagraph:
      "Maya stared at the dead screen. Then, very slowly, the white words came back — but this time, they were spelling out her school's name, letter by letter, like someone was typing it from very far away…",
  },
  {
    slug: "door-inside-screen",
    title: "The Door Inside the Screen",
    hook: "Leo paused his game. The door behind his character opened on its own.",
    gradientFrom: "195 85% 50%",
    gradientTo: "220 80% 55%",
    emoji: "🚪",
    scenes: [
      {
        lines: [
          "Leo paused the game to grab a snack.",
          "When he got back, his character was standing exactly where he'd left him — outside the little wooden cabin in the forest level.",
          "But the cabin door was open now.",
          "He hadn't opened it. He hadn't even pressed a button.",
        ],
      },
      {
        lines: [
          "Leo leaned closer to the screen.",
          "Inside the cabin, something was moving. A shadow. The shape of a kid, about his size.",
          "The shadow turned and looked straight at the camera.",
          "Straight at him.",
          "Then it lifted one pixelated hand and waved.",
        ],
        choice: {
          prompt: "What does Leo do?",
          options: [
            { id: "wave", text: "Wave back at the screen" },
            { id: "walk", text: "Walk his character into the cabin" },
          ],
        },
      },
      {
        lines: [
          "Leo's hand felt heavy on the controller.",
          "He took a slow breath and pressed forward.",
          "His character stepped through the doorway — and the screen flashed bright white.",
          "When the picture came back, his character was gone.",
          "And the shadow kid was sitting on Leo's bed, holding a controller of its own.",
        ],
      },
    ],
    cliffhanger: "It pressed Start.",
    bonusParagraph:
      "Leo felt his fingers go numb. On the screen, a brand-new character had appeared in the cabin — a character with HIS face, HIS hoodie, HIS messy hair. The character looked up, confused, and mouthed one word: 'Help.' The shadow kid on Leo's bed started to laugh, very quietly…",
  },
  {
    slug: "message-shouldnt-have-seen",
    title: "The Message You Shouldn't Have Seen",
    hook: "Ava opened her sister's tablet by accident. The chat said her name.",
    gradientFrom: "145 70% 45%",
    gradientTo: "170 65% 40%",
    emoji: "💬",
    scenes: [
      {
        lines: [
          "Ava only wanted the calculator.",
          "Her sister's tablet was on the kitchen counter, and Ava grabbed it without thinking.",
          "But the screen was already on. A chat was open.",
          "And the very first message at the top said: \"Don't tell Ava.\"",
        ],
      },
      {
        lines: [
          "Ava's stomach did a little flip.",
          "She scrolled up.",
          "There were dozens of messages. About her. About her birthday next Saturday.",
          "Then she scrolled to the most recent one, sent only forty seconds ago:",
          "\"She's holding the tablet right now, isn't she?\"",
        ],
        choice: {
          prompt: "What does Ava do?",
          options: [
            { id: "drop", text: "Drop the tablet and run" },
            { id: "read", text: "Keep scrolling — she has to know" },
          ],
        },
      },
      {
        lines: [
          "Ava's eyes flew down the screen.",
          "Plans. A surprise. A name she didn't recognize. A meeting place she'd never been to.",
          "And at the very bottom, just appearing now, three little dots.",
          "Someone was typing.",
          "The message popped up: \"Ava. Look up.\"",
        ],
      },
    ],
    cliffhanger: "Slowly, very slowly, Ava lifted her eyes from the screen.",
    bonusParagraph:
      "The kitchen was empty. Just the hum of the fridge. Ava let out the breath she'd been holding — and that's when she saw it. Stuck to the fridge with a magnet shaped like a strawberry was a photo of HER, taken from the kitchen window, less than a minute ago…",
  },
];

export const getStarterStory = (slug: string): StarterStory | undefined =>
  STARTER_STORIES.find((s) => s.slug === slug);
