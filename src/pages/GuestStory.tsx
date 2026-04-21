import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookmarkPlus, ChevronRight, Sparkles } from "lucide-react";
import { getStarterStory } from "@/content/starterStories";
import {
  trackGuestEvent,
  setPendingStarterStory,
} from "@/lib/guestAnalytics";
import { useAuth } from "@/hooks/useAuth";

type Phase = "reading" | "cliffhanger" | "bonus";

const GuestStory = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const story = useMemo(() => getStarterStory(slug), [slug]);

  const [sceneIndex, setSceneIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("reading");
  const [revealedLines, setRevealedLines] = useState(0);
  const [choiceMade, setChoiceMade] = useState<string | null>(null);

  // Story not found → bounce home.
  useEffect(() => {
    if (!story) navigate("/", { replace: true });
  }, [story, navigate]);

  // Stagger lines into view. ~80ms per line so the hook lands fast.
  useEffect(() => {
    if (!story || phase !== "reading") return;
    const scene = story.scenes[sceneIndex];
    if (!scene) return;
    setRevealedLines(0);
    const total = scene.lines.length;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setRevealedLines(i);
      if (i >= total) clearInterval(id);
    }, 320);
    // Show the first line immediately.
    setRevealedLines(1);
    return () => clearInterval(id);
  }, [story, sceneIndex, phase]);

  // Track scene reach.
  useEffect(() => {
    if (!story) return;
    trackGuestEvent("scene_reached", {
      storySlug: story.slug,
      sceneIndex: sceneIndex + 1,
    });
  }, [story, sceneIndex]);

  if (!story) return null;
  const scene = story.scenes[sceneIndex];
  const allLinesShown = revealedLines >= scene.lines.length;
  const isLastScene = sceneIndex === story.scenes.length - 1;

  const advance = () => {
    if (isLastScene) {
      trackGuestEvent("cliffhanger_shown", { storySlug: story.slug });
      setPhase("cliffhanger");
    } else {
      setSceneIndex((i) => i + 1);
    }
  };

  const handleChoice = (choiceId: string) => {
    setChoiceMade(choiceId);
    // Brief pause for UX, then advance.
    setTimeout(advance, 450);
  };

  const handleContinueNow = () => {
    trackGuestEvent("cliffhanger_continue", { storySlug: story.slug });
    setPhase("bonus");
    trackGuestEvent("bonus_revealed", { storySlug: story.slug });
  };

  const handleSaveProgress = () => {
    trackGuestEvent("cliffhanger_save", { storySlug: story.slug });
    setPendingStarterStory(story.slug);
    if (user) {
      navigate("/post-signup");
    } else {
      navigate(`/auth?from=cliffhanger&story=${story.slug}`);
    }
  };

  const handleSoftSignup = () => {
    setPendingStarterStory(story.slug);
    if (user) {
      navigate("/post-signup");
    } else {
      navigate(`/auth?from=cliffhanger&story=${story.slug}`);
    }
  };

  return (
    <main
      className="min-h-[100dvh] w-full overflow-x-hidden"
      style={{
        background:
          "radial-gradient(circle at 50% -10%, hsl(265 60% 16%) 0%, transparent 60%), hsl(245 45% 7%)",
      }}
    >
      <div
        className="mx-auto max-w-xl px-5 pb-12"
        style={{ paddingTop: "max(env(safe-area-inset-top, 16px), 16px)" }}
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-white/50 hover:text-white/90 text-sm py-3 -ml-2 px-2 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* READING PHASE */}
        {phase === "reading" && (
          <div className="pt-4">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-3 font-semibold">
              {story.title}
            </p>

            <div className="space-y-4 min-h-[40vh]">
              {scene.lines.slice(0, revealedLines).map((line, i) => (
                <motion.p
                  key={`${sceneIndex}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="text-white text-lg sm:text-xl leading-relaxed font-medium"
                >
                  {line}
                </motion.p>
              ))}
            </div>

            {/* Inline choice (only after all lines shown and scene has a choice) */}
            <AnimatePresence>
              {allLinesShown && scene.choice && !choiceMade && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="mt-8 space-y-3"
                >
                  <p className="text-white/60 text-sm font-semibold mb-3">
                    {scene.choice.prompt}
                  </p>
                  {scene.choice.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleChoice(opt.id)}
                      className="w-full text-left rounded-2xl px-5 py-4 bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 active:scale-[0.98] transition-all"
                    >
                      {opt.text}
                    </button>
                  ))}
                </motion.div>
              )}

              {/* Plain continue button when no choice in this scene */}
              {allLinesShown && !scene.choice && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35, delay: 0.2 }}
                  className="mt-10 flex justify-end"
                >
                  <button
                    onClick={advance}
                    className="inline-flex items-center gap-1.5 rounded-2xl px-5 py-3 bg-white text-black font-bold active:scale-[0.97] transition-transform"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* CLIFFHANGER PHASE */}
        {phase === "cliffhanger" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="pt-6"
          >
            <p className="text-white text-xl sm:text-2xl leading-relaxed font-medium italic mb-10">
              {story.cliffhanger}
            </p>

            <div className="rounded-3xl bg-white/[0.04] border border-white/10 p-6">
              <h2 className="text-white text-2xl font-extrabold mb-1">
                Continue the story?
              </h2>
              <p className="text-white/55 text-sm mb-6">
                You're at the best part. Don't stop now.
              </p>

              <button
                onClick={handleContinueNow}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[hsl(265,85%,60%)] to-[hsl(195,85%,55%)] text-white font-bold text-lg active:scale-[0.97] transition-transform flex items-center justify-center gap-2 shadow-[0_8px_28px_-10px_hsl(265,85%,60%,0.6)]"
              >
                Continue now
                <ChevronRight className="h-5 w-5" />
              </button>

              <button
                onClick={handleSaveProgress}
                className="w-full mt-3 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
              >
                <BookmarkPlus className="h-4 w-4" />
                Save progress
              </button>
            </div>
          </motion.div>
        )}

        {/* BONUS PHASE — soft signup nudge, no hard wall */}
        {phase === "bonus" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="pt-6"
          >
            <p className="text-white text-lg sm:text-xl leading-relaxed font-medium mb-10">
              {story.bonusParagraph}
            </p>

            <div className="rounded-3xl bg-gradient-to-br from-[hsl(265,60%,22%)] to-[hsl(220,60%,16%)] border border-white/10 p-6">
              <div className="flex items-center gap-2 text-white/80 text-xs font-semibold uppercase tracking-widest mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                Want the full ending?
              </div>
              <h2 className="text-white text-2xl font-extrabold leading-tight mb-2">
                Save your story and unlock the rest.
              </h2>
              <p className="text-white/60 text-sm mb-6">
                Your hero, your choices, your ending. Free to start.
              </p>

              <button
                onClick={handleSoftSignup}
                className="w-full py-4 rounded-2xl bg-white text-black font-bold text-lg active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
              >
                Save my story
                <ChevronRight className="h-5 w-5" />
              </button>

              <button
                onClick={() => navigate("/")}
                className="w-full mt-3 py-3 text-white/55 text-sm font-medium active:text-white/90 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
};

export default GuestStory;
