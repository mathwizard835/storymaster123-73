import mysticMageBg from "@/assets/mystic-mage-bg.jpg";
import beastMasterBg from "@/assets/beast-master-bg.jpg";
import detectiveBg from "@/assets/detective-bg.jpg";
import actionHeroBg from "@/assets/action-hero-bg.jpg";
import socialChampionBg from "@/assets/social-champion-bg.jpg";
import creativeGeniusBg from "@/assets/creative-genius-bg.jpg";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Zap, Timer, Star, Heart, Shield, Eye, Wand2, PawPrint, Crosshair, Users, Palette, RefreshCw, Play, BookOpen, Trophy, Target, ArrowLeft, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { generateNextScene, loadProfile, checkStoryLimit, markStoryCompleted, type Scene, saveCurrentStory, loadCurrentStory, clearCurrentStory, saveCompletedStory, getCompletedStories, type SavedStory, type InventoryItem, saveProfileToLocal, clearSceneCache } from "@/lib/story";
import { saveStoryToDatabase, loadCurrentStoryFromDatabase, clearCurrentStoryInDatabase, clearAllActiveStoriesForUser, verifyStoryIsActive } from "@/lib/databaseStory";
import { loadInventory, saveInventory, addItemToInventory, useItem, clearInventory, updateProfileInventory } from "@/lib/inventory";
import { 
  LearningSession, 
  saveLearningProgress, 
  loadLearningProgress, 
  updateConceptMastery, 
  generateLearningChallenges,
  calculateLearningScore,
  getNextLearningGoal 
} from "@/lib/learningSystem";
import { InventoryPanel } from "@/components/InventoryPanel";
import { LearningProgress, type LearningConcept } from "@/components/LearningProgress";
import { LearningChallengeComponent, type LearningChallenge } from "@/components/LearningChallenge";
import { useToast } from "@/components/ui/use-toast";
import { validateChoice } from "@/lib/interactionHandlers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const Mission = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isTrialMode = searchParams.get('trial') === 'true';
  const [profile, setProfile] = useState(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [allScenes, setAllScenes] = useState<Scene[]>([]);
  const [sceneCount, setSceneCount] = useState(1);
  const [savedStory, setSavedStory] = useState<SavedStory | null>(null);
  const [initialStoryId, setInitialStoryId] = useState<string | null>(null); // Phase 5: Track initial story ID
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storyLimitReached, setStoryLimitReached] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [goBacksUsed, setGoBacksUsed] = useState(0);
  
  // Learning system state
  const [learningSession, setLearningSession] = useState<LearningSession | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<LearningChallenge | null>(null);
  const [showLearningProgress, setShowLearningProgress] = useState(false);
  const [storyReadyToFinish, setStoryReadyToFinish] = useState(false);
  const [showNewStoryDialog, setShowNewStoryDialog] = useState(false);
  
  const { toast } = useToast();

  // Initialize learning session for learning mode
  const initializeLearningSession = (profile: any) => {
    if (profile.mode !== 'learning') return;
    
    let session = loadLearningProgress();
    if (!session || session.topic !== profile.topic) {
      session = {
        id: crypto.randomUUID(),
        topic: profile.topic || 'general',
        startedAt: new Date().toISOString(),
        concepts: [],
        challenges: generateLearningChallenges(profile.topic || 'math', profile.age || 8),
        totalPoints: 0,
        completedChallenges: []
      };
      saveLearningProgress(session);
    }
    setLearningSession(session);
    setShowLearningProgress(true);
  };

  // Add new learning concept
  const addLearningConcept = (name: string, category: string) => {
    if (!learningSession) return;
    
    const existingConcept = learningSession.concepts.find(c => c.name === name);
    if (existingConcept) return;
    
    const newConcept: LearningConcept = {
      id: crypto.randomUUID(),
      name,
      category: category as any,
      mastery: 0,
      attempts: 0,
      lastPracticed: new Date().toISOString()
    };
    
    const updatedSession = {
      ...learningSession,
      concepts: [...learningSession.concepts, newConcept]
    };
    
    setLearningSession(updatedSession);
    saveLearningProgress(updatedSession);
  };

  // Handle learning challenge completion
  const handleChallengeComplete = (correct: boolean, answer: string) => {
    if (!currentChallenge || !learningSession) return;
    
    let updatedSession = updateConceptMastery(currentChallenge.concept, correct, learningSession);
    
    if (correct) {
      updatedSession.totalPoints += currentChallenge.points;
      updatedSession.completedChallenges.push(currentChallenge.id);
    }
    
    setLearningSession(updatedSession);
    saveLearningProgress(updatedSession);
    setCurrentChallenge(null);
    
    const score = calculateLearningScore(updatedSession);
    const nextGoal = getNextLearningGoal(updatedSession);
    
    toast({
      title: correct ? "Great job! 🎉" : "Keep learning! 📚",
      description: `Learning Score: ${score}% • ${nextGoal}`,
      duration: 5000,
    });
  };

  const getBackgroundForBadge = (badges: string[] = []) => {
    if (badges.includes("mystic")) return mysticMageBg;
    if (badges.includes("beast")) return beastMasterBg;
    if (badges.includes("detective")) return detectiveBg;
    if (badges.includes("action")) return actionHeroBg;
    if (badges.includes("social")) return socialChampionBg;
    if (badges.includes("creative")) return creativeGeniusBg;
    return mysticMageBg;
  };

  const getIconForBadge = (badge: string, size: string = "h-6 w-6") => {
    switch (badge) {
      case "mystic": return <Wand2 className={size} />;
      case "beast": return <PawPrint className={size} />;
      case "detective": return <Eye className={size} />;
      case "action": return <Crosshair className={size} />;
      case "social": return <Users className={size} />;
      case "creative": return <Palette className={size} />;
      default: return <Star className={size} />;
    }
  };

  // Phase 5: Monitor for unexpected story ID changes
  useEffect(() => {
    if (savedStory && initialStoryId && savedStory.id !== initialStoryId) {
      console.error(`🚨 ALERT: Story ID changed unexpectedly! Initial: ${initialStoryId}, Current: ${savedStory.id}`);
      toast({
        title: "Story Corruption Detected",
        description: "Redirecting to start a fresh adventure...",
        variant: "destructive",
        duration: 3000,
      });
      setTimeout(() => navigate('/profile?new=true'), 2000);
    }
  }, [savedStory?.id, initialStoryId, navigate, toast]);

  useEffect(() => {
    const init = async () => {
      try {
        // Check if mobile platform
        const isMobile = typeof window !== 'undefined' && 
          ((window as any).Capacitor?.getPlatform?.() === 'ios' || 
           (window as any).Capacitor?.getPlatform?.() === 'android' ||
           /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
        
        // Check if trial/mobile story already used for non-authenticated users
        if (!user && (isTrialMode || isMobile)) {
          const trialUsed = localStorage.getItem('trial_story_used');
          if (trialUsed) {
            navigate("/");
            return;
          }
        }
        
        let savedProfile;
        
        // Always load the profile from localStorage, even in trial mode
        savedProfile = await loadProfile();
        if (!savedProfile) {
          navigate("/profile");
          return;
        }
        setProfile(savedProfile);

        // Check if user wants to start fresh (from URL param)
        const forceNew = searchParams.get('new') === 'true';
        
        // Skip loading existing story for trial mode or if forcing new story
        if (!isTrialMode && !forceNew) {
          const existingStory = await loadCurrentStoryFromDatabase();
          if (existingStory && existingStory.scenes.length > 0) {
            // Phase 4 & 5: Verify story is still active and track ID
            const isActive = await verifyStoryIsActive(existingStory.id);
            if (isActive) {
              console.log(`📖 Resuming story: ${existingStory.id}`);
              setSavedStory(existingStory);
              setInitialStoryId(existingStory.id); // Phase 5: Track the loaded story ID
              setAllScenes(existingStory.scenes);
              setScene(existingStory.scenes[existingStory.currentSceneIndex || 0]);
              setSceneCount(existingStory.scenes.length);
              
              const savedInventory = loadInventory();
              setInventory(savedInventory);
              
              if (savedProfile.mode === 'learning') {
                initializeLearningSession(savedProfile);
              }
              
              setLoading(false);
              return;
            } else {
              console.warn('⚠️ Story no longer active, starting fresh');
            }
          }
        }
        
        // CRITICAL FIX: ALWAYS clear ALL active stories before creating a new one
        // This prevents duplicate active story errors from the unique constraint
        console.log('🧹 Preparing to create new story - clearing all existing active stories');
        try {
          if (!isTrialMode) {
            const clearedCount = await clearAllActiveStoriesForUser();
            console.log(`✅ Cleared ${clearedCount} active stories`);
          }
          await clearCurrentStory();
          clearInventory();
          clearSceneCache();
          
          // Clear learning progress if forcing new or no existing story
          if (forceNew) {
            const existingLearning = loadLearningProgress();
            if (existingLearning) {
              localStorage.removeItem('smq.learning_progress');
            }
          }
        } catch (e) {
          console.error('Error clearing existing data:', e);
          // Continue anyway - better to try creating new story
        }

        // Check story limit (skip for trial mode)
        if (!isTrialMode) {
          const limitCheck = await checkStoryLimit();
          if (!limitCheck.canPlay) {
            setStoryLimitReached(true);
            setLoading(false);
            return;
          }
        }

        // For new stories, start with completely empty inventory
        const savedInventory = forceNew ? [] : loadInventory();
        setInventory(savedInventory);

        if (savedProfile.mode === 'learning') {
          initializeLearningSession(savedProfile);
        }

        // Create new story ID for this session
        const newStoryId = crypto.randomUUID();
        
        // Ensure profile has no old inventory data for fresh start
        const cleanProfile = { ...savedProfile, inventory: savedInventory };
        const profileWithInventory = updateProfileInventory(cleanProfile, savedInventory);
        
        // Phase 3: Use forceNewSession flag for explicit new story
        const { parsed, text } = await generateNextScene(profileWithInventory, undefined, false, 1800, 1, newStoryId, true);
        if (!parsed) {
          throw new Error("Invalid AI response: " + text.slice(0, 140));
        }
        
        if (parsed.itemsFound && parsed.itemsFound.length > 0) {
          let newInventory = savedInventory;
          for (const item of parsed.itemsFound) {
            newInventory = addItemToInventory(item, newInventory);
            
            if (savedProfile.mode === 'learning' && item.type === 'document') {
              addLearningConcept(item.name, savedProfile.topic || 'general');
            }
          }
          setInventory(newInventory);
          saveInventory(newInventory);
          
          toast({
            title: "Items discovered!",
            description: `Found ${parsed.itemsFound.length} new item(s)`,
            duration: 4000,
          });
        }
        
        setScene(parsed);
        setAllScenes([parsed]);
        setSceneCount(1);
        
        const newStory: SavedStory = {
          id: newStoryId,
          profile: profileWithInventory,
          scenes: [parsed],
          currentSceneIndex: 0,
          startedAt: new Date().toISOString(),
          lastPlayedAt: new Date().toISOString(),
          completed: false,
        };
        setSavedStory(newStory);
        setInitialStoryId(newStoryId); // Phase 5: Track initial story ID
        
        // Phase 6: Save to database and verify
        if (!isTrialMode) {
          const savedData = await saveStoryToDatabase(newStory);
          if (savedData && savedData.id !== newStoryId) {
            console.error('❌ Story ID mismatch after save!');
            throw new Error('Story save verification failed');
          }
        }
        
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "Failed to start mission");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [isTrialMode, user, navigate]);

  const [choiceLoading, setChoiceLoading] = useState(false);

  const onChoose = async (choiceId: string) => {
    if (!profile || !scene || !savedStory || choiceLoading) return;

    // Phase 5: Validate story ID hasn't changed unexpectedly
    if (initialStoryId && savedStory.id !== initialStoryId) {
      console.error(`❌ Story ID corruption detected! Initial: ${initialStoryId}, Current: ${savedStory.id}`);
      toast({
        title: "Story Error",
        description: "Story session corrupted. Redirecting to start a new adventure...",
        variant: "destructive",
        duration: 3000,
      });
      setTimeout(() => navigate('/profile?new=true'), 2000);
      return;
    }

    setChoiceLoading(true);

    if (profile.mode === 'learning' && learningSession) {
      const availableChallenge = learningSession.challenges.find(
        c => !learningSession.completedChallenges.includes(c.id)
      );
      
      if (availableChallenge && Math.random() < 0.3) {
        setCurrentChallenge(availableChallenge);
        setChoiceLoading(false);
        return;
      }
    }

    try {
      const choice = scene.choices.find(c => c.id === choiceId);
      if (!choice) return;

      const validation = validateChoice(choiceId, scene, inventory);
      if (!validation.valid) {
        toast({
          title: validation.reason,
          description: "Try examining your inventory or the environment for clues.",
          variant: "destructive",
          duration: 4000,
        });
        setChoiceLoading(false);
        return;
      }

      if (choice.consumesItem && choice.requiresItem) {
        const { item, newInventory } = useItem(choice.requiresItem!, inventory);
        if (item) {
          setInventory(newInventory);
          saveInventory(newInventory);
          toast({
            title: "Item used",
            description: choice.consumesItem ? "Item consumed" : "Item used successfully",
            duration: 3000,
          });
        }
      }
      
      const nextSceneCount = sceneCount + 1;
      const profileWithInventory = updateProfileInventory(profile, inventory);
      
      // Phase 3 & 5: Pass story ID for validation, no forceNewSession
      const { parsed, text } = await generateNextScene(profileWithInventory, { ...scene, selectedChoiceId: choiceId }, false, 1200, nextSceneCount, savedStory.id, false);
      if (!parsed) throw new Error("Invalid AI response: " + text.slice(0, 140));
      
      if (parsed.itemsFound && parsed.itemsFound.length > 0) {
        let newInventory = inventory;
        for (const item of parsed.itemsFound) {
          newInventory = addItemToInventory(item, newInventory);
          
          if (profile.mode === 'learning' && item.type === 'document') {
            addLearningConcept(item.name, profile.topic || 'general');
          }
        }
        setInventory(newInventory);
        saveInventory(newInventory);
        
        toast({
          title: "Items discovered!",
          description: `Found ${parsed.itemsFound.length} new item(s)`,
          duration: 4000,
        });
      }
      
      // Create the updated scenes array BEFORE setting state
      const updatedScenes = [...allScenes, parsed];
      const updatedIndex = updatedScenes.length - 1;
      
      setScene(parsed);
      setAllScenes(updatedScenes);
      setSceneCount(nextSceneCount);

      const updatedStory: SavedStory = {
        ...savedStory,
        scenes: updatedScenes,
        currentSceneIndex: updatedIndex,
        lastPlayedAt: new Date().toISOString(),
      };
      setSavedStory(updatedStory);
      
      // Phase 6: Save to database and verify
      if (!isTrialMode) {
        const savedData = await saveStoryToDatabase(updatedStory);
        if (savedData && savedData.id !== savedStory.id) {
          console.error('❌ Story ID changed during save!');
          throw new Error('Story integrity compromised');
        }
      }

      if (parsed.end) {
        // Check if mobile platform
        const isMobile = typeof window !== 'undefined' && 
          ((window as any).Capacitor?.getPlatform?.() === 'ios' || 
           (window as any).Capacitor?.getPlatform?.() === 'android' ||
           /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
        
        // Mark trial/mobile story as used if not authenticated
        if (!user && (isTrialMode || isMobile)) {
          localStorage.setItem('trial_story_used', 'true');
          toast({
            title: "Story Complete! 🎉",
            description: "Sign up to continue your adventures!",
            variant: "default",
          });
          setTimeout(() => {
            navigate("/");
          }, 3000);
          return;
        }
        
        // Don't auto-complete, just mark that the story is ready to finish
        setStoryReadyToFinish(true);
      }
      
    } catch (error: any) {
      console.error("Error in onChoose:", error);
      toast({
        title: "Story Error",
        description: error.message?.includes("authentication") || error.message?.includes("Not authenticated") 
          ? "Authentication error. Please try refreshing the page." 
          : "Failed to continue story. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setChoiceLoading(false);
    }
  };

  const goBack = () => {
    if (!savedStory || allScenes.length <= 1 || goBacksUsed >= 5) return;
    
    const currentIndex = savedStory.currentSceneIndex || allScenes.length - 1;
    if (currentIndex <= 0) return;
    
    const previousIndex = currentIndex - 1;
    const previousScene = allScenes[previousIndex];
    
    setScene(previousScene);
    setGoBacksUsed(prev => prev + 1);
    setSceneCount(previousIndex + 1);
    
    const updatedStory: SavedStory = {
      ...savedStory,
      currentSceneIndex: previousIndex,
      lastPlayedAt: new Date().toISOString(),
    };
    setSavedStory(updatedStory);
    
    if (!isTrialMode) {
      saveStoryToDatabase(updatedStory);
    }
    
    toast({
      title: "Went back to previous scene",
      description: `Go-backs remaining: ${5 - goBacksUsed - 1}`,
      duration: 3000,
    });
  };

  if (!profile) return null;

  const backgroundImage = getBackgroundForBadge(profile.selectedBadges);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-purple-300 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Wand2 className="h-8 w-8 text-purple-300 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Preparing Your Adventure</h2>
            <p className="text-purple-200">The StoryMaster is weaving your tale...</p>
            {profile.mode === 'learning' && (
              <p className="text-blue-200">🎓 Setting up interactive learning experience...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (storyLimitReached) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 max-w-md text-center space-y-4">
          <Timer className="h-16 w-16 text-yellow-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Daily Adventure Limit Reached</h2>
          <button onClick={() => navigate('/')} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 max-w-md text-center space-y-4">
          <RefreshCw className="h-16 w-16 text-red-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Oops! Something went wrong</h2>
          <p className="text-purple-200 text-sm">{error}</p>
          <button onClick={() => navigate('/')} className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors w-full">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!scene) return null;

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-black/30 backdrop-blur-sm border-b border-white/20 p-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                {getIconForBadge(profile.selectedBadges?.[0] || "mystic", "h-6 w-6")}
                {scene.sceneTitle}
              </h1>
              {profile.mode === 'learning' && (
                <Badge variant="secondary" className="bg-blue-600/80 text-white">
                  <BookOpen className="h-3 w-3 mr-1" />
                  Learning Quest
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {profile.mode === 'learning' && learningSession && (
                <button
                  onClick={() => setShowLearningProgress(!showLearningProgress)}
                  className="flex items-center gap-2 bg-blue-600/80 hover:bg-blue-700/80 text-white px-3 py-2 rounded-lg transition-colors"
                >
                  <Trophy className="h-4 w-4" />
                  Score: {calculateLearningScore(learningSession)}%
                </button>
              )}
              <div className="text-white text-sm">Scene {sceneCount}</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Story Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Current Challenge */}
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center space-x-2 cursor-help">
                          <Zap className="h-5 w-5 text-yellow-400" />
                          <span className="text-white font-semibold">{scene.hud.energy}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={12} className="z-[9999] bg-popover/95 backdrop-blur-sm">
                        <p className="max-w-xs">⚡ Experience Points: Earned through story progression and smart choices. Build up experience to level up your hero!</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center space-x-2 cursor-help">
                          <Timer className="h-5 w-5 text-blue-400" />
                          <span className="text-white font-semibold">{scene.hud.time}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={12} className="z-[9999] bg-popover/95 backdrop-blur-sm">
                        <p className="max-w-xs">⏱️ Time/Energy: Represents your character's current energy level and story progress timing.</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center space-x-2 cursor-help">
                          <Star className="h-5 w-5 text-purple-400" />
                          <span className="text-white font-semibold">{scene.hud.choicePoints}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={12} className="z-[9999] bg-popover/95 backdrop-blur-sm">
                        <p className="max-w-xs">⭐ Choice Points: Total meaningful decisions made in your adventure. Higher points show deeper engagement with the story!</p>
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
                      <TooltipContent side="bottom" sideOffset={12} className="z-[9999] bg-popover/95 backdrop-blur-sm">
                        <p className="max-w-xs">❤️ Status Display: Shows your current story status (display only, not interactive).</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>

              {/* Narrative */}
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
                <div className="prose prose-invert max-w-none">
                  {scene.narrative.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="text-white mb-4 leading-relaxed text-lg">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              {/* Choices */}
              {!storyReadyToFinish && (
                <div className="bg-black/50 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    What do you choose?
                  </h3>
                  
                  {/* Go Back Button */}
                  {allScenes.length > 1 && goBacksUsed < 5 && (savedStory?.currentSceneIndex || allScenes.length - 1) > 0 && (
                    <div className="mb-4">
                      <button
                        onClick={goBack}
                        disabled={choiceLoading}
                        className="w-full p-3 rounded-lg bg-gray-700/80 hover:bg-gray-600/80 text-white border-2 border-gray-500/50 hover:border-gray-400/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Go Back to Previous Scene ({5 - goBacksUsed} remaining)
                      </button>
                    </div>
                  )}
                  
                  <div className="grid gap-3">
                    {scene.choices.map((choice, index) => {
                      const validation = validateChoice(choice.id, scene, inventory);
                      const isDisabled = !validation.valid || choiceLoading;
                      return (
                        <button
                          key={choice.id}
                          onClick={() => onChoose(choice.id)}
                          disabled={isDisabled}
                          className={`p-4 rounded-lg text-left transition-all transform hover:scale-[1.02] relative ${
                            validation.valid && !choiceLoading
                              ? 'bg-white/20 hover:bg-white/30 text-white border-2 border-transparent hover:border-white/30'
                              : 'bg-gray-600/50 text-gray-400 border-2 border-gray-500/50 cursor-not-allowed'
                          } ${choiceLoading ? 'opacity-75' : ''}`}
                        >
                          {choiceLoading && (
                            <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                            </div>
                          )}
                          <div className="flex items-start space-x-3">
                            <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-1">
                              {String.fromCharCode(65 + index)}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium">{choice.text}</p>
                              {choice.requiresItem && (
                                <p className="text-sm mt-1 opacity-75">
                                  Requires: {choice.requiresItem}
                                </p>
                              )}
                              {!validation.valid && !choiceLoading && (
                                <p className="text-sm mt-1 text-red-300">
                                  {validation.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Finish Adventure Button (when story is complete) */}
              {storyReadyToFinish && (
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-lg p-6 border border-yellow-400/30">
                  <div className="text-center space-y-4">
                    <h3 className="text-2xl font-bold text-yellow-200 flex items-center justify-center gap-2">
                      <Crown className="h-8 w-8 text-yellow-400" />
                      Adventure Complete!
                    </h3>
                    <p className="text-white/90">
                      🎉 Congratulations! You've reached the end of your epic journey. 
                      Ready to see your achievements and save this adventure to your gallery?
                    </p>
                    <Button 
                      size="xl"
                      variant="hero"
                      onClick={async () => {
                        try {
                          const nextSceneCount = sceneCount;
                          const { newAchievements, characterProgress } = await markStoryCompleted(profile, nextSceneCount);
                          
                          // Check if this story was already saved to prevent duplicates
                          const existingStories = getCompletedStories();
                          const alreadySaved = existingStories.some(story => story.id === savedStory.id);
                          
                          if (!alreadySaved) {
                            const completedStoryData = {
                              id: savedStory.id,
                              title: allScenes[0]?.sceneTitle || scene.sceneTitle || "Untitled Adventure",
                              completedAt: new Date().toISOString(),
                              sceneCount: nextSceneCount,
                              choicesMade: [],
                              profile: savedStory.profile,
                            };
                            
                            saveCompletedStory(completedStoryData);
                          }
                          
                          await clearCurrentStoryInDatabase(savedStory.id);
                          clearInventory();
                          setInventory([]);

                          // Show comprehensive progress summary first
                          const progressParts = [];
                          if (characterProgress?.expGained) {
                            progressParts.push(`+${characterProgress.expGained} XP`);
                          }
                          if (characterProgress?.leveledUp) {
                            progressParts.push(`Level ${characterProgress.character.level}`);
                          }
                          if (newAchievements?.length > 0) {
                            progressParts.push(`${newAchievements.length} new achievement${newAchievements.length > 1 ? 's' : ''}`);
                          }
                          
                          if (progressParts.length > 0) {
                            toast({
                              title: "🎉 Story Complete!",
                              description: progressParts.join(' • '),
                              duration: 6000,
                            });
                          }

                          // Show level up notification
                          if (characterProgress?.leveledUp) {
                            setTimeout(() => {
                              const titleInfo = characterProgress.newTitles?.length > 0 
                                ? ` • ${characterProgress.newTitles[0]}` 
                                : '';
                              toast({
                                title: `🎉 Level Up! Level ${characterProgress.character.level}${titleInfo}`,
                                description: `+${characterProgress.character.skillPoints} skill points earned!`,
                                duration: 8000,
                              });
                            }, 1500);
                          }

                          // Show new achievements with staggered timing
                          if (newAchievements?.length > 0) {
                            newAchievements.forEach((achievement, index) => {
                              setTimeout(() => {
                                toast({
                                  title: `🏆 Achievement Unlocked!`,
                                  description: `${achievement.icon} ${achievement.name}: ${achievement.description}`,
                                  duration: 7000,
                                });
                              }, (characterProgress?.leveledUp ? 3500 : 2000) + (index * 2000));
                            });
                          }

                          const finalDelay = 2000 + 
                            (characterProgress?.leveledUp ? 2000 : 0) + 
                            (newAchievements?.length || 0) * 2000;

                          setTimeout(() => {
                            toast({
                              title: "✨ Adventure Saved!",
                              description: `Your ${nextSceneCount}-scene adventure is now in your gallery!`,
                              duration: 5000,
                            });
                          }, finalDelay);

                          setTimeout(() => navigate('/'), finalDelay + 3000);
                        } catch (error) {
                          console.error("Error finishing adventure:", error);
                          toast({
                            title: "Error saving adventure",
                            description: "There was an issue saving your progress. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="w-full max-w-xs mx-auto text-lg font-bold"
                    >
                      <Crown className="h-5 w-5 mr-2" />
                      Finish Adventure
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Learning Progress */}
              {profile.mode === 'learning' && learningSession && showLearningProgress && (
                <LearningProgress
                  concepts={learningSession.concepts}
                  currentTopic={learningSession.topic}
                  onConceptClick={(concept) => {
                    toast({
                      title: concept.name,
                      description: `Mastery: ${concept.mastery}% • ${concept.attempts} attempts`,
                      duration: 3000,
                    });
                  }}
                />
              )}

              {/* Inventory */}
              <InventoryPanel
                inventory={inventory}
                onUseItem={(item) => {
                  const { item: usedItem, newInventory } = useItem(item.id, inventory);
                  if (usedItem) {
                    setInventory(newInventory);
                    saveInventory(newInventory);
                    toast({
                      title: "Item used",
                      description: `${usedItem.name} used successfully`,
                      duration: 3000,
                    });
                  }
                }}
              />

              {/* Story Progress */}
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Adventure Progress
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-white text-sm">
                    <span>Scenes Explored:</span>
                    <span className="font-semibold">{sceneCount}</span>
                  </div>
                  <div className="flex justify-between text-white text-sm">
                    <span>Items Found:</span>
                    <span className="font-semibold">{inventory.length}</span>
                  </div>
                  {profile.mode === 'learning' && learningSession && (
                    <>
                      <div className="flex justify-between text-white text-sm">
                        <span>Learning Points:</span>
                        <span className="font-semibold">{learningSession.totalPoints}</span>
                      </div>
                      <div className="flex justify-between text-white text-sm">
                        <span>Challenges Done:</span>
                        <span className="font-semibold">{learningSession.completedChallenges.length}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 space-y-3">
                <button
                  onClick={() => setShowNewStoryDialog(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Start New Adventure
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Save & Exit
                </button>
          </div>
        </div>
      </div>
      
      {/* New Story Confirmation Dialog */}
      <Dialog open={showNewStoryDialog} onOpenChange={setShowNewStoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start New Adventure?</DialogTitle>
            <DialogDescription>
              You're currently in the middle of an adventure. Starting a new one will save your current progress and begin a fresh story.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowNewStoryDialog(false)}
              className="flex-1"
            >
              Continue Current Story
            </Button>
            <Button
              onClick={() => {
                setShowNewStoryDialog(false);
                navigate('/profile?new=true');
              }}
              className="flex-1"
            >
              Start New Adventure
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
      </div>
    </div>
  );
};

export default Mission;