import mysticMageBg from "@/assets/mystic-mage-bg.jpg";
import beastMasterBg from "@/assets/beast-master-bg.jpg";
import detectiveBg from "@/assets/detective-bg.jpg";
import actionHeroBg from "@/assets/action-hero-bg.jpg";
import socialChampionBg from "@/assets/social-champion-bg.jpg";
import creativeGeniusBg from "@/assets/creative-genius-bg.jpg";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Zap, Timer, Star, Heart, Shield, Eye, Wand2, PawPrint, Crosshair, Users, Palette, RefreshCw, Play, BookOpen, Trophy, Target, ArrowLeft, Crown, ArrowUp, Volume2, VolumeX, Sparkles, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDevice } from "@/contexts/DeviceContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState, useRef } from "react";
import { generateNextScene, loadProfile, checkStoryLimit, markStoryCompleted, type Scene, saveCurrentStory, loadCurrentStory, clearCurrentStory, saveCompletedStory, getCompletedStories, type SavedStory, type InventoryItem, saveProfileToLocal, clearSceneCache, recoverStorySession } from "@/lib/story";
import { saveStoryToDatabase, loadCurrentStoryFromDatabase, loadStoryByIdFromDatabase, clearCurrentStoryInDatabase, clearAllActiveStoriesForUser, verifyStoryIsActive, pauseStoryInDatabase } from "@/lib/databaseStory";
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
import { trackReadingSession, trackSceneReading } from "@/lib/readingAnalytics";
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
// ABILITIES DISABLED - Uncomment to re-enable
// import { loadAbilities, getAvailableAbilities, type Ability, awardAbility, type AbilityCategory } from "@/lib/abilities";
// import { AbilityToast } from "@/components/AbilityToast";
// import { AbilityProgressIndicator } from "@/components/AbilityProgressIndicator";
import { getUserSubscription } from "@/lib/subscription";
import { cn } from "@/lib/utils";

