import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Seo } from "@/components/Seo";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { addHapticFeedback } from "@/lib/mobileFeatures";
import { cn } from "@/lib/utils";
import mysticMageBg from "@/assets/mystic-mage-bg.jpg";
import beastMasterBg from "@/assets/beast-master-bg.jpg";
import detectiveBg from "@/assets/detective-bg.jpg";
import actionHeroBg from "@/assets/action-hero-bg.jpg";
import socialChampionBg from "@/assets/social-champion-bg.jpg";
import creativeGeniusBg from "@/assets/creative-genius-bg.jpg";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
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
  GraduationCap,
  Check,
  Wand2,
  Crosshair,
  Palette,
  Star,
  Timer,
  Heart,
  BookOpen,
  Crown,
  Home,
} from "lucide-react";

// ---------------------------------------------------------------
// Guest demo: mirrors the real app flow (ProfileSetup → Mission)
// using guest:true mode on generate-story (no auth, no DB writes).
// After the story ends, the user is invited to sign up.
// ---------------------------------------------------------------

const badges = [
  { id: "beast", label: "Beast Master", icon: PawPrint, description: "Love animals and nature adventures" },
  { id: "space", label: "Space Explorer", icon: Rocket, description: "Explore galaxies and sci-fi worlds" },
  { id: "mystic", label: "Mystic Mage", icon: Sparkles, description: "Magic, fantasy, and wizardry" },
  { id: "detective", label: "Detective", icon: Search, description: "Solve mysteries and uncover clues" },
  { id: "action", label: "Action Hero", icon: Target, description: "Fast-paced adventures and challenges" },
  { id: "social", label: "Social Champion", icon: Users, description: "Team up with friends and communities" },
  { id: "creative", label: "Creative Genius", icon: Paintbrush, description: "Art, music, and creative expression" },
];

const modes = [
  { id: "thrill", label: "Thrill Mode", icon: Zap },
  { id: "comedy", label: "Comedy Mode", icon: Smile },
  { id: "mystery", label: "Mystery Mode", icon: Eye },
  { id: "explore", label: "Explore Mode", icon: Compass },
  { id: "learning", label: "Learning Quest", icon: GraduationCap },
];

const getDefaultLexileForAge = (age: number): number => {
  const map: Record<number, number> = { 5: 200, 6: 300, 7: 400, 8: 500, 9: 600, 10: 750, 11: 900, 12: 1000 };
  return map[age] ?? 500;
};

const getBackgroundForBadge = (selected: string[] = []): string => {
  if (selected.includes("mystic")) return mysticMageBg;
  if (selected.includes("beast")) return beastMasterBg;
  if (selected.includes("detective")) return detectiveBg;
  if (selected.includes("action")) return actionHeroBg;
  if (selected.includes("social")) return socialChampionBg;
  if (selected.includes("creative")) return creativeGeniusBg;
  return mysticMageBg;
};

const getIconForBadge = (badge: string, size = "h-6 w-6") => {
  switch (badge) {
    case "mystic": return <Wand2 className={size} />;
    case "beast": return <PawPrint className={size} />;
    case "detective": return <Eye className={size} />;
    case "action": return <Crosshair className={size} />;
    case "social": return <Users className={size} />;
    case "creative": return <Palette className={size} />;
    case "space": return <Rocket className={size} />;
    default: return <Star className={size} />;
  }
};

type Choice = { id: string; text: string; type?: string; requiresItem?: string };
type Scene = {
  sceneTitle?: string;
  narrative?: string;
  choices?: Choice[];
  hud?: { energy?: number; time?: string; choicePoints?: number; ui?: string[] };
  end?: boolean;
};

type Stage = "setup" | "loading" | "playing" | "finished" | "error" | "demoUsed";

const TOTAL_STEPS = 6;

const stepVariants = {
  enter: { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 300, damping: 30 } },
  exit: { opacity: 0, x: -60, transition: { duration: 0.2 } },
};

