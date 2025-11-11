import mysticMageBg from "@/assets/mystic-mage-bg.jpg";
import beastMasterBg from "@/assets/beast-master-bg.jpg";
import detectiveBg from "@/assets/detective-bg.jpg";
import actionHeroBg from "@/assets/action-hero-bg.jpg";
import socialChampionBg from "@/assets/social-champion-bg.jpg";
import creativeGeniusBg from "@/assets/creative-genius-bg.jpg";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Zap, Timer, Star, Heart, Shield, Eye, Wand2, PawPrint, Crosshair, Users, Palette, RefreshCw, Play, BookOpen, Trophy, Target, ArrowLeft, Crown, ArrowUp, Volume2, VolumeX, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState, useRef } from "react";
import { generateNextScene, loadProfile, checkStoryLimit, markStoryCompleted, type Scene, saveCurrentStory, loadCurrentStory, clearCurrentStory, saveCompletedStory, getCompletedStories, type SavedStory, type InventoryItem, saveProfileToLocal, clearSceneCache, recoverStorySession } from "@/lib/story";
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
import { trackReadingSession } from "@/lib/readingAnalytics";
import { InventoryPanel } from "@/components/InventoryPanel";
import { LearningProgress, type LearningConcept } from "@/components/LearningProgress";
import { LearningChallengeComponent, type LearningChallenge } from "@/components/LearningChallenge";
import { useToast } from "@/components/ui/use-toast";
import { validateChoice } from "@/lib/interactionHandlers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { gainSceneExperience, loadCharacter } from "@/lib/character";
import { ComprehensionQuiz } from "@/components/ComprehensionQuiz";
import { QuizQuestion } from "@/lib/quizSystem";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { loadAbilities, getAvailableAbilities, type Ability } from "@/lib/abilities";
import { AbilityToast } from "@/components/AbilityToast";
import { AbilityProgressIndicator } from "@/components/AbilityProgressIndicator";

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
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Learning system state
  const [learningSession, setLearningSession] = useState<LearningSession | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<LearningChallenge | null>(null);
  const [showLearningProgress, setShowLearningProgress] = useState(false);
  const [storyReadyToFinish, setStoryReadyToFinish] = useState(false);
  const [showNewStoryDialog, setShowNewStoryDialog] = useState(false);
  
  // Quiz state
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  
  // Text-to-speech state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Abilities state
  const [availableAbilities, setAvailableAbilities] = useState<Ability[]>([]);
  
  const { toast } = useToast();

  // Initialize learning session for learning mode
  useEffect(() => {
    // Load available abilities
    const abilities = loadAbilities();
    const available = getAvailableAbilities();
    setAvailableAbilities(available);
    console.log(`Loaded ${available.length} available abilities`);
  }, []);

  // Text-to-speech handler
  const handleReadToMe = async () => {
    if (isPlaying) {
      // Stop playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
      }
      return;
    }

    if (!scene?.narrative) return;

    // Select voice based on mode
    const getVoiceId = () => {
      if (profile.mode === 'mystery') return '1UllZlmEKI6fNlrEtCx7'; // Mystery mode voice
      if (profile.mode === 'explore') return 'XGEkEAwj53E5iuoRDhFu'; // Explore mode voice
      return 'OyKUKANp9Wm5JOBO2Tw3'; // Comedy mode voice (default)
    };

    setAudioLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text: scene.narrative,
          voiceId: getVoiceId()
        }
      });

      if (error) throw error;

      if (data?.audioContent) {
        // Convert base64 to audio
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
          setIsPlaying(true);
          
          audioRef.current.onended = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(audioUrl);
          };
        }
      }
    } catch (error) {
      console.error('Text-to-speech error:', error);
      toast({
        title: "Audio Error",
        description: error?.message || "Failed to generate audio. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAudioLoading(false);
    }
  };

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

  // CRITICAL: Guard against multiple concurrent initializations
  const initializingRef = useRef(false);
  const [initComplete, setInitComplete] = useState(false);

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
    // Phase 5: Prevent reinitialization if story already loaded
    if (savedStory && savedStory.id && !searchParams.get('new')) {
      console.log('⏭️ Story already loaded, skipping init');
      return;
    }

    const init = async () => {
      // RACE CONDITION FIX: Prevent multiple simultaneous initializations
      if (initializingRef.current) {
        console.log('⏸️ Init already in progress, skipping duplicate call');
        return;
      }
      
      initializingRef.current = true;
      console.log('🚀 Starting initialization (locked)');
      
      try {
        // Check if mobile platform
        const isMobile = typeof window !== 'undefined' && 
          ((window as any).Capacitor?.getPlatform?.() === 'ios' || 
           (window as any).Capacitor?.getPlatform?.() === 'android' ||
           /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
        
        // ONLY check for completed trials if this is NOT an explicit trial request
        // When user clicks "Try 1 Story Free", we should always allow it
        if (!user && !isTrialMode && isMobile) {
          // This block only runs for mobile users who didn't explicitly request trial
          const trialUsed = localStorage.getItem('trial_story_used');
          
          if (trialUsed === 'completed') {
            console.log('🚫 Mobile user has completed trial, redirecting to home');
            navigate("/");
            return;
          }
        }

        // For explicit trial mode (from "Try 1 Story Free" button), always proceed
        if (!user && isTrialMode) {
          console.log('✅ Explicit trial mode requested - proceeding');
          // Don't check localStorage at all - Index page already cleared it
          // Just mark that trial has started
          localStorage.setItem('trial_story_started', 'true');
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
        
        // SAFEGUARD: Double-check user intent when forceNew is true
        if (forceNew && !isTrialMode) {
          const existingStoryCheck = await loadCurrentStoryFromDatabase();
          if (existingStoryCheck && existingStoryCheck.scenes.length > 1) {
            console.warn('⚠️ forceNew=true with active story progress detected');
            console.log('🔍 Debug info:', {
              existingStoryId: existingStoryCheck.id,
              sceneCount: existingStoryCheck.scenes.length,
              referrer: document.referrer,
              currentUrl: window.location.href,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        // Skip loading existing story for trial mode or if forcing new story
        if (!isTrialMode && !forceNew) {
          const existingStory = await loadCurrentStoryFromDatabase();
          if (existingStory && existingStory.scenes.length > 0) {
            // Phase 4 & 5: Verify story is still active and track ID
            const isActive = await verifyStoryIsActive(existingStory.id);
            if (isActive) {
              console.log(`📖 Resuming story: ${existingStory.id}`);
              // Phase 3: Recover story session
              recoverStorySession(existingStory.id, existingStory.scenes.length);
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
        
        // Enhanced logging for new story creation
        if (forceNew) {
          console.log('🆕 User explicitly requested new story via ?new=true parameter');
          console.log('📍 Navigation source:', {
            referrer: document.referrer,
            url: window.location.href,
            userAgent: navigator.userAgent.slice(0, 50)
          });
          
          // MONITORING: Detect if this shouldn't be happening
          const existingStoryForMonitoring = await loadCurrentStoryFromDatabase();
          if (existingStoryForMonitoring && existingStoryForMonitoring.scenes.length > 1) {
            console.error('🚨 BUG DETECTED: New story started despite active story with progress', {
              existingStoryId: existingStoryForMonitoring.id,
              sceneCount: existingStoryForMonitoring.scenes.length,
              timestamp: new Date().toISOString(),
              referrer: document.referrer,
              url: window.location.href
            });
            // This shouldn't happen if confirmation dialogs work correctly
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
          choicesMade: 0, // Initialize choice counter
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
        initializingRef.current = false;
        setInitComplete(true);
        console.log('✅ Initialization complete (unlocked)');
      }
    };
    
    // Only run init if not already complete
    if (!initComplete) {
      init();
    }
  }, [isTrialMode, user, navigate, searchParams, initComplete]);

  // Show scroll to top button when story updates
  useEffect(() => {
    if (sceneCount > 1) {
      setShowScrollTop(true);
      // Hide after 5 seconds
      const timer = setTimeout(() => {
        setShowScrollTop(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [sceneCount]);

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
      
      // Phase 2: Pre-call validation
      if (!savedStory.id) {
        console.error('❌ No story ID present!');
        throw new Error('Story session lost - please start a new adventure');
      }

      if (sceneCount < 1) {
        console.error('❌ Invalid scene count:', sceneCount);
        throw new Error('Story state corrupted - please start a new adventure');
      }

      // Phase 4: Defensive logging
      console.log(`🎯 Choice selected:`, {
        choiceId,
        currentStoryId: savedStory.id,
        currentScene: sceneCount,
        nextScene: nextSceneCount
      });
      
      // Phase 1 & 2: Pass story ID for validation, no forceNewSession
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
      
      // Scroll to top to show new story content
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Award per-scene XP
      const xpResult = gainSceneExperience(nextSceneCount, true);
      
      // Show XP toast
      toast({
        title: `+${xpResult.expGained} XP`,
        description: xpResult.leveledUp 
          ? `🎉 Level Up! You're now Level ${xpResult.character.level}!` 
          : `Scene Complete • ${xpResult.character.experience}/${xpResult.character.experienceToNext} XP to next level`,
        duration: 4000,
      });
      
      // Show confetti on level up
      if (xpResult.leveledUp) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        
        if (xpResult.newTitles.length > 0) {
          setTimeout(() => {
            toast({
              title: "🏆 New Title Earned!",
              description: xpResult.newTitles.join(", "),
              duration: 5000,
            });
          }, 1000);
        }
      }

      const updatedStory: SavedStory = {
        ...savedStory,
        scenes: updatedScenes,
        currentSceneIndex: updatedIndex,
        lastPlayedAt: new Date().toISOString(),
        choicesMade: (savedStory.choicesMade || 0) + 1, // Track choices made
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
        
        // Mark trial/mobile story as COMPLETED if not authenticated
        if (!user && (isTrialMode || isMobile)) {
          console.log('📝 Marking trial/mobile story as completed');
          localStorage.setItem('trial_story_used', 'completed');
          localStorage.setItem('trial_story_started', 'completed');
          
          toast({
            title: "Story Complete! 🎉",
            description: "Sign up to continue your adventures and unlock unlimited stories!",
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
          <div className="max-w-6xl mx-auto grid grid-cols-1 tablet-lg:grid-cols-[2fr_1fr] lg:grid-cols-3 gap-6">
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
                  <div className="grid grid-cols-2 tablet:grid-cols-4 md:grid-cols-4 gap-4 text-center">
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
                    
                    {/* Abilities Indicator */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center space-x-2 cursor-help">
                          <Sparkles className={`h-5 w-5 ${availableAbilities.length > 0 ? 'text-purple-400 animate-pulse' : 'text-gray-500 opacity-50'}`} />
                          <span className={`text-white font-semibold ${availableAbilities.length > 0 ? 'text-purple-300' : 'text-gray-400 opacity-70'}`}>
                            {availableAbilities.length}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={12} className="z-[9999] bg-popover/95 backdrop-blur-sm">
                        <div className="max-w-xs">
                          <p className="font-semibold mb-2">✨ Ultra Abilities: {availableAbilities.length}</p>
                          {availableAbilities.length > 0 ? (
                            <>
                              <p className="mb-2">Unlock Ultra Choices with these abilities:</p>
                              <ul className="text-sm space-y-1">
                                {availableAbilities.slice(0, 3).map(ability => (
                                  <li key={ability.id}>• {ability.name}</li>
                                ))}
                                {availableAbilities.length > 3 && <li className="text-muted-foreground">...and {availableAbilities.length - 3} more</li>}
                              </ul>
                            </>
                          ) : (
                            <p>Complete stories with your chosen badges to unlock powerful abilities that enable Ultra Choices!</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>

              {/* Narrative */}
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
                {(profile.mode === 'comedy' || profile.mode === 'mystery' || profile.mode === 'explore') && (
                  <div className="flex justify-end mb-4">
                    <Button
                      onClick={handleReadToMe}
                      disabled={audioLoading}
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
                  </div>
                )}
                <div className="prose prose-invert max-w-none tablet:max-w-prose tablet:mx-auto">
                  {scene.narrative.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="text-white mb-4 leading-relaxed text-lg">
                      {paragraph}
                    </p>
                  ))}
                </div>
                <audio ref={audioRef} className="hidden" />
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
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-lg p-6 border border-yellow-400/30 space-y-4">
                  <div className="text-center space-y-4">
                    <h3 className="text-2xl font-bold text-yellow-200 flex items-center justify-center gap-2">
                      <Crown className="h-8 w-8 text-yellow-400" />
                      Adventure Complete!
                    </h3>
                    <p className="text-white/90">
                      🎉 Congratulations! You've reached the end of your epic journey. 
                      {!savedStory?.quizTaken && " Take the comprehension quiz for bonus XP, or "}
                      Ready to see your achievements and save this adventure to your gallery?
                    </p>
                    
                    {/* Quiz Button */}
                    {!savedStory?.quizTaken && (
                      <Button
                        size="xl"
                        variant="hero"
                        onClick={async () => {
                          setQuizLoading(true);
                          try {
                            // Generate quiz questions using the edge function
                            const { data, error } = await supabase.functions.invoke('generate-story', {
                              body: {
                                profile,
                                previousScene: null,
                                sceneCount: 1,
                                action: 'generate-quiz',
                                scenes: allScenes,
                              }
                            });
                            
                            if (error) throw error;
                            
                            if (data?.questions && Array.isArray(data.questions) && data.questions.length > 0) {
                              setQuizQuestions(data.questions);
                              setShowQuiz(true);
                            } else {
                              throw new Error("Invalid quiz response - no questions received");
                            }
                          } catch (error) {
                            console.error("Error generating quiz:", error);
                            toast({
                              title: "Quiz Error",
                              description: "Failed to generate quiz. You can still finish the adventure.",
                              variant: "destructive",
                              duration: 4000,
                            });
                          } finally {
                            setQuizLoading(false);
                          }
                        }}
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
                            Take Quiz (+Bonus XP)
                          </>
                        )}
                      </Button>
                    )}
                    
                    <Button 
                      size="xl"
                      variant="hero"
                      onClick={async () => {
                        try {
                          const actualChoicesMade = savedStory?.choicesMade || 0;
                          console.log(`Story completed with ${actualChoicesMade} choices made, ${profile.selectedBadges.length} badges`);
                          const { newAchievements, characterProgress, newAbilities } = await markStoryCompleted(profile, actualChoicesMade);
                          
                          // Check if this story was already saved to prevent duplicates
                          const existingStories = getCompletedStories();
                          const alreadySaved = existingStories.some(story => story.id === savedStory.id);
                          
                          if (!alreadySaved) {
                            const completedStoryData = {
                              id: savedStory.id,
                              title: allScenes[0]?.sceneTitle || scene.sceneTitle || "Untitled Adventure",
                              completedAt: new Date().toISOString(),
                              sceneCount: sceneCount,
                              choicesMade: [],
                              profile: savedStory.profile,
                            };
                            
                            saveCompletedStory(completedStoryData);
                            
                            // Track reading session for analytics
                            if (user) {
                              await trackReadingSession(
                                savedStory.id,
                                allScenes[0]?.sceneTitle || scene.sceneTitle || "Untitled Adventure",
                                allScenes
                              );
                            }
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
                          if (newAbilities?.length > 0) {
                            progressParts.push(`${newAbilities.length} new abilit${newAbilities.length > 1 ? 'ies' : 'y'}`);
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
                          
                          // Show new abilities with staggered timing after achievements
                          if (newAbilities?.length > 0) {
                            const abilityStartDelay = (characterProgress?.leveledUp ? 3500 : 2000) + 
                              (newAchievements?.length || 0) * 2000;
                            
                            // Update available abilities state
                            const updatedAbilities = getAvailableAbilities();
                            setAvailableAbilities(updatedAbilities);
                            
                            newAbilities.forEach((ability, index) => {
                              setTimeout(() => {
                                confetti({
                                  particleCount: 100,
                                  spread: 70,
                                  origin: { y: 0.6 }
                                });
                                toast({
                                  title: `✨ New Ability Unlocked!`,
                                  description: <AbilityToast ability={ability} />,
                                  duration: 8000,
                                });
                              }, abilityStartDelay + (index * 2500));
                            });
                          }

                          const finalDelay = 2000 + 
                            (characterProgress?.leveledUp ? 2000 : 0) + 
                            (newAchievements?.length || 0) * 2000 +
                            (newAbilities?.length || 0) * 2500;

                          setTimeout(() => {
                            toast({
                              title: "✨ Adventure Saved!",
                              description: `Your ${sceneCount}-scene adventure is now in your gallery!`,
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
              {/* Ability Progress Indicator */}
              <AbilityProgressIndicator 
                choicesMade={savedStory?.choicesMade || 0}
                selectedBadges={profile.selectedBadges}
                availableAbilitiesCount={availableAbilities.length}
              />

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
                onUseItem={async (item) => {
                  const { item: usedItem, newInventory } = useItem(item.id, inventory);
                  if (usedItem) {
                    setInventory(newInventory);
                    saveInventory(newInventory);
                    
                    // Update savedStory with new inventory
                    if (savedStory && profile) {
                      const updatedProfile = updateProfileInventory(profile, newInventory);
                      const updatedStory = {
                        ...savedStory,
                        profile: updatedProfile,
                        lastPlayedAt: new Date().toISOString()
                      };
                      setSavedStory(updatedStory);
                      
                      // Save to database to persist the change
                      if (!isTrialMode) {
                        await saveStoryToDatabase(updatedStory);
                      }
                    }
                    
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

              {/* Scroll to Top Button */}
              {showScrollTop && (
                <button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setShowScrollTop(false);
                  }}
                  className="fixed bottom-6 right-6 z-50 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-4 shadow-lg border-2 border-primary-foreground/20 transition-all hover:scale-110 animate-fade-in flex items-center gap-2 font-semibold"
                >
                  <ArrowUp className="h-5 w-5" />
                  <span className="hidden tablet:inline">Story Updated</span>
                </button>
              )}

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
      
      {/* Comprehension Quiz Modal */}
      {showQuiz && quizQuestions.length > 0 && (
        <ComprehensionQuiz
          open={showQuiz}
          onClose={() => {
            setShowQuiz(false);
            setQuizQuestions([]);
          }}
          questions={quizQuestions}
          storyId={savedStory?.id || ''}
          storyTitle={allScenes[0]?.sceneTitle || scene?.sceneTitle || "Untitled Adventure"}
          onComplete={(xpEarned) => {
            // Award quiz XP
            const character = loadCharacter();
            character.experience += xpEarned;
            character.totalExperienceEarned += xpEarned;
            
            // Check for level ups
            let leveledUp = false;
            const newTitles: string[] = [];
            
            while (character.experience >= character.experienceToNext) {
              character.experience -= character.experienceToNext;
              character.level += 1;
              character.skillPoints += 2;
              leveledUp = true;
              character.experienceToNext = Math.floor(character.experienceToNext * 1.15);
            }
            
            // Save character
            import('@/lib/character').then(({ saveCharacter }) => {
              saveCharacter(character);
            });
            
            // Mark quiz as taken
            if (savedStory) {
              const updatedStory = {
                ...savedStory,
                quizTaken: true,
                quizScore: xpEarned,
              };
              setSavedStory(updatedStory);
              saveStoryToDatabase(updatedStory);
            }
            
            // Show success toast
            toast({
              title: `+${xpEarned} Quiz XP Earned!`,
              description: leveledUp 
                ? `🎉 Level Up! You're now Level ${character.level}!` 
                : `Great job! Total XP: ${character.totalExperienceEarned}`,
              duration: 5000,
            });
            
            if (leveledUp) {
              confetti({
                particleCount: 150,
                spread: 90,
                origin: { y: 0.6 }
              });
            }
          }}
        />
      )}
    </div>
      </div>
    </div>
  );
};

export default Mission;