import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Progress } from "@/components/ui/progress";
import { Seo } from "@/components/Seo";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  BookOpen,
  Trophy,
  UserPlus,
  Loader2,
  PawPrint,
  Rocket,
  Search,
  Target,
  Users,
  Paintbrush,
  Zap,
  Smile,
  Eye,
  Compass,
} from "lucide-react";

// ---------------------------------------------------------------
// Self-contained guest demo: a real personalized AI-generated story.
// Uses generate-story edge function in `guest:true` mode (no auth, no DB write).
// Limited to short length (4-5 scenes).
// ---------------------------------------------------------------

const BADGES = [
  { id: "beast", label: "Animals", icon: PawPrint },
  { id: "space", label: "Space", icon: Rocket },
  { id: "mystic", label: "Magic", icon: Sparkles },
  { id: "detective", label: "Mystery", icon: Search },
  { id: "action", label: "Action", icon: Target },
  { id: "social", label: "Friends", icon: Users },
  { id: "creative", label: "Art & Music", icon: Paintbrush },
];

const MODES = [
  { id: "thrill", label: "Thrill", icon: Zap },
  { id: "comedy", label: "Comedy", icon: Smile },
  { id: "mystery", label: "Mystery", icon: Eye },
  { id: "explore", label: "Explore", icon: Compass },
];

const getDefaultLexile = (age: number) => {
  const map: Record<number, number> = { 5: 200, 6: 300, 7: 400, 8: 500, 9: 600, 10: 750, 11: 900, 12: 1000 };
  return map[age] ?? 500;
};

type Choice = {
  id: string;
  text: string;
  type?: string;
};
type Scene = {
  sceneTitle?: string;
  narrative?: string;
  choices?: Choice[];
  end?: boolean;
};

type Stage = "setup" | "loading" | "playing" | "finished" | "error" | "demoUsed";

const TOTAL_STEPS = 3;

