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
    slug: "dragon-in-the-backpack",
    title: "The Dragon in My Backpack",
    hook: "Sam's backpack just sneezed. A tiny puff of smoke came out.",
    gradientFrom: "20 90% 55%",
    gradientTo: "350 80% 55%",
    emoji: "🐉",
    scenes: [
      {
        lines: [
          "Sam was walking to school when his backpack sneezed.",
          "Not a zipper sound. A real, tiny sneeze.",
          "He stopped on the sidewalk and slowly opened the top.",
          "Two shiny eyes blinked up at him from between his lunchbox and his math book.",
        ],
      },
      {
        lines: [
          "It was a baby dragon. About the size of a kitten.",
          "It was bright orange, with little wings and a very wiggly tail.",
          "\"Hi,\" said the dragon, in a squeaky voice.",
          "Sam looked around. Nobody had heard.",
          "The dragon held up one tiny claw. \"Don't take me to school. Please. I'm scared of recess.\"",
        ],
        choice: {
          prompt: "What does Sam do?",
          options: [
            { id: "hide", text: "Sneak the dragon back home" },
            { id: "bring", text: "Bring the dragon to school anyway" },
          ],
        },
      },
      {
        lines: [
          "Sam zipped the backpack almost-closed, leaving a little air gap.",
          "He made it to his classroom. He sat down. He opened his math book.",
          "Everything was fine. Everything was normal.",
          "Then his teacher said, \"Sam, why is your backpack glowing?\"",
          "Sam looked down. The whole bag was lit up like a pumpkin.",
        ],
      },
    ],
    cliffhanger: "And then it started to hum.",
    bonusParagraph:
      "The whole class went quiet. The hum got louder. Sam's backpack wiggled. It hopped once on the floor. Twenty kids were staring. The teacher took one slow step forward. And the zipper, very slowly, started to open all by itself…",
  },
  {
    slug: "library-after-dark",
    title: "The Library After Dark",
    hook: "Eli got locked in the library. Then the books started moving.",
    gradientFrom: "220 70% 30%",
    gradientTo: "260 65% 25%",
    emoji: "📚",
    scenes: [
      {
        lines: [
          "Eli was reading in the comfy chair at the back of the library.",
          "He didn't hear the bell. He didn't hear the librarian lock the door.",
          "When he looked up, the lights were off.",
          "The whole place was quiet — the kind of quiet that has a sound.",
        ],
      },
      {
        lines: [
          "Eli stood up. His shoes squeaked.",
          "Somewhere in the dark, a book fell off a shelf. Thump.",
          "Then another. Thump.",
          "He turned the corner and froze.",
          "Books were sliding off the shelves on their own — and stacking themselves into a little staircase, going up.",
        ],
        choice: {
          prompt: "What does Eli do?",
          options: [
            { id: "climb", text: "Climb the book staircase" },
            { id: "wait", text: "Stay still and watch" },
          ],
        },
      },
      {
        lines: [
          "Eli put one foot on the first book. It felt solid.",
          "He climbed. Higher. Higher than the shelves should go.",
          "At the top, there was a small wooden door he had never seen before.",
          "It had his name carved into it.",
          "The door creaked open one inch, and warm yellow light spilled out.",
        ],
      },
    ],
    cliffhanger: "Someone inside whispered, \"We've been waiting for you.\"",
    bonusParagraph:
      "Eli peeked through the crack. He saw a long room full of kids, all reading by candlelight. They all looked up at the same time and smiled. One of them waved him in. \"Hurry,\" she said. \"The story is about to start, and this time, you're in it.\"",
  },
  {
    slug: "wrong-cereal-box",
    title: "The Wrong Cereal Box",
    hook: "Lily poured her cereal. A tiny note fell into the bowl.",
    gradientFrom: "45 90% 55%",
    gradientTo: "165 70% 45%",
    emoji: "🥣",
    scenes: [
      {
        lines: [
          "Lily was eating breakfast in her pajamas.",
          "She tipped the cereal box over her bowl.",
          "Crunchy O's came out. And then — plink — a tiny folded paper.",
          "It was no bigger than her thumbnail.",
        ],
      },
      {
        lines: [
          "Lily fished it out with her spoon.",
          "She unfolded it very carefully. The handwriting was super tiny.",
          "It said: \"HELP. I am stuck inside the box. I am NOT a prize.\"",
          "Lily looked at the cereal box.",
          "The cartoon tiger on the front was staring right at her. And it had not been staring before.",
        ],
        choice: {
          prompt: "What does Lily do?",
          options: [
            { id: "open", text: "Open the back of the box and look inside" },
            { id: "ask", text: "Whisper, \"Hello?\" to the box" },
          ],
        },
      },
      {
        lines: [
          "Lily leaned close. \"Um… hello?\"",
          "The box wiggled.",
          "The cartoon tiger on the front blinked. Then he sighed.",
          "\"Finally,\" said the tiger, in a tired voice. \"Do you have any idea how long I've been in here?\"",
          "He pointed one paw at the top of the box.",
        ],
      },
    ],
    cliffhanger: "\"Open the top. Slowly. And whatever you do — don't drop me.\"",
    bonusParagraph:
      "Lily peeled back the top of the box. A little paw poked out. Then a head. Then the whole tiger — but he was only the size of a juice box. He stretched, yawned, and looked around her kitchen. \"Okay,\" he said. \"First things first. We need to talk about your spoon…\"",
  },
];

export const getStarterStory = (slug: string): StarterStory | undefined =>
  STARTER_STORIES.find((s) => s.slug === slug);
