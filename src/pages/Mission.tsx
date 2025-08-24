import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import spaceStation from "@/assets/space-station.jpg";
import mysticMageBg from "@/assets/mystic-mage-bg.jpg";
import beastMasterBg from "@/assets/beast-master-bg.jpg";
import detectiveBg from "@/assets/detective-bg.jpg";
import actionHeroBg from "@/assets/action-hero-bg.jpg";
import socialChampionBg from "@/assets/social-champion-bg.jpg";
import creativeGeniusBg from "@/assets/creative-genius-bg.jpg";
import { useNavigate } from "react-router-dom";
import { Zap, Timer, Star, Heart, Shield, Eye, Wand2, PawPrint, Crosshair, Users, Palette } from "lucide-react";
import { useEffect, useState } from "react";
import { generateNextScene, loadProfile, checkStoryLimit, markStoryCompleted, type Scene, saveCurrentStory, loadCurrentStory, clearCurrentStory, saveCompletedStory, type SavedStory } from "@/lib/story";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Save, Play } from "lucide-react";

const Mission = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scene, setScene] = useState<Scene | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [storyLimitReached, setStoryLimitReached] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [sceneCount, setSceneCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [savedStory, setSavedStory] = useState<SavedStory | null>(null);
  const [allScenes, setAllScenes] = useState<Scene[]>([]);
  const [choicesMade, setChoicesMade] = useState<string[]>([]);

  const profile = loadProfile();

  // Background and theme mapping
  const getThemeByBadge = (badges: string[]) => {
    const themeMap: Record<string, { bg: string; alt: string; color: string; icon: any }> = {
      mystic: { bg: mysticMageBg, alt: "Mystical fantasy landscape with magical crystals and glowing runes", color: "text-purple-300", icon: Wand2 },
      beast: { bg: beastMasterBg, alt: "Jungle adventure scene with mystical creatures and ancient totems", color: "text-green-300", icon: PawPrint },
      detective: { bg: detectiveBg, alt: "Noir detective office with rain-streaked windows at night", color: "text-blue-300", icon: Eye },
      action: { bg: actionHeroBg, alt: "Dynamic urban action scene with skyscrapers and dramatic lighting", color: "text-red-300", icon: Crosshair },
      social: { bg: socialChampionBg, alt: "Vibrant community gathering in a festive town square", color: "text-amber-300", icon: Users },
      creative: { bg: creativeGeniusBg, alt: "Inspiring artist studio with colorful artwork and creative tools", color: "text-pink-300", icon: Palette },
      space: { bg: spaceStation, alt: "Futuristic space station control room with asteroid field outside", color: "text-cyan-300", icon: Zap },
    };

    // Find the first matching badge, default to space
    const primaryBadge = badges.find(badge => themeMap[badge]) || 'space';
    return themeMap[primaryBadge] || themeMap.space;
  };

  const theme = profile ? getThemeByBadge(profile.selectedBadges) : getThemeByBadge(['space']);

  useEffect(() => {
    if (!profile) {
      navigate("/profile");
      return;
    }
    
    // Check for saved story first
    const saved = loadCurrentStory();
    if (saved && saved.profile.age === profile.age && 
        JSON.stringify(saved.profile.selectedBadges.sort()) === JSON.stringify(profile.selectedBadges.sort())) {
      setSavedStory(saved);
      setScene(saved.scenes[saved.currentSceneIndex]);
      setAllScenes(saved.scenes);
      setSceneCount(saved.currentSceneIndex + 1);
      return;
    }
    
    const init = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check story completion limit first
        const limitCheck = await checkStoryLimit();
        setCompletedCount(limitCheck.completedCount);
        
        if (!limitCheck.canPlay) {
          setStoryLimitReached(true);
          setLoading(false);
          return;
        }

        const { parsed, text } = await generateNextScene(profile, undefined, false, 900, 1);
        if (!parsed) {
          throw new Error("Invalid AI response: " + text.slice(0, 140));
        }
        setScene(parsed);
        setAllScenes([parsed]);
        setSceneCount(1);
        
        // Save initial story
        const newStory: SavedStory = {
          id: crypto.randomUUID(),
          profile,
          scenes: [parsed],
          currentSceneIndex: 0,
          startedAt: new Date().toISOString(),
          lastPlayedAt: new Date().toISOString(),
          completed: false,
        };
        setSavedStory(newStory);
        saveCurrentStory(newStory);
        
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "Failed to start mission");
      } finally {
        setLoading(false);
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChoose = async (choiceId: string) => {
    console.log("onChoose called with:", choiceId);
    console.log("profile:", profile);
    console.log("scene:", scene);
    console.log("savedStory:", savedStory);
    
    if (!profile || !scene || !savedStory) {
      console.log("Missing required data, returning early");
      return;
    }
    try {
      console.log("Setting loading to true");
      setLoading(true);
      setError(null);
      
      const nextSceneCount = sceneCount + 1;
      const updatedChoices = [...choicesMade, choiceId];
      setChoicesMade(updatedChoices);
      
      const { parsed, text } = await generateNextScene(profile, { ...scene, selectedChoiceId: choiceId }, false, 900, nextSceneCount);
      if (!parsed) throw new Error("Invalid AI response: " + text.slice(0, 140));
      
      const updatedScenes = [...allScenes, parsed];
      setAllScenes(updatedScenes);
      setScene(parsed);
      setSceneCount(nextSceneCount);
      
      // Update saved story
      const updatedStory: SavedStory = {
        ...savedStory,
        scenes: updatedScenes,
        currentSceneIndex: nextSceneCount - 1,
        lastPlayedAt: new Date().toISOString(),
        completed: parsed.end || false,
      };
      setSavedStory(updatedStory);
      saveCurrentStory(updatedStory);
      
      // If this is the end of the story, mark it as completed
      if (parsed.end && profile) {
        const { newAchievements, characterProgress } = await markStoryCompleted(profile, updatedChoices.length);
        setCompletedCount(1);
        
        // Show achievement notifications
        if (newAchievements.length > 0) {
          newAchievements.forEach(achievement => {
            toast({
              title: "🎉 Achievement Unlocked!",
              description: `${achievement.icon} ${achievement.name}`,
              duration: 5000,
            });
          });
        }
        
        // Show character progression
        if (characterProgress?.leveledUp) {
          toast({
            title: "🌟 Level Up!",
            description: `You are now level ${characterProgress.character.level}!`,
            duration: 5000,
          });
        }
        
        // Save to completed stories gallery
        const completedStory = {
          id: updatedStory.id,
          title: allScenes[0]?.sceneTitle || "Untitled Adventure",
          profile,
          completedAt: new Date().toISOString(),
          sceneCount: nextSceneCount,
          choicesMade: updatedChoices,
        };
        saveCompletedStory(completedStory);
        
        // Clear current story
        clearCurrentStory();
      }
      
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Failed to continue");
    } finally {
      setLoading(false);
    }
  };

  const retryInit = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      setError(null);
      
      const { parsed, text } = await generateNextScene(profile, undefined, false, 900, 1);
      if (!parsed) throw new Error("Invalid AI response: " + text.slice(0, 140));
      
      setScene(parsed);
      setAllScenes([parsed]);
      setSceneCount(1);
      
      const newStory: SavedStory = {
        id: crypto.randomUUID(),
        profile,
        scenes: [parsed],
        currentSceneIndex: 0,
        startedAt: new Date().toISOString(),
        lastPlayedAt: new Date().toISOString(),
        completed: false,
      };
      setSavedStory(newStory);
      saveCurrentStory(newStory);
      
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Failed to retry");
    } finally {
      setLoading(false);
    }
  };

  const retryChoice = async (choiceId: string) => {
    await onChoose(choiceId);
  };

  const resumeSavedStory = () => {
    if (savedStory) {
      setScene(savedStory.scenes[savedStory.currentSceneIndex]);
      setAllScenes(savedStory.scenes);
      setSceneCount(savedStory.currentSceneIndex + 1);
      // Don't clear savedStory - onChoose needs it
    }
  };

  const startNewStory = () => {
    clearCurrentStory();
    setSavedStory(null);
    retryInit();
  };

  const energy = scene?.hud?.energy ?? 75;
  const time = scene?.hud?.time ?? "--";
  const choicePoints = scene?.hud?.choicePoints ?? 0;
  const uiElements = scene?.hud?.ui || [];

  const ThemeIcon = theme.icon;

  console.log("Mission render state:", { savedStory: !!savedStory, scene: !!scene, loading, storyLimitReached, error });
  
  // Show resume story option if available
  if (savedStory && scene && !loading) {
    console.log("Rendering resume story UI");
    return (
      <>
        <Seo
          title="StoryMaster Quest – Resume Story"
          description="Continue your saved adventure where you left off."
          canonical="/mission"
        />
        
        <main className="relative min-h-screen w-full overflow-hidden">
          <img
            src={theme.bg}
            alt={theme.alt}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 to-background/70" />

          <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
            <div className="glass-panel max-w-2xl rounded-xl p-8 text-center">
              <h1 className="text-3xl font-bold mb-4">
                📖 Resume Your Story
              </h1>
              <p className="text-muted-foreground mb-2">
                You have a story in progress from {new Date(savedStory.lastPlayedAt).toLocaleDateString()}.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Scene {savedStory.currentSceneIndex + 1} of your adventure: <strong>{savedStory.scenes[0]?.sceneTitle}</strong>
              </p>
              <div className="flex justify-center gap-4">
                <Button
                  onClick={resumeSavedStory}
                  variant="hero"
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Continue Story
                </Button>
                <Button
                  onClick={startNewStory}
                  variant="outline"
                  size="lg"
                >
                  Start New Story
                </Button>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  // If story limit is reached, show limit message
  if (storyLimitReached) {
    return (
      <>
        <Seo
          title="StoryMaster Quest – Story Limit Reached"
          description="You've completed your free story! Discover what's coming next."
          canonical="/mission"
        />
        
        <main className="relative min-h-screen w-full overflow-hidden">
          <img
            src={theme.bg}
            alt={theme.alt}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 to-background/70" />

          <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
            <div className="glass-panel max-w-2xl rounded-xl p-8 text-center">
              <h1 className="text-3xl font-bold mb-4">
                🎭 Story Limit Reached
              </h1>
              <p className="text-muted-foreground mb-6">
                You've completed <strong>{completedCount}</strong> story! 
                We're preparing a subscription service that will unlock unlimited adventures.
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                Thank you for testing StoryMaster Quest. Stay tuned for more epic adventures!
              </p>
              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => navigate("/")}
                  variant="hero"
                  size="lg"
                >
                  Return Home
                </Button>
                <Button
                  onClick={() => navigate("/coming-soon")}
                  variant="outline"
                  size="lg"
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Seo
        title="StoryMaster Quest – Mission"
        description="Dynamic, AI-powered mission with choices and live HUD."
        canonical="/mission"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: scene?.sceneTitle || "StoryMaster Quest – Mission",
          gamePlatform: "Web",
        }}
      />
      <main className="relative min-h-screen w-full overflow-hidden">
        <img
          src={theme.bg}
          alt={theme.alt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 to-background/70" />

        {/* Enhanced HUD */}
        <aside className="relative z-10 px-6 pt-6">
          <div className="glass-panel rounded-xl px-4 py-3 inline-flex items-center gap-4 flex-wrap">
            <div className={`flex items-center gap-2 ${theme.color}`}>
              <ThemeIcon className="h-5 w-5" />
              <span className="text-sm font-semibold">Energy:</span>
              <span className="text-sm">{energy}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              <span className="text-sm font-semibold">Time:</span>
              <span className="text-sm">{time}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              <span className="text-sm font-semibold">Choice Points:</span>
              <span className="text-sm">{choicePoints}</span>
            </div>
            {/* Dynamic UI elements from AI */}
            {uiElements.map((element, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Heart className="h-4 w-4 opacity-70" />
                <span className="opacity-90">{element}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Mission content */}
        <section className="relative z-10 min-h-[70vh] flex items-center">
          <div className="container grid gap-6 md:grid-cols-5 py-10 md:py-16">
            <article className="md:col-span-3 glass-panel rounded-2xl p-6 md:p-8 animate-enter">
              <div className="flex items-center justify-between mb-4">
                <h1 className="font-heading text-2xl md:text-4xl font-extrabold">
                  {scene?.sceneTitle ?? "Initializing Mission..."}
                </h1>
                {sceneCount > 1 && (
                  <div className="text-sm text-muted-foreground">
                    Scene {sceneCount}
                  </div>
                )}
              </div>
              
              {error ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-destructive font-semibold mb-2">Story Error</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                  </div>
                  <Button 
                    onClick={retryInit}
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4" />
                    {loading ? "Retrying..." : "Try Again"}
                  </Button>
                </div>
              ) : (
                <p className="mt-4 text-base md:text-lg whitespace-pre-line">
                  {scene?.narrative ?? (loading ? "Generating your scene..." : "Click Start again if this persists.")}
                </p>
              )}
            </article>

            <nav className="md:col-span-2 grid gap-3 content-start">
              {error ? (
                <Button 
                  onClick={retryInit}
                  variant="destructive"
                  size="lg"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  {loading ? "Retrying..." : "Retry Story"}
                </Button>
              ) : scene?.choices?.length ? (
                scene.choices.map((c) => (
                  <Button 
                    key={c.id} 
                    variant="choice" 
                    size="xl" 
                    onClick={() => onChoose(c.id)} 
                    disabled={loading}
                    className="relative"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Generating...
                      </span>
                    ) : (
                      c.label
                    )}
                  </Button>
                ))
              ) : (
                <Button variant="game" size="lg" disabled>
                  {loading ? "Generating..." : "No choices available"}
                </Button>
              )}

              {scene?.end && (
                <div className="mt-4 space-y-3">
                  <div className="glass-panel rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      🎉 Story completed! You've used your free story.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Subscription service coming soon for unlimited adventures!
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="game" size="lg" onClick={() => navigate("/")}>Return Home</Button>
                    <Button variant="hero" size="lg" onClick={() => navigate("/coming-soon")}>Learn More</Button>
                  </div>
                </div>
              )}
            </nav>
          </div>
        </section>
      </main>
    </>
  );
};

export default Mission;

