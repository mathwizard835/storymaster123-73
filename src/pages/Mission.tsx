import mysticMageBg from "@/assets/mystic-mage-bg.jpg";
import beastMasterBg from "@/assets/beast-master-bg.jpg";
import detectiveBg from "@/assets/detective-bg.jpg";
import actionHeroBg from "@/assets/action-hero-bg.jpg";
import socialChampionBg from "@/assets/social-champion-bg.jpg";
import creativeGeniusBg from "@/assets/creative-genius-bg.jpg";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Zap, Timer, Star, Heart, Shield, Eye, Wand2, PawPrint, Crosshair, Users, Palette, RefreshCw, Play, BookOpen, Trophy, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { generateNextScene, loadProfile, checkStoryLimit, markStoryCompleted, type Scene, saveCurrentStory, loadCurrentStory, clearCurrentStory, saveCompletedStory, type SavedStory, type InventoryItem, saveProfileToLocal } from "@/lib/story";
import { saveStoryToDatabase, loadCurrentStoryFromDatabase, clearCurrentStoryInDatabase } from "@/lib/databaseStory";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storyLimitReached, setStoryLimitReached] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  // Learning system state
  const [learningSession, setLearningSession] = useState<LearningSession | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<LearningChallenge | null>(null);
  const [showLearningProgress, setShowLearningProgress] = useState(false);
  
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

  useEffect(() => {
    const init = async () => {
      try {
        // Check if this is a trial and if trial is already used
        if (isTrialMode && !user) {
          const trialUsed = localStorage.getItem('trial_story_used');
          if (trialUsed) {
            navigate("/auth");
            return;
          }
        }
        
        let savedProfile;
        
        if (isTrialMode && !user) {
          // Create a basic trial profile
          savedProfile = {
            name: "Guest Hero",
            age: 12,
            characterType: "action-hero",
            interests: ["adventure"],
            mode: "story"
          };
          setProfile(savedProfile);
        } else {
          savedProfile = loadProfile();
          if (!savedProfile) {
            navigate("/profile");
            return;
          }
          setProfile(savedProfile);
        }

        // Check if user wants to start fresh (from URL param)
        const forceNew = searchParams.get('new') === 'true';
        
        // Skip loading existing story for trial mode or if forcing new story
        if (!isTrialMode && !forceNew) {
          const existingStory = await loadCurrentStoryFromDatabase();
          if (existingStory && existingStory.scenes.length > 0) {
            setSavedStory(existingStory);
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
          }
        }
        
        // If forcing new story, clear any existing story first
        if (forceNew) {
          try {
            const existingStory = await loadCurrentStoryFromDatabase();
            if (existingStory) {
              await clearCurrentStoryInDatabase(existingStory.id);
            }
            clearInventory();
          } catch (e) {
            console.log('No existing story to clear');
          }
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

        const savedInventory = loadInventory();
        setInventory(savedInventory);

        if (savedProfile.mode === 'learning') {
          initializeLearningSession(savedProfile);
        }

        const profileWithInventory = updateProfileInventory(savedProfile, savedInventory);
        
        const { parsed, text } = await generateNextScene(profileWithInventory, undefined, false, 1800, 1);
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
          id: crypto.randomUUID(),
          profile: profileWithInventory,
          scenes: [parsed],
          currentSceneIndex: 0,
          startedAt: new Date().toISOString(),
          lastPlayedAt: new Date().toISOString(),
          completed: false,
        };
        setSavedStory(newStory);
        
        // Only save to database if not in trial mode
        if (!isTrialMode) {
          await saveStoryToDatabase(newStory);
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

  const onChoose = async (choiceId: string) => {
    if (!profile || !scene || !savedStory) return;

    if (profile.mode === 'learning' && learningSession) {
      const availableChallenge = learningSession.challenges.find(
        c => !learningSession.completedChallenges.includes(c.id)
      );
      
      if (availableChallenge && Math.random() < 0.3) {
        setCurrentChallenge(availableChallenge);
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
      
      const { parsed, text } = await generateNextScene(profileWithInventory, { ...scene, selectedChoiceId: choiceId }, false, 1200, nextSceneCount);
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
      
      setScene(parsed);
      setAllScenes(prev => [...prev, parsed]);
      setSceneCount(nextSceneCount);

      const updatedStory: SavedStory = {
        ...savedStory,
        scenes: [...allScenes, parsed],
        currentSceneIndex: allScenes.length,
        lastPlayedAt: new Date().toISOString(),
      };
      setSavedStory(updatedStory);
      if (!isTrialMode) {
        await saveStoryToDatabase(updatedStory);
      }

      if (parsed.end) {
        // Mark trial as used if in trial mode
        if (isTrialMode && !user) {
          localStorage.setItem('trial_story_used', 'true');
          toast({
            title: "Trial Complete! 🎉",
            description: "Create your profile to continue your adventure!",
            variant: "default",
          });
          setTimeout(() => {
            navigate("/profile");
          }, 3000);
          return;
        }
        
        const { newAchievements, characterProgress } = await markStoryCompleted(profile, nextSceneCount);
        
        const completedStoryData = {
          id: updatedStory.id,
          title: scene.sceneTitle || "Untitled Adventure",
          completedAt: new Date().toISOString(),
          sceneCount: nextSceneCount,
          choicesMade: [],
          profile: updatedStory.profile,
        };
        
        saveCompletedStory(completedStoryData);
        await clearCurrentStoryInDatabase(updatedStory.id);
        clearInventory();
        setInventory([]);

        toast({
          title: "🎉 Adventure Complete!",
          description: `Amazing work! You completed your ${nextSceneCount}-scene adventure.`,
          duration: 8000,
        });

        setTimeout(() => navigate('/'), 3000);
      }
      
    } catch (error: any) {
      console.error("Error in onChoose:", error);
      setError(error.message ?? "Failed to continue story");
    }
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    <span className="text-white font-semibold">{scene.hud.energy}</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <Timer className="h-5 w-5 text-blue-400" />
                    <span className="text-white font-semibold">{scene.hud.time}</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <Star className="h-5 w-5 text-purple-400" />
                    <span className="text-white font-semibold">{scene.hud.choicePoints}</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <Heart className="h-5 w-5 text-red-400" />
                    <span className="text-white font-semibold text-sm">
                      {scene.hud.ui?.join(" • ") || "Ready"}
                    </span>
                  </div>
                </div>
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
              <div className="bg-black/50 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  What do you choose?
                </h3>
                <div className="grid gap-3">
                  {scene.choices.map((choice, index) => {
                    const validation = validateChoice(choice.id, scene, inventory);
                    return (
                      <button
                        key={choice.id}
                        onClick={() => onChoose(choice.id)}
                        disabled={!validation.valid}
                        className={`p-4 rounded-lg text-left transition-all transform hover:scale-[1.02] ${
                          validation.valid
                            ? 'bg-white/20 hover:bg-white/30 text-white border-2 border-transparent hover:border-white/30'
                            : 'bg-gray-600/50 text-gray-400 border-2 border-gray-500/50 cursor-not-allowed'
                        }`}
                      >
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
                            {!validation.valid && (
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
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Save & Exit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mission;