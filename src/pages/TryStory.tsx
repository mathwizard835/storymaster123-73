import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import { ArrowLeft, BookOpen, Sparkles, Trophy, Download, UserPlus } from "lucide-react";

type Choice = { label: string; next: string };
type Scene = {
  id: string;
  title: string;
  narrative: string;
  choices?: Choice[];
  ending?: boolean;
};

// Self-contained mini choose-your-own-adventure (no backend, no auth).
// ~4 scenes, ~600 words total — enough for visitors to feel the experience.
const SCENES: Record<string, Scene> = {
  start: {
    id: "start",
    title: "The Whispering Woods",
    narrative:
      "You step out of the cozy little cottage and the morning sun spills through the trees like melted gold. A folded map flutters at your feet. On it, someone has scribbled: \"The lost crown of King Pebble lies past the river. Bring it back before sundown.\" Your loyal pet fox, Ember, sniffs the page and sneezes — she always sneezes when adventure is near.\n\nAhead, the path splits. To the left, a creaky rope bridge swings over a fast, glittering river. To the right, a tall oak tree leans low, its branches whispering as if they have a secret to share.",
    choices: [
      { label: "Cross the rope bridge", next: "bridge" },
      { label: "Climb the whispering oak", next: "tree" },
    ],
  },
  bridge: {
    id: "bridge",
    title: "The Rope Bridge",
    narrative:
      "You step onto the bridge and the planks groan a tired hello. Halfway across, a grumpy river troll pops up from below, water dripping from his mossy beard. \"No one crosses,\" he rumbles, \"unless they answer my riddle: I have hands but cannot clap. I have a face but never smile. What am I?\"\n\nEmber tilts her head. You think for a moment.",
    choices: [
      { label: "Answer: \"A clock!\"", next: "crown" },
      { label: "Answer: \"A statue!\"", next: "splash" },
    ],
  },
  tree: {
    id: "tree",
    title: "The Whispering Oak",
    narrative:
      "You scramble up the gnarled oak. The branches really are whispering — soft and feathery, like a thousand tiny librarians. At the top, tucked into a hollow, you find a tiny brass key shaped like a leaf. Below you, the forest stretches out, and you spot a glittering meadow where something gold catches the sun.\n\nYou could climb back down and head for the meadow, or shimmy along a long branch that arches all the way to a moss-covered door set into the hillside.",
    choices: [
      { label: "Head for the gold in the meadow", next: "crown" },
      { label: "Try the mossy door with the leaf key", next: "crown" },
    ],
  },
  splash: {
    id: "splash",
    title: "Splash!",
    narrative:
      "The troll grins. \"Wrong!\" With a flick of his finger he tips the bridge and you tumble — SPLASH — into the cool river. Ember paddles beside you, looking very unimpressed. The current carries you both gently to a soft, sandy bank… right next to a sparkling something half-buried in the sand.",
    choices: [{ label: "Dig it up", next: "crown" }],
  },
  crown: {
    id: "crown",
    title: "The Lost Crown",
    narrative:
      "There it is — the crown of King Pebble, exactly where the map promised. It is small and silver and scattered with little river stones that twinkle like quiet stars. Ember does a happy spin. As you lift it, a warm voice drifts on the breeze: \"Thank you, brave one. The kingdom remembers.\"\n\nYou tuck the crown safely into your bag and turn for home, the sun still high, the woods a little less mysterious — and a lot more friendly.",
    ending: true,
  },
};

const TryStory = () => {
  const navigate = useNavigate();
  const [sceneId, setSceneId] = useState<string>("start");
  const [history, setHistory] = useState<string[]>([]);

  const scene = SCENES[sceneId];
  const isEnding = !!scene.ending;

  const wordsRead = useMemo(() => {
    const allIds = [...history, sceneId];
    return allIds.reduce((sum, id) => sum + (SCENES[id]?.narrative.split(/\s+/).length || 0), 0);
  }, [history, sceneId]);

  const choose = (next: string) => {
    setHistory((h) => [...h, sceneId]);
    setSceneId(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[hsl(250,50%,12%)] via-[hsl(265,55%,15%)] to-[hsl(230,50%,8%)] text-white">
      <Seo
        title="Try a Free StoryMaster Adventure — No Signup"
        description="Take a free interactive story for a spin. No account, no signup — just an adventure where your choices shape what happens next."
        canonical="/try"
      />

      <header className="sticky top-0 z-20 backdrop-blur-md bg-black/30 border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </button>
          <div className="inline-flex items-center gap-1.5 text-xs text-white/60">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{wordsRead} words read</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8">
        <AnimatePresence mode="wait">
          <motion.article
            key={scene.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs text-white/70 mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Free demo adventure
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-extrabold mb-5 leading-tight">
              {scene.title}
            </h1>
            <div className="prose prose-invert max-w-none text-base md:text-lg leading-relaxed text-white/85 whitespace-pre-line">
              {scene.narrative}
            </div>

            {!isEnding && scene.choices && (
              <div className="mt-8 space-y-3">
                <p className="text-xs uppercase tracking-wider text-white/50 font-semibold">
                  What do you do?
                </p>
                {scene.choices.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => choose(c.next)}
                    className="w-full text-left p-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/30 transition-all active:scale-[0.98] group"
                  >
                    <span className="text-base md:text-lg font-medium group-hover:text-white">
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {isEnding && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-10"
              >
                <div className="rounded-3xl bg-gradient-to-br from-[hsl(265,85%,55%)]/20 to-[hsl(195,85%,50%)]/20 border border-white/15 p-6 md:p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(265,85%,55%)] to-[hsl(195,85%,50%)] mb-4 shadow-2xl">
                    <Trophy className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">
                    Adventure complete!
                  </h2>
                  <p className="text-white/70 mb-1">
                    You just read <strong className="text-white">{wordsRead} words</strong> — without even noticing.
                  </p>
                  <p className="text-white/60 text-sm mb-6">
                    Real StoryMaster adventures are <strong>10× longer</strong>, personalized to your child, and full of brand-new worlds every time.
                  </p>

                  <div className="space-y-3">
                    <Button
                      size="lg"
                      variant="hero"
                      onClick={() => navigate("/auth")}
                      className="w-full text-base font-bold"
                    >
                      <UserPlus className="h-5 w-5" />
                      Create a free account to keep playing
                    </Button>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate("/auth");
                      }}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-md border border-white/20 bg-white/[0.04] hover:bg-white/[0.1] text-white/80 text-sm font-semibold transition"
                    >
                      <Download className="h-4 w-4" />
                      Get the iOS app (coming soon)
                    </a>
                    <button
                      onClick={() => {
                        setHistory([]);
                        setSceneId("start");
                      }}
                      className="w-full py-2 text-sm text-white/50 hover:text-white/80 transition"
                    >
                      Replay the demo
                    </button>
                  </div>
                </div>

                <p className="text-center text-xs text-white/40 mt-6">
                  3 free stories every 30 days • No credit card required
                </p>
              </motion.div>
            )}
          </motion.article>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default TryStory;