const TryStory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // --- Setup state (matches ProfileSetup) ---
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState(8);
  const [lexileScore, setLexileScore] = useState(500);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [mode, setMode] = useState("thrill");
  const [storyLength, setStoryLength] = useState("short");
  const [interests, setInterests] = useState("");
  const [topic, setTopic] = useState("");

  useEffect(() => {
    setLexileScore(getDefaultLexileForAge(age));
  }, [age]);

  // --- Story state (mirrors Mission) ---
  const [stage, setStage] = useState<Stage>("setup");
  const [scene, setScene] = useState<Scene | null>(null);
  const [allScenes, setAllScenes] = useState<Scene[]>([]);
  const [sceneCount, setSceneCount] = useState(1);
  const [choiceLoading, setChoiceLoading] = useState(false);
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("demo_story_used") === "1") setStage("demoUsed");
    } catch (_) { /* ignore */ }
  }, []);

  const wordsRead =
    allScenes.reduce((sum, s) => sum + (s.narrative?.split(/\s+/).length || 0), 0) +
    (scene?.narrative?.split(/\s+/).length || 0);

  const profile = {
    name: name || "the hero",
    age,
    lexileScore,
    selectedBadges: selectedBadges.length ? selectedBadges : ["action"],
    mode,
    storyLength: storyLength as "short" | "medium" | "epic",
    interests,
    topic,
  };

  const maxScenesByLength: Record<string, number> = { short: 5, medium: 8, epic: 12 };
  const maxScenes = maxScenesByLength[storyLength] ?? 5;

  const markDemoUsed = () => {
    try { localStorage.setItem("demo_story_used", "1"); } catch (_) { /* ignore */ }
  };

  const callGenerate = async (sceneContext: Scene | null, count: number): Promise<Scene> => {
    const { data, error: invokeError } = await supabase.functions.invoke("generate-story", {
      body: { guest: true, profile, scene: sceneContext, scene_count: count },
    });
    if (invokeError) {
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

  // --- Setup navigation ---
  const nextStep = () => { addHapticFeedback("light"); if (step < TOTAL_STEPS) setStep(step + 1); };
  const prevStep = () => { addHapticFeedback("light"); if (step > 1) setStep(step - 1); };

  const handleStart = async () => {
    addHapticFeedback("heavy");
    if (selectedBadges.length === 0 && !interests.trim()) {
      toast({
        title: "Profile Incomplete",
        description: "Please select at least one interest badge or tell us about things you love.",
        variant: "destructive",
      });
      setStep(4);
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    setStage("loading");
    setError("");
    try {
      const first = await callGenerate(null, 1);
      setScene(first);
      setSceneCount(1);
      const done = !!first.end;
      setStage(done ? "finished" : "playing");
      if (done) markDemoUsed();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      console.error("Demo story start failed:", e);
      startedRef.current = false;
      if (e?.code === "demo_used") { markDemoUsed(); setStage("demoUsed"); return; }
      setError(e?.message || "Something went wrong starting your adventure.");
      setStage("error");
    }
  };

  const onChoose = async (choiceId: string) => {
    if (!scene || choiceLoading) return;
    const chosen = scene.choices?.find((c) => c.id === choiceId);
    if (!chosen) return;
    addHapticFeedback("medium");
    const completed = { ...scene, chosen: chosen.id } as Scene;
    const nextAllScenes = [...allScenes, completed];
    setAllScenes(nextAllScenes);
    setChoiceLoading(true);
    try {
      const next = await callGenerate(
        { ...scene, lastChoiceId: chosen.id, lastChoiceText: chosen.text } as any,
        nextAllScenes.length + 1,
      );
      setScene(next);
      setSceneCount(nextAllScenes.length + 1);
      const isLast = !!next.end || nextAllScenes.length + 1 >= maxScenes;
      if (isLast) {
        markDemoUsed();
        setStage("finished");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      console.error("Demo next scene failed:", e);
      setError(e?.message || "Something went wrong continuing your adventure.");
      setStage("error");
    } finally {
      setChoiceLoading(false);
    }
  };

  // ----------------- SETUP (mirrors ProfileSetup) -----------------

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-heading text-2xl md:text-3xl font-extrabold">What's your hero name?</h2>
              <p className="text-muted-foreground">Give your character a name (optional)</p>
            </div>
            <Input
              placeholder="Enter your hero name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className="text-lg py-6 text-center"
              autoFocus
            />
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="font-heading text-2xl md:text-3xl font-extrabold">How old are you?</h2>
              <p className="text-muted-foreground">This helps us create the perfect story for you</p>
            </div>
            <div className="text-center">
              <span className="text-6xl font-heading font-extrabold text-primary">{age}</span>
              <p className="text-muted-foreground mt-1">years old</p>
            </div>
            <div className="px-4">
              <Slider defaultValue={[age]} min={5} max={12} step={1} onValueChange={(v) => setAge(v[0] ?? 8)} />
              <div className="flex justify-between text-xs text-muted-foreground mt-2"><span>5</span><span>12</span></div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-heading text-2xl md:text-3xl font-extrabold">Reading Level</h2>
              <p className="text-muted-foreground">
                Set your Lexile score (200L–1200L).{" "}
                <a href="https://hub.lexile.com/find-a-book/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Find yours
                </a>
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-baseline gap-1">
                <Input
                  type="number"
                  min={200}
                  max={1200}
                  value={lexileScore}
                  onChange={(e) => { const v = Number(e.target.value); if (v >= 200 && v <= 1200) setLexileScore(v); }}
                  className="w-24 text-center text-2xl font-bold"
                />
                <span className="text-muted-foreground font-medium text-lg">L</span>
              </div>
            </div>
            <div className="px-4">
              <Slider value={[lexileScore]} min={200} max={1200} step={50} onValueChange={(v) => setLexileScore(v[0])} />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>200L Beginning</span><span>700L Mid</span><span>1200L Advanced</span>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="font-heading text-2xl md:text-3xl font-extrabold">Pick Your Interests</h2>
              <p className="text-muted-foreground">Choose what excites you most</p>
            </div>
            <TooltipProvider>
              <div className="grid grid-cols-2 gap-3">
                {badges.map((b) => (
                  <Tooltip key={b.id} delayDuration={300}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          addHapticFeedback("light");
                          setSelectedBadges((prev) => prev.includes(b.id) ? prev.filter((x) => x !== b.id) : [...prev, b.id]);
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border-2 px-3 py-4 transition-all hover:bg-accent min-h-[56px]",
                          selectedBadges.includes(b.id) ? "bg-primary/10 border-primary shadow-sm" : "border-border",
                        )}
                      >
                        <b.icon className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm font-semibold">{b.label}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent><p>{b.description}</p></TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="font-heading text-2xl md:text-3xl font-extrabold">Story Settings</h2>
              <p className="text-muted-foreground">Choose your quest mode and story length</p>
            </div>
            <div className="space-y-3">
              <h3 className="font-heading font-bold text-lg">Quest Mode</h3>
              <ToggleGroup
                type="single"
                className="grid grid-cols-2 gap-2"
                value={mode}
                onValueChange={(v) => { if (v) { addHapticFeedback("light"); setMode(v); } }}
              >
                {modes.map((m) => (
                  <ToggleGroupItem
                    key={m.id}
                    value={m.id}
                    aria-label={m.label}
                    className="rounded-xl border-2 px-3 py-3 data-[state=on]:bg-primary/10 data-[state=on]:border-primary min-h-[48px] text-sm"
                  >
                    <m.icon className="mr-2 h-4 w-4" />
                    {m.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <div className="space-y-3">
              <h3 className="font-heading font-bold text-lg">Story Length</h3>
              <RadioGroup className="grid gap-3" value={storyLength} onValueChange={(v) => { addHapticFeedback("light"); setStoryLength(v); }}>
                <div className="flex items-center gap-3 rounded-xl border-2 p-3">
                  <RadioGroupItem id="short" value="short" />
                  <Label htmlFor="short">⚡ Short (3-5 scenes)</Label>
                </div>
                <div className="flex items-center gap-3 rounded-xl border-2 p-3 opacity-60">
                  <RadioGroupItem id="medium" value="medium" disabled />
                  <Label htmlFor="medium">⚔️ Medium (5-8 scenes) — sign up to unlock</Label>
                </div>
                <div className="flex items-center gap-3 rounded-xl border-2 p-3 opacity-60">
                  <RadioGroupItem id="epic" value="epic" disabled />
                  <Label htmlFor="epic">🏆 Epic (8-12 scenes) — sign up to unlock</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-heading text-2xl md:text-3xl font-extrabold">Anything Else?</h2>
              <p className="text-muted-foreground">Tell us what you dream about (optional)</p>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Things You Love</Label>
              <Textarea
                placeholder="e.g., become a superhero, explore underwater cities, time travel..."
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Learning Topic</Label>
              <Input
                placeholder="e.g., Ancient Rome, Ecosystems"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderSetup = () => (
    <main className="min-h-[100dvh] w-full bg-background flex flex-col overflow-x-hidden">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="container max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" size="sm" onClick={() => (step > 1 ? prevStep() : navigate("/"))} className="p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-sm text-muted-foreground font-medium">Step {step} of {TOTAL_STEPS}</span>
            {step < TOTAL_STEPS ? (
              <Button variant="ghost" size="sm" onClick={nextStep} className="text-primary text-sm">Skip</Button>
            ) : (
              <div className="w-12" />
            )}
          </div>
          <Progress value={(step / TOTAL_STEPS) * 100} className="h-1.5" />
        </div>
      </div>

      <div className="flex-1 flex flex-col container max-w-lg mx-auto px-4 py-8">
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div key={step} variants={stepVariants} initial="enter" animate="center" exit="exit">
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="pt-6 pb-4">
          {step < TOTAL_STEPS ? (
            <Button size="lg" variant="hero" onClick={nextStep} className="w-full text-lg py-6">
              Continue
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button size="lg" variant="hero" onClick={handleStart} className="w-full text-lg py-6">
              <Check className="mr-2 h-5 w-5" />
              Start My Quest
            </Button>
          )}
        </div>
      </div>
    </main>
  );

  // ----------------- STORY (mirrors Mission) -----------------

  const backgroundImage = getBackgroundForBadge(profile.selectedBadges);

  const renderLoading = () => (
    <div className="min-h-[100dvh] bg-cover bg-center bg-no-repeat relative" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-white mb-5" />
        <h2 className="font-heading text-2xl font-bold text-white mb-1">
          {sceneCount === 1 ? "Writing your story…" : "Continuing your adventure…"}
        </h2>
        <p className="text-white/70 text-sm max-w-sm">
          Our AI is dreaming up scene {sceneCount} for {name || "you"}. This usually takes 5–15 seconds.
        </p>
      </div>
    </div>
  );

  const renderPlaying = () => {
    if (!scene) return null;
    return (
      <div className="min-h-[100dvh] bg-cover bg-center bg-no-repeat relative" style={{ backgroundImage: `url(${backgroundImage})` }}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 min-h-[100dvh] flex flex-col">
          {/* Header */}
          <div className="bg-black/30 backdrop-blur-sm border-b border-white/20 p-2 md:p-4">
            <div className="max-w-6xl mx-auto flex justify-between items-center gap-2">
              <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                <button
                  onClick={() => navigate("/")}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
                  aria-label="Home"
                >
                  <Home className="h-5 w-5 text-white" />
                </button>
                <h1 className="font-bold text-white flex items-center gap-1 md:gap-2 text-sm md:text-2xl leading-tight">
                  {getIconForBadge(profile.selectedBadges[0] || "mystic", "h-4 w-4 md:h-6 md:w-6 flex-shrink-0")}
                  <span className="line-clamp-2 md:truncate">{scene.sceneTitle || "Adventure"}</span>
                </h1>
                {profile.mode === "learning" && (
                  <Badge variant="secondary" className="bg-blue-600/80 text-white flex-shrink-0 hidden md:inline-flex">
                    <BookOpen className="h-3 w-3 mr-1" />
                    Learning Quest
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                <div className="text-white font-medium bg-white/10 px-2 py-1 rounded text-xs md:text-sm">
                  Scene {sceneCount}
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-2 md:p-4 overflow-y-auto">
            <div className="max-w-6xl mx-auto gap-4 md:gap-6 flex flex-col">
              {/* HUD */}
              {scene.hud && (
                <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <TooltipProvider>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center space-x-2 cursor-help">
                            <Zap className="h-5 w-5 text-yellow-400" />
                            <span className="text-white font-semibold">{scene.hud.energy ?? 0}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={12}>
                          <p className="max-w-xs">⚡ Experience Points</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center space-x-2 cursor-help">
                            <Timer className="h-5 w-5 text-blue-400" />
                            <span className="text-white font-semibold">{scene.hud.time ?? "—"}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={12}>
                          <p className="max-w-xs">⏱️ Time / Energy</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center space-x-2 cursor-help">
                            <Star className="h-5 w-5 text-purple-400" />
                            <span className="text-white font-semibold">{scene.hud.choicePoints ?? 0}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={12}>
                          <p className="max-w-xs">⭐ Choice Points</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center space-x-2 cursor-default">
                            <Heart className="h-5 w-5 text-red-400 opacity-70" />
                            <span className="text-white font-semibold text-sm opacity-70">
                              {scene.hud.ui?.join(" • ") || "Ready"}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={12}>
                          <p className="max-w-xs">❤️ Status</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </div>
              )}

              {/* Narrative */}
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
                <div className="prose prose-invert max-w-none md:max-w-prose md:mx-auto">
                  {(scene.narrative || "").split("\n\n").map((paragraph, i) => (
                    <motion.p
                      key={`${sceneCount}-${i}`}
                      className="text-white mb-4 leading-relaxed text-lg"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {paragraph}
                    </motion.p>
                  ))}
                </div>
              </div>

              {/* Choices */}
              {scene.choices && scene.choices.length > 0 && (
                <div className="bg-black/50 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    What do you choose?
                  </h3>
                  <div className="grid gap-3">
                    {scene.choices.map((choice, index) => (
                      <motion.button
                        key={choice.id}
                        onClick={() => onChoose(choice.id)}
                        disabled={choiceLoading}
                        initial={{ opacity: 0, y: 16, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          delay: ((scene.narrative || "").split("\n\n").length * 0.2) + (index * 0.12),
                          type: "spring",
                          stiffness: 300,
                          damping: 24,
                        }}
                        className={cn(
                          "p-4 rounded-lg text-left transition-all transform hover:scale-[1.02] active:scale-[0.97] relative",
                          !choiceLoading
                            ? "bg-white/20 hover:bg-white/30 text-white border-2 border-transparent hover:border-white/30"
                            : "bg-gray-600/50 text-gray-400 border-2 border-gray-500/50 cursor-not-allowed",
                        )}
                      >
                        {choiceLoading && (
                          <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                          </div>
                        )}
                        <div className="flex items-start space-x-3">
                          <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-1">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium">{choice.text}</p>
                            {choice.requiresItem && (
                              <p className="text-sm mt-1 opacity-75">Requires: {choice.requiresItem}</p>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center text-xs text-white/60 py-2">
                {wordsRead} words read • Free demo
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFinished = () => (
    <div className="min-h-[100dvh] bg-cover bg-center bg-no-repeat relative" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <div className="bg-black/30 backdrop-blur-sm border-b border-white/20 p-2 md:p-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center gap-2">
            <h1 className="font-bold text-white flex items-center gap-2 text-sm md:text-2xl">
              {getIconForBadge(profile.selectedBadges[0] || "mystic", "h-4 w-4 md:h-6 md:w-6")}
              <span className="line-clamp-2 md:truncate">{scene?.sceneTitle || "The end"}</span>
            </h1>
            <div className="text-white font-medium bg-white/10 px-2 py-1 rounded text-xs md:text-sm">
              Scene {sceneCount}
            </div>
          </div>
        </div>

        <div className="flex-1 p-2 md:p-4 overflow-y-auto">
          <div className="max-w-3xl mx-auto flex flex-col gap-4 md:gap-6">
            {scene && (
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
                <div className="prose prose-invert max-w-none md:max-w-prose md:mx-auto">
                  {(scene.narrative || "").split("\n\n").map((p, i) => (
                    <p key={i} className="text-white mb-4 leading-relaxed text-lg">{p}</p>
                  ))}
                </div>
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-lg p-6 border border-yellow-400/30 text-center space-y-4"
            >
              <h3 className="text-2xl font-bold text-yellow-200 flex items-center justify-center gap-2">
                <Crown className="h-8 w-8 text-yellow-400" />
                Adventure Complete!
              </h3>
              <p className="text-white/90">
                🎉 Congratulations! {name ? `${name}, you` : "You"} just read{" "}
                <strong className="text-white">{wordsRead} words</strong> across {sceneCount} scenes.
              </p>
              <p className="text-white/70 text-sm">
                Real StoryMaster adventures are longer, save your progress, level up your hero, unlock new worlds,
                and include read-to-me narration, learning challenges, and a comprehension quiz.
              </p>
              <div className="pt-2">
                <Button
                  size="lg"
                  variant="hero"
                  onClick={() => navigate("/auth")}
                  className="w-full text-base font-bold"
                >
                  <UserPlus className="h-5 w-5" />
                  Create a free account to keep playing
                </Button>
              </div>
              <p className="text-xs text-white/60">
                <Trophy className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                3 free stories every 30 days • No credit card required
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-20 text-center bg-background">
      <h2 className="font-heading text-xl font-bold mb-2">Adventure interrupted</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-md">{error}</p>
      <div className="space-y-3 w-full max-w-sm">
        <Button
          variant="hero"
          className="w-full"
          onClick={() => {
            startedRef.current = false;
            if (allScenes.length === 0 && !scene) handleStart();
            else navigate("/auth");
          }}
        >
          {allScenes.length === 0 && !scene ? "Try again" : "Sign up to keep playing"}
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>Back home</Button>
      </div>
    </div>
  );

  const renderDemoUsed = () => (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-20 text-center bg-background">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(265,85%,55%)] to-[hsl(195,85%,50%)] mb-5 shadow-2xl">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h2 className="font-heading text-2xl font-bold mb-2">You've already tried your free demo</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-md">
        Create a free account to keep playing — longer adventures, saved progress, and a hero that levels up every story.
      </p>
      <div className="space-y-3 w-full max-w-sm">
        <Button size="lg" variant="hero" className="w-full text-base font-bold" onClick={() => navigate("/auth")}>
          <UserPlus className="h-5 w-5" />
          Sign Up Free
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>Back home</Button>
      </div>
    </div>
  );

  return (
    <>
      <Seo
        title="Try a Free StoryMaster Adventure — No Signup"
        description="Take a free, fully personalized AI adventure for a spin. No account, no signup — your choices shape what happens next."
        canonical="/try"
      />
      {stage === "setup" && renderSetup()}
      {stage === "loading" && renderLoading()}
      {stage === "playing" && renderPlaying()}
      {stage === "finished" && renderFinished()}
      {stage === "error" && renderError()}
      {stage === "demoUsed" && renderDemoUsed()}
    </>
  );
};

export default TryStory;