const Mission = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isPhone, isTablet, isNative, safeAreaInsets } = useDevice();
  const [profile, setProfile] = useState(null);
  const [userPlan, setUserPlan] = useState<any>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [allScenes, setAllScenes] = useState<Scene[]>([]);
  const [sceneCount, setSceneCount] = useState(1);
  const [savedStory, setSavedStory] = useState<SavedStory | null>(null);
  const [initialStoryId, setInitialStoryId] = useState<string | null>(null); // Phase 5: Track initial story ID
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storyLimitReached, setStoryLimitReached] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [storyMemory, setStoryMemory] = useState<{ flags: string[]; pastChoices: string[] }>({ flags: [], pastChoices: [] });
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
  const [hasUsedReadToMe, setHasUsedReadToMe] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // ABILITIES DISABLED - Uncomment to re-enable
  // const [availableAbilities, setAvailableAbilities] = useState<Ability[]>([]);
  const availableAbilities: any[] = []; // Placeholder for disabled abilities
  
  const { toast } = useToast();

  // ABILITIES DISABLED - Uncomment to re-enable
  // const [abilitiesLoaded, setAbilitiesLoaded] = useState(false);
  const abilitiesLoaded = true; // Always true when abilities disabled

  // ABILITIES DISABLED - Initialize subscription on mount
  useEffect(() => {
    const initializePlan = async () => {
      // ABILITIES DISABLED - Uncomment to re-enable
      // const abilities = loadAbilities();
      // const available = getAvailableAbilities();
      // setAvailableAbilities(available);
      // setAbilitiesLoaded(true);
      // console.log(`Loaded ${available.length} available abilities`);

      // Load user subscription plan
      const { plan } = await getUserSubscription();
      setUserPlan(plan);
    };

    initializePlan();

    // Load saved theme
    const savedTheme = localStorage.getItem("premium-theme");
    if (savedTheme && savedTheme !== "default") {
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  // Reset Read-To-Me usage when scene changes
  useEffect(() => {
    setHasUsedReadToMe(false);
    // Stop any playing audio when scene changes
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [scene]);

  // Check if user has Read-to-Me access (any Adventure Pass)
  const hasReadToMeAccess = () => {
    if (!userPlan) return false;
    const planName = userPlan.name?.toLowerCase().trim().replace(/\s+/g, '_');
    return planName === 'premium' || planName === 'premium_plus' || planName?.includes('premium') || userPlan.features?.read_to_me === true;
  };

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
    
    // If already used for this scene, don't allow another attempt
    if (hasUsedReadToMe) {
      toast({
        title: "Already Used",
        description: "Read-to-Me can only be used once per scene.",
      });
      return;
    }

    // Check premium access for Read-to-Me
    if (!hasReadToMeAccess()) {
      toast({
        title: "Premium+ Feature",
        description: "Upgrade to Premium+ to unlock Read-to-Me for all stories!",
        variant: "destructive",
      });
      return;
    }

    // Select voice based on mode
    const getVoiceId = () => {
      if (profile?.mode === 'thrill') return 'oXo2A4ac7KxEZkQ69ZxG'; // Thrill mode voice
      if (profile?.mode === 'mystery') return '1UllZlmEKI6fNlrEtCx7'; // Mystery mode voice
      if (profile?.mode === 'explore') return 'XGEkEAwj53E5iuoRDhFu'; // Explore mode voice
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

      if (error) {
        console.error('Text-to-speech function error:', error);
        throw new Error(error.message || 'Failed to generate audio');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.audioContent) {
        // Mark as used ONLY after successful audio generation
        setHasUsedReadToMe(true);
        
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
      } else {
        throw new Error('No audio content returned');
      }
    } catch (error: any) {
      console.error('Text-to-speech error:', error);
      toast({
        title: "Audio Error",
        description: error?.message || "Failed to generate audio. Please try again.",
        variant: "destructive"
      });
      // Don't mark as used on failure - allow retry
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
        // ENFORCE STORY LIMITS BEFORE STARTING NEW STORY
        if (user && !searchParams.get('resume')) {
          const { getStoriesRemaining } = await import('@/lib/subscription');
          const { canPlay, storiesUsedThisMonth, monthlyLimit } = await getStoriesRemaining();
          
          if (!canPlay) {
            console.log('🚫 Monthly story limit reached, redirecting to subscription page');
            toast({
              title: "Monthly Story Limit Reached",
              description: `You've used all ${storiesUsedThisMonth} of your ${monthlyLimit} monthly stories. Upgrade for 10 stories per month!`,
              variant: "destructive",
            });
            navigate("/subscription?limitReached=true");
            return;
          }
        }
        
        // Check if mobile platform
        const isMobile = typeof window !== 'undefined' && 
          ((window as any).Capacitor?.getPlatform?.() === 'ios' || 
           (window as any).Capacitor?.getPlatform?.() === 'android' ||
           /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
        
        // Check if user wants to start fresh (from URL param)
        const forceNew = searchParams.get('new') === 'true';
        const resumeStoryId = searchParams.get('resume');
        
        // CRITICAL FIX: Check for resume FIRST before profile check
        // In new tabs, localStorage may not have the profile, but the database story does
        if (!forceNew && resumeStoryId) {
          console.log(`🎯 [Resume Priority] Loading specific story: ${resumeStoryId}`);
          const existingStory = await loadStoryByIdFromDatabase(resumeStoryId);
          
          if (existingStory && existingStory.scenes.length > 0) {
            const isActive = await verifyStoryIsActive(existingStory.id);
            if (isActive) {
              console.log(`📖 [Resume Priority] Story found and active: ${existingStory.id}`);
              console.log(`👤 [Resume Priority] Using embedded profile from story`);
              
              // Use the profile embedded in the story - this is the fix!
              recoverStorySession(existingStory.id, existingStory.scenes.length);
              setSavedStory(existingStory);
              setInitialStoryId(existingStory.id);
              setAllScenes(existingStory.scenes);
              setScene(existingStory.scenes[existingStory.currentSceneIndex || 0]);
              setSceneCount(existingStory.scenes.length);
              setProfile(existingStory.profile); // Use story's embedded profile!
              
              // Also save the profile to localStorage for future use
              if (existingStory.profile) {
                saveProfileToLocal(existingStory.profile);
              }
              
              const savedInventory = loadInventory();
              setInventory(savedInventory);
              
              if (existingStory.profile.mode === 'learning') {
                initializeLearningSession(existingStory.profile);
              }
              
              setLoading(false);
              return;
            } else {
              console.warn('⚠️ [Resume Priority] Story no longer active/paused, checking status...');
              // Story exists but is completed - redirect to dashboard with message
              toast({
                title: "Story Already Completed",
                description: "This adventure has already been completed. Choose another story or start a new one.",
              });
              navigate('/dashboard');
              return;
            }
          } else {
            console.warn('⚠️ [Resume Priority] Story not found in database:', resumeStoryId);
            toast({
              title: "Story Not Found",
              description: "The story you're trying to continue could not be found.",
              variant: "destructive",
            });
            navigate('/dashboard');
            return;
          }
        }
        
        // Now check for profile (only needed for new stories or non-resume flows)
        let savedProfile = await loadProfile();
        if (!savedProfile) {
          console.log('👤 No profile in localStorage, redirecting to profile setup');
          navigate("/profile");
          return;
        }
        setProfile(savedProfile);
        
        // SAFEGUARD: Double-check user intent when forceNew is true
        if (forceNew) {
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
        
        // Skip loading existing story if forcing new story
        if (!forceNew) {
          // Load the most recent active story (no resume param at this point)
          const existingStory = await loadCurrentStoryFromDatabase();
          
          if (existingStory && existingStory.scenes.length > 0) {
            const isActive = await verifyStoryIsActive(existingStory.id);
            if (isActive) {
              console.log(`📖 Resuming most recent story: ${existingStory.id}`);
              recoverStorySession(existingStory.id, existingStory.scenes.length);
              setSavedStory(existingStory);
              setInitialStoryId(existingStory.id);
              setAllScenes(existingStory.scenes);
              setScene(existingStory.scenes[existingStory.currentSceneIndex || 0]);
              setSceneCount(existingStory.scenes.length);
              setProfile(existingStory.profile);
              
              const savedInventory = loadInventory();
              setInventory(savedInventory);
              
              if (existingStory.profile.mode === 'learning') {
                initializeLearningSession(existingStory.profile);
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
          const clearedCount = await clearAllActiveStoriesForUser();
          console.log(`✅ Cleared ${clearedCount} active stories`);
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

        // Check story limit
        {
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
        
        // Phase 3: Use forceNewSession flag for explicit new story, pass abilities
        const abilityCategories = availableAbilities.map(a => a.category);
        const { parsed, text, deviceFingerprint } = await generateNextScene(profileWithInventory, undefined, false, 1800, 1, newStoryId, true, abilityCategories);
        if (!parsed) {
          const errorPreview = text ? text.slice(0, 140) : "No response received";
          throw new Error("Invalid AI response: " + errorPreview);
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
        const savedData = await saveStoryToDatabase(newStory, deviceFingerprint);
        if (savedData && savedData.id !== newStoryId) {
          console.error('❌ Story ID mismatch after save!');
          throw new Error('Story save verification failed');
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
    
    // Only run init if not already complete AND abilities are loaded
    if (!initComplete && abilitiesLoaded) {
      init();
    }
  }, [user, navigate, searchParams, initComplete, abilitiesLoaded]);

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

  // ABILITIES DISABLED - Handler to unlock abilities instantly
  // const handleUnlockAbility = () => {
  //   console.log('🎯 handleUnlockAbility called', { profile, savedStory, badges: profile?.selectedBadges });
  //   
  //   if (!profile || !savedStory) {
  //     console.error('❌ Missing profile or savedStory', { profile, savedStory });
  //     return;
  //   }
  //
  //   const badge = profile.selectedBadges?.[0];
  //   if (!badge) {
  //     console.error('❌ No badge found', { selectedBadges: profile.selectedBadges });
  //     return;
  //   }
  //
  //   // Map badge to ability details
  //   const abilityMapping: Record<string, { name: string; description: string; category: AbilityCategory; icon: string }> = {
  //     'detective': {
  //       name: 'Master Detective',
  //       description: 'Your keen observation skills unlock hidden clues and reveal secrets others miss',
  //       category: 'detective',
  //       icon: 'search'
  //     },
  //     'action': {
  //       name: 'Combat Expert',
  //       description: 'Years of training allow you to face any threat with confidence and skill',
  //       category: 'combat',
  //       icon: 'sword'
  //     },
  //     'social': {
  //       name: 'Master Diplomat',
  //       description: 'Your words can sway even the hardest hearts and resolve conflicts peacefully',
  //       category: 'diplomacy',
  //       icon: 'users'
  //     },
  //     'mystic': {
  //       name: 'Arcane Master',
  //       description: 'You command powerful magical forces and understand mystical energies',
  //       category: 'magic',
  //       icon: 'wand'
  //     },
  //     'beast': {
  //       name: 'Wilderness Expert',
  //       description: 'You can survive and thrive in any environment, bonding with nature itself',
  //       category: 'survival',
  //       icon: 'leaf'
  //     },
  //     'creative': {
  //       name: 'Creative Genius',
  //       description: 'Your imagination finds unique solutions that others would never consider',
  //       category: 'creativity',
  //       icon: 'lightbulb'
  //     }
  //   };
  //
  //   const abilityInfo = abilityMapping[badge];
  //   if (!abilityInfo) {
  //     console.error('❌ No ability info for badge', { badge });
  //     return;
  //   }
  //
  //   console.log('✅ Awarding ability', abilityInfo);
  //
  //   // Award the ability
  //   const newAbility = awardAbility(
  //     abilityInfo.name,
  //     abilityInfo.description,
  //     abilityInfo.category,
  //     'Current Adventure',
  //     abilityInfo.icon
  //   );
  //
  //   console.log('✅ Ability awarded', newAbility);
  //
  //   // Update available abilities state
  //   const updatedAbilities = getAvailableAbilities();
  //   console.log('✅ Updated abilities', updatedAbilities);
  //   setAvailableAbilities(updatedAbilities);
  //
  //   // Show success toast with ability details
  //   toast({
  //     title: "🎉 Ability Unlocked!",
  //     description: (
  //       <AbilityToast ability={newAbility} />
  //     ),
  //     duration: 8000,
  //   });
  //
  //   // Trigger confetti celebration
  //   confetti({
  //     particleCount: 150,
  //     spread: 100,
  //     origin: { y: 0.6 },
  //     colors: ['#a855f7', '#ec4899', '#8b5cf6']
  //   });
  // };
  const handleUnlockAbility = () => {}; // Placeholder for disabled abilities

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

    // Learning mode challenges are now embedded directly in the AI-generated story
    // rather than using static hardcoded challenges that may be unrelated to the topic

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
      
      // Phase 1 & 2: Pass story ID for validation, no forceNewSession, pass abilities
      // Include memory context so AI can reference past decisions
      const abilityCategories = availableAbilities.map(a => a.category);
      const sceneWithMemory = { ...scene, selectedChoiceId: choiceId, memory: storyMemory };
      const { parsed, text } = await generateNextScene(profileWithInventory, sceneWithMemory, false, 1200, nextSceneCount, savedStory.id, false, abilityCategories);
      if (!parsed) {
        const errorPreview = text ? text.slice(0, 140) : "No response received";
        throw new Error("Invalid AI response: " + errorPreview);
      }
      
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
      
      // Update story memory from AI response
      if ((parsed as any).memory) {
        const mem = (parsed as any).memory;
        setStoryMemory(prev => ({
          flags: [...new Set([...prev.flags, ...(mem.flags || [])])].slice(-7),
          pastChoices: [...prev.pastChoices, ...(mem.pastChoices || [])].slice(-10),
        }));
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
      const savedData = await saveStoryToDatabase(updatedStory);
      if (savedData && savedData.id !== savedStory.id) {
        console.error('❌ Story ID changed during save!');
        throw new Error('Story integrity compromised');
      }

      // Track per-scene reading for parent dashboard
      if (user) {
        trackSceneReading(
          savedStory.id,
          allScenes[0]?.sceneTitle || parsed.sceneTitle || "Adventure",
          parsed
        ).catch(err => console.error('Scene tracking error:', err));
      }

      if (parsed.end) {
        // Don't auto-complete, just mark that the story is ready to finish
        setStoryReadyToFinish(true);
      }
      
    } catch (error: any) {
      console.error("Error in onChoose:", error);
      
      // Determine specific error message
      let errorDescription = "Failed to continue story. Please try again.";
      
      if (error.message?.includes("authentication") || error.message?.includes("Not authenticated")) {
        errorDescription = "Authentication error. Please try refreshing the page.";
      } else if (error.message?.includes("Rate limit")) {
        errorDescription = "Too many requests. Please wait a moment and try again.";
      } else if (error.message?.includes("Story session corrupted") || error.message?.includes("Story session lost")) {
        errorDescription = "Your story session was interrupted. Please start a new adventure.";
      } else if (error.message?.includes("Invalid AI response")) {
        errorDescription = "The story generator had trouble. Please try again.";
      } else if (error.message?.includes("Edge Function") || error.message?.includes("service")) {
        errorDescription = "Story service temporarily unavailable. Please try again in a moment.";
      }
      
      toast({
        title: "Story Error",
        description: errorDescription,
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
    
    saveStoryToDatabase(updatedStory);
    
    toast({
      title: "Went back to previous scene",
      description: `Go-backs remaining: ${5 - goBacksUsed - 1}`,
      duration: 3000,
    });
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(250,50%,12%)] via-[hsl(230,50%,10%)] to-[hsl(260,50%,8%)]" />
    );
  }

  const backgroundImage = getBackgroundForBadge(profile.selectedBadges);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(250,50%,12%)] via-[hsl(230,50%,10%)] to-[hsl(260,50%,8%)] flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Wand2 className="h-8 w-8 text-white/60 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Preparing Your Adventure</h2>
            <p className="text-white/50">StoryMaster Kids is weaving your tale...</p>
            {profile.mode === 'learning' && (
              <p className="text-white/40">🎓 Setting up interactive learning experience...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (storyLimitReached) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(250,50%,12%)] via-[hsl(230,50%,10%)] to-[hsl(260,50%,8%)] flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 max-w-md text-center space-y-4">
          <Timer className="h-16 w-16 text-yellow-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Monthly Adventure Limit Reached</h2>
          <button onClick={() => navigate('/')} className="bg-gradient-to-r from-[hsl(265,85%,60%)] to-[hsl(195,85%,55%)] text-white px-6 py-3 rounded-lg font-semibold transition-colors">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(250,50%,12%)] via-[hsl(230,50%,10%)] to-[hsl(260,50%,8%)] flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 max-w-md text-center space-y-4">
          <RefreshCw className="h-16 w-16 text-red-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Oops! Something went wrong</h2>
          <p className="text-white/50 text-sm">{error}</p>
          <button onClick={() => navigate('/')} className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-semibold transition-colors w-full">
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
      style={{ 
        backgroundImage: `url(${backgroundImage})`,
        paddingTop: isNative ? safeAreaInsets.top : 0,
        paddingBottom: isNative ? safeAreaInsets.bottom : 0,
      }}
    >
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header - Responsive */}
        <div className="bg-black/30 backdrop-blur-sm border-b border-white/20 p-2 md:p-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center gap-2">
            {/* Left section */}
            <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
              {/* Back button for mobile */}
              {isPhone && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
                >
                  <Home className="h-5 w-5 text-white" />
                </button>
              )}
              <h1 className={cn(
                "font-bold text-white flex items-center gap-1 md:gap-2",
                isPhone ? "text-sm leading-tight" : "text-2xl"
              )}>
                {getIconForBadge(profile.selectedBadges?.[0] || "mystic", isPhone ? "h-4 w-4 flex-shrink-0" : "h-6 w-6 flex-shrink-0")}
                <span className={cn(isPhone ? "line-clamp-2" : "truncate")}>{scene.sceneTitle}</span>
              </h1>
              {!isPhone && profile.mode === 'learning' && (
                <Badge variant="secondary" className="bg-blue-600/80 text-white flex-shrink-0">
                  <BookOpen className="h-3 w-3 mr-1" />
                  Learning Quest
                </Badge>
              )}
            </div>
            
            {/* Right section */}
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              {!isPhone && profile.mode === 'learning' && learningSession && (
                <button
                  onClick={() => setShowLearningProgress(!showLearningProgress)}
                  className="flex items-center gap-2 bg-blue-600/80 hover:bg-blue-700/80 text-white px-3 py-2 rounded-lg transition-colors"
                >
                  <Trophy className="h-4 w-4" />
                  Score: {calculateLearningScore(learningSession)}%
                </button>
              )}
              <div className={cn(
                "text-white font-medium bg-white/10 px-2 py-1 rounded",
                isPhone ? "text-xs" : "text-sm"
              )}>
                Scene {sceneCount}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Responsive Grid */}
        <div className="flex-1 p-2 md:p-4 overflow-y-auto">
          {/* Phone: Single column, Tablet: 2 columns (2fr+1fr), Desktop: 3 columns */}
          <div className="max-w-6xl mx-auto gap-4 md:gap-6 flex flex-col tablet:grid tablet:grid-cols-[2fr_1fr] lg:grid-cols-3">
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
                    
                    {/* ABILITIES DISABLED - Uncomment to re-enable */}
                    {/* <Tooltip>
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
                          <p className="font-semibold mb-2">✨ Secret Abilities: {availableAbilities.length}</p>
                          {availableAbilities.length > 0 ? (
                            <>
                              <p className="mb-2">Unlock Secret Choices with these abilities:</p>
                              <ul className="text-sm space-y-1">
                                {availableAbilities.slice(0, 3).map(ability => (
                                  <li key={ability.id}>• {ability.name}</li>
                                ))}
                                {availableAbilities.length > 3 && <li className="text-muted-foreground">...and {availableAbilities.length - 3} more</li>}
                              </ul>
                            </>
                          ) : (
                            <p>Complete stories with your chosen badges to unlock powerful abilities that enable Secret Choices!</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip> */}
                  </div>
                </TooltipProvider>
              </div>

              {/* Narrative */}
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
              {(profile.mode === 'comedy' || profile.mode === 'mystery' || profile.mode === 'explore' || profile.mode === 'thrill') && (
                  <div className="flex justify-end mb-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              onClick={handleReadToMe}
                              disabled={audioLoading || !userPlan?.features?.read_to_me || hasUsedReadToMe}
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
                        {!userPlan?.features?.read_to_me ? (
                          <TooltipContent>
                            <p>Only Available for Adventure Pass Plus</p>
                          </TooltipContent>
                        ) : hasUsedReadToMe ? (
                          <TooltipContent>
                            <p>Already used on this scene</p>
                          </TooltipContent>
                        ) : null}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
                <div className="prose prose-invert max-w-none tablet:max-w-prose tablet:mx-auto">
                  {scene.narrative.split('\n\n').map((paragraph, index) => (
                    <p
                      key={`${sceneCount}-${index}`}
                      className="text-white mb-4 leading-relaxed text-lg animate-fade-in"
                      style={{ animationDelay: `${index * 150}ms`, animationFillMode: 'both' }}
                    >
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
                          className={`p-4 rounded-lg text-left transition-all transform hover:scale-[1.02] relative animate-fade-in ${
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
                      {!savedStory?.quizTaken && " Take the comprehension challenge for Bonus Points, or "}
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
                                Do Challenge for Bonus Points
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
                              const { newAchievements, characterProgress, newAbilities } = await markStoryCompleted(
                                profile, 
                                actualChoicesMade,
                                {
                                  quizScore: savedStory?.quizScore,
                                  scenes: allScenes
                                }
                              );
                              
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
                                // ABILITIES DISABLED - Uncomment to re-enable
                                // const abilityStartDelay = (characterProgress?.leveledUp ? 3500 : 2000) + 
                                //   (newAchievements?.length || 0) * 2000;
                                // 
                                // // Update available abilities state
                                // const updatedAbilities = getAvailableAbilities();
                                // setAvailableAbilities(updatedAbilities);
                                // 
                                // newAbilities.forEach((ability, index) => {
                                //   setTimeout(() => {
                                //     confetti({
                                //       particleCount: 100,
                                //       spread: 70,
                                //       origin: { y: 0.6 }
                                //     });
                                //     toast({
                                //       title: `✨ New Ability Unlocked!`,
                                //       description: <AbilityToast ability={ability} />,
                                //       duration: 8000,
                                //     });
                                //   }, abilityStartDelay + (index * 2500));
                                // });
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
              {/* ABILITIES DISABLED - Uncomment to re-enable */}
              {/* <AbilityProgressIndicator 
                choicesMade={savedStory?.choicesMade || 0}
                selectedBadges={profile.selectedBadges}
                availableAbilitiesCount={availableAbilities.length}
                onUnlockAbility={handleUnlockAbility}
              /> */}

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
                      await saveStoryToDatabase(updatedStory);
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
                  onClick={async () => {
                    // CRITICAL FIX: Pause the story before navigating away
                    if (savedStory?.id) {
                      try {
                        console.log(`⏸️ Pausing story ${savedStory.id} before exit...`);
                        await pauseStoryInDatabase(savedStory.id);
                        console.log(`✅ Story ${savedStory.id} paused successfully`);
                      } catch (error) {
                        console.error('Error pausing story:', error);
                        // Still navigate even if pause fails - story is saved
                      }
                    }
                    navigate('/dashboard');
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Save & Exit
                </button>
          </div>
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
  );
};

export default Mission;