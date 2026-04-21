import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { safeContentSchema } from "@/lib/validationSchemas";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDevice } from "@/contexts/DeviceContext";
import { Progress } from "@/components/ui/progress";
import { addHapticFeedback } from "@/lib/mobileFeatures";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  Sparkles,
  PawPrint,
  Search,
  Target,
  Users,
  Paintbrush,
  Zap,
  Smile,
  Eye,
  Compass,
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";
import { saveProfileToLocal } from "@/lib/story";
import { trackViolation } from "@/lib/contentViolations";
import { cn } from "@/lib/utils";

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
  const lexileByAge: Record<number, number> = {
    5: 200, 6: 300, 7: 400, 8: 500, 9: 600, 10: 750, 11: 900, 12: 1000,
  };
  return lexileByAge[age] ?? 500;
};

const TOTAL_STEPS = 6;

const stepVariants = {
  enter: { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
  exit: { opacity: 0, x: -60, transition: { duration: 0.2 } },
};

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { isPhone, isTablet } = useDevice();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [age, setAge] = useState(8);
  const [lexileScore, setLexileScore] = useState(500);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [mode, setMode] = useState("thrill");
  const [storyLength, setStoryLength] = useState("medium");
  const [topic, setTopic] = useState("");
  const [interests, setInterests] = useState("");
  const [interestsError, setInterestsError] = useState("");
  const [topicError, setTopicError] = useState("");

  useEffect(() => {
    setLexileScore(getDefaultLexileForAge(age));
  }, [age]);

  useEffect(() => {
    const isNewAdventure = searchParams.get("new") === "true";
    const isGuest = searchParams.get("guest") === "true";
    if (isNewAdventure || isGuest) {
      setName(""); setAge(8); setLexileScore(500); setSelectedBadges([]);
      setMode("thrill"); setStoryLength("medium"); setTopic(""); setInterests("");
      setNameError(""); setInterestsError(""); setTopicError("");
      setStep(1);
      if (isGuest) {
        toast({ title: "Try a Free Story! ✨", description: "Build your hero — no sign-up needed.", duration: 4000 });
      } else {
        toast({ title: "Starting Fresh Adventure! 🎮", description: "Create your new hero profile!", duration: 4000 });
      }
    }
  }, [searchParams, toast]);

  const toggleBadge = (id: string) => {
    addHapticFeedback('light');
    setSelectedBadges((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  const validateField = (value: string, setError: (e: string) => void) => {
    try { safeContentSchema.parse(value); setError(""); return true; }
    catch (error: any) { setError(error.errors?.[0]?.message || "Invalid content"); return false; }
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case 1: return true; // name is optional
      case 2: return true; // age always has default
      case 3: return true; // lexile always has default
      case 4: return true; // badges optional (validated on final submit)
      case 5: return true; // mode/length always have defaults
      case 6: return true; // interests/topic optional
      default: return true;
    }
  };

  const nextStep = () => {
    addHapticFeedback('light');
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const prevStep = () => {
    addHapticFeedback('light');
    if (step > 1) setStep(step - 1);
  };

  const handleStart = async () => {
    addHapticFeedback('heavy');

    if (selectedBadges.length === 0 && !interests.trim()) {
      toast({ title: "Profile Incomplete", description: "Please select at least one interest badge or tell us about things you love.", variant: "destructive" });
      setStep(4);
      return;
    }

    const nameValid = name ? validateField(name, setNameError) : true;
    const interestsValid = interests ? validateField(interests, setInterestsError) : true;
    const topicValid = topic ? validateField(topic, setTopicError) : true;

    if (!nameValid || !interestsValid || !topicValid) {
      await trackViolation();
      toast({ title: "Content Rejected", description: "Please avoid inappropriate content.", variant: "destructive" });
      return;
    }

    const profile = {
      name: name || undefined, age, lexileScore, selectedBadges, mode,
      storyLength: storyLength as "short" | "medium" | "epic", topic, interests,
    };
    saveProfileToLocal(profile);

    // Guest preview flow → goes to a short 3-scene story before sign up
    const isGuest = searchParams.get("guest") === "true";
    if (isGuest) {
      navigate("/guest-story");
      return;
    }

    const forceNew = searchParams.get("new") === "true";
    if (!forceNew) {
      try {
        const { loadCurrentStoryFromDatabase } = await import("@/lib/databaseStory");
        const existingStory = await loadCurrentStoryFromDatabase();
        if (existingStory && existingStory.scenes.length > 0) {
          navigate("/mission");
          return;
        }
      } catch (error) {
        console.error("Error checking for existing story:", error);
      }
    }

    navigate(forceNew ? "/mission?new=true" : "/mission");
  };

  const progressPercent = (step / TOTAL_STEPS) * 100;

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
              onChange={(e) => { setName(e.target.value); setNameError(""); }}
              onBlur={(e) => { if (e.target.value) validateField(e.target.value, setNameError); }}
              maxLength={50}
              className={cn("text-lg py-6 text-center", nameError && "border-destructive")}
              autoFocus
            />
            {nameError && <p className="text-sm text-destructive text-center">{nameError}</p>}
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
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>5</span><span>12</span>
              </div>
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
                  type="number" min={200} max={1200} value={lexileScore}
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
                        onClick={() => toggleBadge(b.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border-2 px-3 py-4 transition-all hover:bg-accent min-h-[56px]",
                          selectedBadges.includes(b.id) 
                            ? "bg-primary/10 border-primary shadow-sm" 
                            : "border-border"
                        )}
                        type="button"
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
                onValueChange={(v) => { if (v) { addHapticFeedback('light'); setMode(v); } }}
              >
                {modes.map((m) => (
                  <ToggleGroupItem
                    key={m.id} value={m.id} aria-label={m.label}
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
              <RadioGroup className="grid gap-3" value={storyLength} onValueChange={(v) => { addHapticFeedback('light'); setStoryLength(v); }}>
                <div className="flex items-center gap-3 rounded-xl border-2 p-3">
                  <RadioGroupItem id="short" value="short" />
                  <Label htmlFor="short">⚡ Short (3-5 scenes)</Label>
                </div>
                <div className="flex items-center gap-3 rounded-xl border-2 p-3">
                  <RadioGroupItem id="medium" value="medium" />
                  <Label htmlFor="medium">⚔️ Medium (5-8 scenes)</Label>
                </div>
                <div className="flex items-center gap-3 rounded-xl border-2 p-3">
                  <RadioGroupItem id="epic" value="epic" />
                  <Label htmlFor="epic">🏆 Epic (8-12 scenes)</Label>
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
                onChange={(e) => { setInterests(e.target.value); setInterestsError(""); }}
                onBlur={(e) => { if (e.target.value) validateField(e.target.value, setInterestsError); }}
                className={cn("min-h-[80px]", interestsError && "border-destructive")}
              />
              {interestsError && <p className="text-sm text-destructive">{interestsError}</p>}
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Learning Topic</Label>
              <Input
                placeholder="e.g., Ancient Rome, Ecosystems"
                value={topic}
                onChange={(e) => { setTopic(e.target.value); setTopicError(""); }}
                onBlur={(e) => { if (e.target.value) validateField(e.target.value, setTopicError); }}
                className={cn(topicError && "border-destructive")}
              />
              {topicError && <p className="text-sm text-destructive">{topicError}</p>}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Seo
        title="StoryMaster Kids – Create Your Hero"
        description="Set your age, reading skill, badges, and quest mode to begin your StoryMaster Kids adventure."
        canonical="/profile"
        jsonLd={{ "@context": "https://schema.org", "@type": "WebPage", name: "Create Your Hero Profile" }}
      />

      <main className="min-h-screen w-full bg-background flex flex-col">
        {/* Header with progress */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
          <div className="container max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="sm" onClick={() => step > 1 ? prevStep() : navigate(-1)} className="p-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="text-sm text-muted-foreground font-medium">Step {step} of {TOTAL_STEPS}</span>
              {step < TOTAL_STEPS ? (
                <Button variant="ghost" size="sm" onClick={() => nextStep()} className="text-primary text-sm">
                  Skip
                </Button>
              ) : (
                <div className="w-12" />
              )}
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 flex flex-col container max-w-lg mx-auto px-4 py-8">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom action */}
          <div className="pt-6 pb-4">
            {step < TOTAL_STEPS ? (
              <Button
                size="lg"
                variant="hero"
                onClick={nextStep}
                disabled={!canAdvance()}
                className="w-full text-lg py-6"
              >
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <Button
                size="lg"
                variant="hero"
                onClick={handleStart}
                className="w-full text-lg py-6"
              >
                <Check className="mr-2 h-5 w-5" />
                Start My Quest
              </Button>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default ProfileSetup;