const TryStory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Setup state
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState(8);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [mode, setMode] = useState("thrill");
  const [interests, setInterests] = useState("");

  // Story state
  const [stage, setStage] = useState<Stage>("setup");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [error, setError] = useState<string>("");

  const wordsRead = scenes.reduce((sum, s) => sum + (s.narrative?.split(/\s+/).length || 0), 0)
    + (currentScene?.narrative?.split(/\s+/).length || 0);

  const profile = {
    name: name || "the hero",
    age,
    lexileScore: getDefaultLexile(age),
    selectedBadges: selectedBadges.length ? selectedBadges : ["action"],
    mode,
    storyLength: "short" as const,
    interests,
  };

  const callGenerate = async (sceneContext: Scene | null, sceneCount: number): Promise<Scene> => {
    const { data, error: invokeError } = await supabase.functions.invoke("generate-story", {
      body: {
        guest: true,
        profile,
        scene: sceneContext,
        scene_count: sceneCount,
      },
    });
    if (invokeError) {
      // Supabase wraps non-2xx into a FunctionsHttpError; try to parse a JSON body if present
      const ctx: any = (invokeError as any)?.context;
      let bodyJson: any = null;
      try {
        if (ctx?.json) bodyJson = await ctx.json();
        else if (ctx?.body) bodyJson = JSON.parse(await new Response(ctx.body).text());
      } catch (_) { /* ignore */ }
      if (bodyJson?.error === "demo_used") {
        const err: any = new Error("demo_used");
        err.code = "demo_used";
        throw err;
      }
      throw new Error(invokeError.message || "Could not reach the story service");
    }
    if (data?.error === "demo_used") {
      const err: any = new Error("demo_used");
      err.code = "demo_used";
      throw err;
    }
    if (!data?.success && !data?.ok) {
      throw new Error(data?.error || "Story generation failed");
    }
    const parsed: Scene | null = data?.result ?? data?.parsed ?? null;
    if (!parsed) throw new Error("The story service returned an unexpected response");
    return parsed;
  };

  const markDemoUsed = () => {
    try { localStorage.setItem("demo_story_used", "1"); } catch (_) { /* ignore */ }
  };

  const startStory = async () => {
    if (!selectedBadges.length && !interests.trim()) {
      toast({ title: "Pick something fun!", description: "Choose at least one interest or tell us what you love." });
      setStep(2);
      return;
    }
    setStage("loading");
    setError("");
    try {
      const first = await callGenerate(null, 1);
      setCurrentScene(first);
      const done = !!first.end;
      setStage(done ? "finished" : "playing");
      if (done) markDemoUsed();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      console.error("Demo story start failed:", e);
      if (e?.code === "demo_used") {
        markDemoUsed();
        setStage("demoUsed");
        return;
      }
      setError(e?.message || "Something went wrong starting your adventure.");
      setStage("error");
    }
  };

  const choose = async (choice: Choice) => {
    if (!currentScene) return;
    const completedScene = { ...currentScene, chosen: choice.id };
    const newScenes = [...scenes, completedScene];
    setScenes(newScenes);
    setStage("loading");
    try {
      const next = await callGenerate(
        { ...currentScene, lastChoiceId: choice.id, lastChoiceText: choice.text } as any,
        newScenes.length + 1,
      );
      setCurrentScene(next);
      // Hard cap: end after 5 scenes total to keep demo short.
      const isLast = next.end || newScenes.length + 1 >= 5;
      setStage(isLast ? "finished" : "playing");
      if (isLast) markDemoUsed();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      console.error("Demo next scene failed:", e);
      setError(e?.message || "Something went wrong continuing your adventure.");
      setStage("error");
    }
  };

  // ----------------- Render -----------------

  const renderSetup = () => (
    <div className="max-w-lg mx-auto px-5 py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : navigate("/"))}
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span className="text-xs text-white/60">Step {step} of {TOTAL_STEPS}</span>
          <div className="w-12" />
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="h-1.5" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="font-heading text-2xl md:text-3xl font-extrabold mb-1">Who's the hero?</h2>
                <p className="text-white/60 text-sm">We'll write a story starring you.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Hero name (optional)</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={30}
                  placeholder="e.g. Maya"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-lg py-6 text-center"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-white/80">How old are you?</Label>
                <div className="text-center">
                  <span className="text-5xl font-extrabold text-white">{age}</span>
                  <span className="text-white/60 ml-2">years old</span>
                </div>
                <Slider value={[age]} min={5} max={12} step={1} onValueChange={(v) => setAge(v[0] ?? 8)} />
                <div className="flex justify-between text-xs text-white/50"><span>5</span><span>12</span></div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="font-heading text-2xl md:text-3xl font-extrabold mb-1">What do you love?</h2>
                <p className="text-white/60 text-sm">Pick one or more — we'll weave them in.</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {BADGES.map((b) => {
                  const Icon = b.icon;
                  const active = selectedBadges.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() =>
                        setSelectedBadges((prev) =>
                          prev.includes(b.id) ? prev.filter((x) => x !== b.id) : [...prev, b.id],
                        )
                      }
                      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-3 transition ${
                        active
                          ? "bg-white/15 border-white text-white"
                          : "border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-semibold">{b.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Anything specific?</Label>
                <Input
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  maxLength={120}
                  placeholder="e.g. dragons, pizza, time travel..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="font-heading text-2xl md:text-3xl font-extrabold mb-1">Pick your vibe</h2>
                <p className="text-white/60 text-sm">What kind of adventure do you want?</p>
              </div>
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(v) => v && setMode(v)}
                className="grid grid-cols-2 gap-2"
              >
                {MODES.map((m) => {
                  const Icon = m.icon;
                  return (
                    <ToggleGroupItem
                      key={m.id}
                      value={m.id}
                      className="rounded-xl border-2 border-white/15 bg-white/[0.04] text-white/80 data-[state=on]:bg-white/15 data-[state=on]:border-white data-[state=on]:text-white px-3 py-4"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {m.label}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
              <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 text-xs text-white/60">
                Demo stories are short (about 4–5 scenes). Sign up to create longer, fully personalized adventures.
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8">
        {step < TOTAL_STEPS ? (
          <Button size="lg" variant="hero" className="w-full" onClick={() => setStep(step + 1)}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="lg" variant="hero" className="w-full text-base font-bold" onClick={startStory}>
            <Sparkles className="h-5 w-5" />
            Start my adventure
          </Button>
        )}
      </div>
    </div>
  );

  const renderLoading = () => (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-white/80 mb-5" />
      <h2 className="font-heading text-xl font-bold mb-1">Writing your story…</h2>
      <p className="text-white/60 text-sm max-w-sm">
        Our AI is dreaming up an adventure starring {name || "you"}. This usually takes 5–15 seconds.
      </p>
    </div>
  );

  const renderPlaying = () => {
    if (!currentScene) return null;
    return (
      <main className="max-w-2xl mx-auto px-5 py-8">
        <AnimatePresence mode="wait">
          <motion.article
            key={scenes.length}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs text-white/70 mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Scene {scenes.length + 1} • Free demo
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-extrabold mb-5 leading-tight">
              {currentScene.sceneTitle || "Your adventure"}
            </h1>
            <div className="text-base md:text-lg leading-relaxed text-white/85 whitespace-pre-line">
              {currentScene.narrative}
            </div>

            {currentScene.choices && currentScene.choices.length > 0 && (
              <div className="mt-8 space-y-3">
                <p className="text-xs uppercase tracking-wider text-white/50 font-semibold">
                  What do you do?
                </p>
                {currentScene.choices.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => choose(c)}
                    className="w-full text-left p-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/30 transition-all active:scale-[0.98] group"
                  >
                    <span className="text-base md:text-lg font-medium group-hover:text-white">
                      {c.text}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.article>
        </AnimatePresence>
      </main>
    );
  };

  const renderFinished = () => (
    <main className="max-w-2xl mx-auto px-5 py-8">
      {currentScene && (
        <article className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs text-white/70 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Final scene
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-extrabold mb-5 leading-tight">
            {currentScene.sceneTitle || "The end"}
          </h1>
          <div className="text-base md:text-lg leading-relaxed text-white/85 whitespace-pre-line">
            {currentScene.narrative}
          </div>
        </article>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="rounded-3xl bg-gradient-to-br from-[hsl(265,85%,55%)]/20 to-[hsl(195,85%,50%)]/20 border border-white/15 p-6 md:p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(265,85%,55%)] to-[hsl(195,85%,50%)] mb-4 shadow-2xl">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Adventure complete!</h2>
          <p className="text-white/70 mb-1">
            {name ? `${name}, you` : "You"} just read{" "}
            <strong className="text-white">{wordsRead} words</strong>.
          </p>
          <p className="text-white/60 text-sm mb-6">
            Real StoryMaster adventures are <strong>longer</strong>, save your progress, level up your hero,
            and unlock new worlds every time.
          </p>

          <div className="space-y-3">
            <Button size="lg" variant="hero" onClick={() => navigate("/auth")} className="w-full text-base font-bold">
              <UserPlus className="h-5 w-5" />
              Create a free account to keep playing
            </Button>
          </div>
        </div>
        <p className="text-center text-xs text-white/40 mt-6">
          3 free stories every 30 days • No credit card required
        </p>
      </motion.div>
    </main>
  );

  const renderError = () => (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-md mx-auto">
      <h2 className="font-heading text-xl font-bold mb-2">Adventure interrupted</h2>
      <p className="text-white/60 text-sm mb-6">{error}</p>
      <div className="space-y-3 w-full">
        <Button variant="hero" className="w-full" onClick={() => (scenes.length === 0 ? startStory() : navigate("/auth"))}>
          {scenes.length === 0 ? "Try again" : "Sign up to keep playing"}
        </Button>
        <Button variant="ghost" className="w-full text-white/70" onClick={() => navigate("/")}>
          Back home
        </Button>
      </div>
    </div>
  );

  const renderDemoUsed = () => (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-md mx-auto">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(265,85%,55%)] to-[hsl(195,85%,50%)] mb-5 shadow-2xl">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h2 className="font-heading text-2xl font-bold mb-2">You've already tried your free demo</h2>
      <p className="text-white/70 text-sm mb-6">
        Create a free account to keep playing — longer adventures, saved progress, and a hero that levels up every story.
      </p>
      <div className="space-y-3 w-full">
        <Button size="lg" variant="hero" className="w-full text-base font-bold" onClick={() => navigate("/auth")}>
          <UserPlus className="h-5 w-5" />
          Sign Up Free
        </Button>
        <Button variant="ghost" className="w-full text-white/70" onClick={() => navigate("/")}>
          Back home
        </Button>
      </div>
    </div>
  );
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[hsl(250,50%,12%)] via-[hsl(265,55%,15%)] to-[hsl(230,50%,8%)] text-white flex flex-col">
      <Seo
        title="Try a Free StoryMaster Adventure — No Signup"
        description="Take a free, fully personalized AI adventure for a spin. No account, no signup — your choices shape what happens next."
        canonical="/try"
      />

      {(stage === "playing" || stage === "loading" || stage === "finished") && (
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
      )}

      {stage === "setup" && renderSetup()}
      {stage === "loading" && renderLoading()}
      {stage === "playing" && renderPlaying()}
      {stage === "finished" && renderFinished()}
      {stage === "error" && renderError()}
    </div>
  );
};

export default TryStory;
