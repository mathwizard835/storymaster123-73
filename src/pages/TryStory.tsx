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
  Volume2,
  VolumeX,
} from "lucide-react";
import { generateNextScene, type Scene, type InventoryItem } from "@/lib/story";
import { addItemToInventory, useItem, updateProfileInventory } from "@/lib/inventory";
import { validateChoice } from "@/lib/interactionHandlers";
import { InventoryPanel } from "@/components/InventoryPanel";
import { LearningChallengeComponent, type LearningChallenge } from "@/components/LearningChallenge";
import { ComprehensionQuiz } from "@/components/ComprehensionQuiz";
import { QuizQuestion } from "@/lib/quizSystem";
import {
  LearningSession,
  generateLearningChallenges,
  calculateLearningScore,
} from "@/lib/learningSystem";

// ---------------------------------------------------------------
// Guest demo: mirrors the real mobile app gameplay (Mission.tsx)
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

// Voice IDs used by Mission's Read-to-Me — keep in sync.
const VOICE_BY_MODE: Record<string, string> = {
  thrill: "EXAVITQu4vr4xnSDxMaL",
  comedy: "XB0fDUnXU5powFXDhCwa",
  mystery: "1UllZlmEKI6fNlrEtCx7",
  explore: "EXAVITQu4vr4xnSDxMaL",
};

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
  const [streamedNarrative, setStreamedNarrative] = useState<string>("");
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  // --- Mission-parity state ---
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [storyMemory, setStoryMemory] = useState<{ flags: string[]; pastChoices: string[] }>({
    flags: [],
    pastChoices: [],
  });
  const [storyReadyToFinish, setStoryReadyToFinish] = useState(false);
  const [learningSession, setLearningSession] = useState<LearningSession | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<LearningChallenge | null>(null);
  const [showLearningProgress, setShowLearningProgress] = useState(false);

  // Quiz
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizTaken, setQuizTaken] = useState(false);

  // Read-to-Me
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [hasUsedReadToMe, setHasUsedReadToMe] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Developer bypass token — picked up from ?devDemo=TOKEN and persisted to
  // sessionStorage so it survives setup steps within the demo flow. The token
  // is validated server-side against the DEMO_BYPASS_TOKEN secret; an invalid
  // value behaves the same as no token (normal fingerprint check applies).
  const [devBypass, setDevBypass] = useState<string | null>(null);

  useEffect(() => {
    let token: string | null = null;
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("devDemo");
      if (fromUrl) {
        token = fromUrl;
        sessionStorage.setItem("demo_dev_bypass", fromUrl);
      } else {
        token = sessionStorage.getItem("demo_dev_bypass");
      }
    } catch (_) { /* ignore */ }
    if (token) {
      setDevBypass(token);
      // Bypass active → ignore the prior "used" flag so we can replay locally.
      try { localStorage.removeItem("demo_story_used"); } catch (_) { /* ignore */ }
      return;
    }
    try {
      if (localStorage.getItem("demo_story_used") === "1") setStage("demoUsed");
    } catch (_) { /* ignore */ }
  }, []);

  // Reset Read-to-Me usage flag on scene change
  useEffect(() => {
    setHasUsedReadToMe(false);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [sceneCount]);

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
    inventory,
  };

  const maxScenesByLength: Record<string, number> = { short: 5, medium: 8, epic: 12 };
  const maxScenes = maxScenesByLength[storyLength] ?? 5;

  const markDemoUsed = () => {
    try { localStorage.setItem("demo_story_used", "1"); } catch (_) { /* ignore */ }
  };

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
    setStreamedNarrative("");

    // Initialize learning session for learning mode (mirrors Mission)
    if (mode === "learning") {
      setLearningSession({
        id: `guest-${Date.now()}`,
        topic: topic || "general",
        startedAt: new Date().toISOString(),
        concepts: [],
        challenges: generateLearningChallenges(topic || "math", age),
        totalPoints: 0,
        completedChallenges: [],
      });
    }

    try {
      const { parsed, text } = await generateNextScene(
        profile,
        undefined,
        false,
        1800,
        1,
        undefined,
        true,
        [],
        (partial) => setStreamedNarrative(partial),
        { guest: true },
      );
      if (!parsed) {
        throw new Error("Invalid AI response: " + (text || "").slice(0, 140));
      }
      setScene(parsed);
      setAllScenes([]);
      setSceneCount(1);
      // Pick up any starter items the AI emitted
      if (parsed.itemsFound?.length) {
        let inv = inventory;
        for (const it of parsed.itemsFound) inv = addItemToInventory(it, inv);
        setInventory(inv);
      }
      const done = !!parsed.end;
      if (done) {
        setStoryReadyToFinish(true);
        markDemoUsed();
      }
      setStage("playing");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      console.error("Demo story start failed:", e);
      startedRef.current = false;
      const msg = String(e?.message || "");
      if (msg.includes("demo_used") || e?.code === "demo_used") {
        markDemoUsed();
        setStage("demoUsed");
        return;
      }
      setError(msg || "Something went wrong starting your adventure.");
      setStage("error");
    } finally {
      setStreamedNarrative("");
    }
  };

  const onChoose = async (choiceId: string) => {
    if (!scene || choiceLoading) return;
    const chosen = scene.choices?.find((c) => c.id === choiceId);
    if (!chosen) return;

    const validation = validateChoice(choiceId, scene, inventory);
    if (!validation.valid) {
      toast({
        title: validation.reason || "Can't pick that yet",
        description: "Try examining your inventory or the environment for clues.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    addHapticFeedback("medium");
    setChoiceLoading(true);
    setStreamedNarrative("");

    const nextSceneCount = sceneCount + 1;
    const nextAllScenes = [...allScenes, scene];

    try {
      const profileWithInventory = updateProfileInventory(profile as any, inventory);
      const sceneWithMemory = { ...scene, selectedChoiceId: choiceId, memory: storyMemory };

      const { parsed, text } = await generateNextScene(
        profileWithInventory,
        sceneWithMemory,
        false,
        1800,
        nextSceneCount,
        undefined,
        false,
        [],
        (partial) => setStreamedNarrative(partial),
        { guest: true },
      );
      if (!parsed) {
        throw new Error("Invalid AI response: " + (text || "").slice(0, 140));
      }

      // Inventory: consume required items, add found items
      let effectiveInventory = inventory;
      if (chosen.consumesItem && chosen.requiresItem) {
        const { item, newInventory } = useItem(chosen.requiresItem, effectiveInventory);
        if (item) effectiveInventory = newInventory;
      }
      if (parsed.itemsFound?.length) {
        let inv = effectiveInventory;
        for (const it of parsed.itemsFound) inv = addItemToInventory(it, inv);
        effectiveInventory = inv;
        toast({
          title: "Items discovered!",
          description: `Found ${parsed.itemsFound.length} new item(s)`,
          duration: 3500,
        });
      }
      if (effectiveInventory !== inventory) setInventory(effectiveInventory);

      // Story memory
      if ((parsed as any).memory) {
        const mem = (parsed as any).memory;
        setStoryMemory((prev) => ({
          flags: [...new Set([...prev.flags, ...(mem.flags || [])])].slice(-7),
          pastChoices: [...prev.pastChoices, ...(mem.pastChoices || [])].slice(-10),
        }));
      }

      setScene(parsed);
      setAllScenes(nextAllScenes);
      setSceneCount(nextSceneCount);

      const isLast = !!parsed.end || nextSceneCount >= maxScenes;
      if (isLast) {
        markDemoUsed();
        setStoryReadyToFinish(true);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      console.error("Demo next scene failed:", e);
      const msg = String(e?.message || "");
      if (msg.includes("demo_used") || e?.code === "demo_used") {
        markDemoUsed();
        setStage("demoUsed");
        return;
      }
      toast({
        title: "Try that choice again",
        description: "The storyteller paused for a moment. Tap your choice once more.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setChoiceLoading(false);
      setStreamedNarrative("");
    }
  };

  const handleChallengeComplete = (correct: boolean) => {
    setCurrentChallenge(null);
    toast({
      title: correct ? "Great work! 🎓" : "Not quite — keep going!",
      description: correct ? "You earned learning credit." : "You can try again next scene.",
      duration: 3500,
    });
  };

  const handleReadToMe = async () => {
    if (!scene?.narrative) return;
    if (hasUsedReadToMe) {
      toast({ title: "Already used", description: "Read-to-Me runs once per scene.", duration: 3000 });
      return;
    }
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    setAudioLoading(true);
    try {
      const voiceId = VOICE_BY_MODE[profile.mode] || VOICE_BY_MODE.thrill;
      const { data, error } = await supabase.functions.invoke("text-to-speech", {
        body: { text: scene.narrative, voiceId, guest: true },
      });
      if (error) throw error;
      if (!data?.audioContent) throw new Error("No audio returned");

      const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      await audio.play();
      setIsPlaying(true);
      setHasUsedReadToMe(true);
    } catch (err) {
      console.error("Read-to-Me error:", err);
      toast({
        title: "Audio unavailable",
        description: "Could not generate narration just now.",
        variant: "destructive",
        duration: 3500,
      });
    } finally {
      setAudioLoading(false);
    }
  };

  const startQuiz = async () => {
    setQuizLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-story", {
        body: {
          guest: true,
          profile,
          previousScene: null,
          sceneCount: 1,
          action: "generate-quiz",
          scenes: [...allScenes, ...(scene ? [scene] : [])],
        },
      });
      if (error) throw error;
      if (data?.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuizQuestions(data.questions);
        setShowQuiz(true);
      } else {
        throw new Error("No questions received");
      }
    } catch (e) {
      console.error("Demo quiz generation failed:", e);
      toast({
        title: "Quiz unavailable",
        description: "You can still finish the adventure — sign up to unlock all quizzes.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setQuizLoading(false);
    }
  };

  // --- Setup navigation ---
  const nextStep = () => { addHapticFeedback("light"); if (step < TOTAL_STEPS) setStep(step + 1); };
  const prevStep = () => { addHapticFeedback("light"); if (step > 1) setStep(step - 1); };

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

  // ----------------- STORY (mirrors Mission.tsx) -----------------

  const backgroundImage = getBackgroundForBadge(profile.selectedBadges);

  const renderLoading = () => (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(250,50%,12%)] via-[hsl(230,50%,10%)] to-[hsl(260,50%,8%)] flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-2xl w-full">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Wand2 className="h-8 w-8 text-white/60 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Preparing Your Adventure</h2>
          <p className="text-white/50">StoryMaster Kids is weaving your tale...</p>
          {profile.mode === "learning" && (
            <p className="text-white/40">🎓 Setting up interactive learning experience...</p>
          )}
        </div>
        {streamedNarrative && (
          <div className="prose prose-invert max-w-none tablet:max-w-prose tablet:mx-auto text-left">
            {streamedNarrative.split("\n\n").map((paragraph, index) => (
              <p key={index} className="text-white mb-4 leading-relaxed text-lg">
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderPlaying = () => {
    if (!scene) return null;
    const narrativeText = (choiceLoading && streamedNarrative) ? streamedNarrative : scene.narrative;
    const isStreaming = choiceLoading && !!streamedNarrative;

    return (
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 min-h-screen flex flex-col">
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
                {profile.mode === "learning" && learningSession && (
                  <button
                    onClick={() => setShowLearningProgress(!showLearningProgress)}
                    className="hidden md:flex items-center gap-2 bg-blue-600/80 hover:bg-blue-700/80 text-white px-3 py-2 rounded-lg transition-colors"
                  >
                    <Trophy className="h-4 w-4" />
                    Score: {calculateLearningScore(learningSession)}%
                  </button>
                )}
                <div className="text-white font-medium bg-white/10 px-2 py-1 rounded text-xs md:text-sm">
                  Scene {sceneCount}
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-2 md:p-4 overflow-y-auto">
            <div className="max-w-6xl mx-auto gap-4 md:gap-6 flex flex-col tablet:grid tablet:grid-cols-[2fr_1fr] lg:grid-cols-3">
              {/* Story Content */}
              <div className="lg:col-span-2 space-y-6">
                {currentChallenge && (
                  <div className="mb-6">
                    <LearningChallengeComponent
                      challenge={currentChallenge}
                      onComplete={handleChallengeComplete}
                      onSkip={() => setCurrentChallenge(null)}
                    />
                  </div>
                )}

                {/* HUD */}
                <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <TooltipProvider>
                    <div className="grid grid-cols-2 tablet:grid-cols-4 md:grid-cols-4 gap-4 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center space-x-2 cursor-help">
                            <Zap className="h-5 w-5 text-yellow-400" />
                            <span className="text-white font-semibold">{scene.hud?.energy ?? 0}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={12} className="z-[9999] bg-popover/95 backdrop-blur-sm">
                          <p className="max-w-xs">⚡ Experience Points: Earned through story progression and smart choices.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center space-x-2 cursor-help">
                            <Timer className="h-5 w-5 text-blue-400" />
                            <span className="text-white font-semibold">{scene.hud?.time ?? "—"}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={12} className="z-[9999] bg-popover/95 backdrop-blur-sm">
                          <p className="max-w-xs">⏱️ Time/Energy: Your character's current energy level and story timing.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center space-x-2 cursor-help">
                            <Star className="h-5 w-5 text-purple-400" />
                            <span className="text-white font-semibold">{scene.hud?.choicePoints ?? 0}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={12} className="z-[9999] bg-popover/95 backdrop-blur-sm">
                          <p className="max-w-xs">⭐ Choice Points: Total meaningful decisions made in your adventure.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center space-x-2 cursor-default">
                            <Heart className="h-5 w-5 text-red-400 opacity-70" />
                            <span className="text-white font-semibold text-sm opacity-70">
                              {scene.hud?.ui?.join(" • ") || "Ready"}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={12} className="z-[9999] bg-popover/95 backdrop-blur-sm">
                          <p className="max-w-xs">❤️ Status Display: Shows your current story status.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </div>

                {/* Narrative + Read-to-Me */}
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
                  {(profile.mode === "comedy" || profile.mode === "mystery" || profile.mode === "explore" || profile.mode === "thrill") && (
                    <div className="flex justify-end mb-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                onClick={handleReadToMe}
                                disabled={audioLoading || hasUsedReadToMe || isStreaming}
                                variant="secondary"
                                size="sm"
                                className="gap-2"
                              >
                                {audioLoading ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                    Loading...
                                  </>
                                ) : isPlaying ? (
                                  <>
                                    <VolumeX className="h-4 w-4" />
                                    Stop Reading
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="h-4 w-4" />
                                    Read to Me
                                  </>
                                )}
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {hasUsedReadToMe ? (
                            <TooltipContent>
                              <p>Already used on this scene</p>
                            </TooltipContent>
                          ) : null}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                  <div className="prose prose-invert max-w-none tablet:max-w-prose tablet:mx-auto">
                    {narrativeText.split("\n\n").map((paragraph, index) => (
                      <motion.p
                        key={`${isStreaming ? "stream" : sceneCount}-${index}`}
                        className="text-white mb-4 leading-relaxed text-lg"
                        initial={isStreaming ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: isStreaming ? 0 : index * 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {paragraph}
                      </motion.p>
                    ))}
                  </div>
                  <audio ref={audioRef} className="hidden" />
                </div>

                {/* Choices */}
                {!storyReadyToFinish && scene.choices && scene.choices.length > 0 && (
                  <div className="bg-black/50 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      What do you choose?
                    </h3>
                    <div className="grid gap-3">
                      {scene.choices.map((choice, index) => {
                        const validation = validateChoice(choice.id, scene, inventory);
                        const isDisabled = !validation.valid || choiceLoading;
                        return (
                          <motion.button
                            key={choice.id}
                            onClick={() => onChoose(choice.id)}
                            disabled={isDisabled}
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
                              validation.valid && !choiceLoading
                                ? "bg-white/20 hover:bg-white/30 text-white border-2 border-transparent hover:border-white/30"
                                : "bg-gray-600/50 text-gray-400 border-2 border-gray-500/50 cursor-not-allowed",
                              choiceLoading && "opacity-75",
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
                                {!validation.valid && !choiceLoading && (
                                  <p className="text-sm mt-1 text-red-300">{validation.reason}</p>
                                )}
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Finish Adventure (story complete) */}
                {storyReadyToFinish && (
                  <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-lg p-6 border border-yellow-400/30 space-y-4">
                    <div className="text-center space-y-4">
                      <h3 className="text-2xl font-bold text-yellow-200 flex items-center justify-center gap-2">
                        <Crown className="h-8 w-8 text-yellow-400" />
                        Adventure Complete!
                      </h3>
                      <p className="text-white/90">
                        🎉 Congratulations! You've reached the end of your epic journey.
                        {!quizTaken && " Take the comprehension challenge for bonus points, or "}
                        Ready to see what's next?
                      </p>

                      {!quizTaken && (
                        <Button
                          size="xl"
                          variant="hero"
                          onClick={startQuiz}
                          disabled={quizLoading}
                          className="w-full max-w-xs mx-auto text-lg font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                          {quizLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                              Generating Quiz...
                            </>
                          ) : (
                            <>
                              <Trophy className="h-5 w-5 mr-2" />
                              Do Challenge for Bonus Points
                            </>
                          )}
                        </Button>
                      )}

                      <Button
                        size="xl"
                        variant="hero"
                        onClick={() => setStage("finished")}
                        className="w-full max-w-xs mx-auto text-lg font-bold"
                      >
                        <Crown className="h-5 w-5 mr-2" />
                        Finish Adventure
                      </Button>
                    </div>
                  </div>
                )}

                {/* Demo-specific word counter (preserved) */}
                <div className="text-center text-xs text-white/60 py-2">
                  {wordsRead} words read • Free demo
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <InventoryPanel
                  inventory={inventory}
                  onUseItem={(item) => {
                    const { item: used, newInventory } = useItem(item.id, inventory);
                    if (used) {
                      setInventory(newInventory);
                      toast({
                        title: `Used ${used.name}`,
                        description: "Item consumed from inventory.",
                        duration: 3000,
                      });
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Comprehension quiz dialog */}
        {scene && (
          <ComprehensionQuiz
            open={showQuiz}
            onClose={() => setShowQuiz(false)}
            questions={quizQuestions}
            storyId={`guest-demo-${Date.now()}`}
            storyTitle={allScenes[0]?.sceneTitle || scene.sceneTitle || "Demo Adventure"}
            onComplete={(xp) => {
              setQuizTaken(true);
              setShowQuiz(false);
              toast({
                title: "Quiz complete!",
                description: `+${xp} bonus XP earned in the demo.`,
                duration: 4000,
              });
            }}
          />
        )}
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
                and include unlimited read-to-me narration, learning challenges, and a comprehension quiz.
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
