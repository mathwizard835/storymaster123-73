import { useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getCompletedStories } from "@/lib/story";
import { loadAchievements, ALL_ACHIEVEMENTS } from "@/lib/achievements";
import { loadCharacter } from "@/lib/character";
import { loadAbilities } from "@/lib/abilities";
import { loadRecentStoriesFromDatabase, loadCurrentStoryFromDatabase, DatabaseStory } from "@/lib/databaseStory";
import { ArrowLeft, Trophy, BookOpen, Star, Crown, Zap, Plus, TrendingUp, Play, Sparkles, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { PremiumThemeSelector } from "@/components/PremiumThemeSelector";
import { getUserSubscription } from "@/lib/subscription";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [progress, setProgress] = useState(loadAchievements());
  const [character, setCharacter] = useState(loadCharacter());
  const [abilities, setAbilities] = useState(loadAbilities());
  const completedStories = getCompletedStories();
  const [recentStories, setRecentStories] = useState<DatabaseStory[]>([]);
  const [hasActiveStory, setHasActiveStory] = useState(false);
  const [showNewStoryDialog, setShowNewStoryDialog] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  
  // Refresh data when component mounts
  useEffect(() => {
    const loadData = async () => {
      if (user) {
        try {
          // Check premium status
          const { plan } = await getUserSubscription();
          setIsPremium(plan?.name === "premium" || plan?.name === "premium_plus");

          // Check if we need to sync from database
          const { needsSync, syncProgressFromDatabase } = await import('@/lib/syncProgress');
          const shouldSync = await needsSync();
          
          if (shouldSync) {
            console.log('🔄 Syncing progress from database...');
            toast({
              title: "Restoring Your Progress",
              description: "Loading your achievements and stories from the cloud...",
            });
            
            await syncProgressFromDatabase();
            
            toast({
              title: "Progress Restored!",
              description: "Your achievements and stats have been synced.",
            });
          }
          
          // Load recent stories from database
          const stories = await loadRecentStoriesFromDatabase();
          setRecentStories(stories);
          
          // Check if there's an active story
          const activeStory = await loadCurrentStoryFromDatabase();
          setHasActiveStory(!!activeStory && activeStory.scenes.length > 0);
        } catch (e) {
          console.error('Failed to load stories:', e);
          toast({
            title: "Error Loading Data",
            description: "Failed to sync your progress. Please refresh the page.",
            variant: "destructive",
          });
        }
      }
      
      // Always load from localStorage (may have been updated by sync)
      setProgress(loadAchievements());
      setCharacter(loadCharacter());
      setAbilities(loadAbilities());
    };
    
    loadData();
  }, [user, toast]);

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  const getBadgeColor = (badge: string) => {
    const colors: Record<string, string> = {
      mystic: 'bg-purple-100 text-purple-800',
      beast: 'bg-green-100 text-green-800',
      detective: 'bg-blue-100 text-blue-800',
      action: 'bg-red-100 text-red-800',
      social: 'bg-amber-100 text-amber-800',
      creative: 'bg-pink-100 text-pink-800',
      space: 'bg-cyan-100 text-cyan-800',
    };
    return colors[badge] || 'bg-gray-100 text-gray-800';
  };

  const getAbilityCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      detective: 'from-blue-500 to-cyan-500',
      combat: 'from-red-500 to-orange-500',
      diplomacy: 'from-green-500 to-emerald-500',
      magic: 'from-purple-500 to-pink-500',
      survival: 'from-yellow-500 to-amber-500',
      creativity: 'from-indigo-500 to-violet-500',
      leadership: 'from-yellow-600 to-orange-600',
    };
    return colors[category] || 'from-gray-500 to-slate-500';
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'bg-gray-100 text-gray-800';
      case 'rare':
        return 'bg-blue-100 text-blue-800';
      case 'epic':
        return 'bg-purple-100 text-purple-800';
      case 'legendary':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const unlockedAchievements = progress.achievements;
  const completionRate = Math.round((unlockedAchievements.length / ALL_ACHIEVEMENTS.length) * 100);
  
  // Get recent achievements (within last 24 hours)
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  const recentAchievements = unlockedAchievements
    .filter(achievement => {
      const unlockTime = new Date(achievement.unlockedAt || 0).getTime();
      return unlockTime > oneDayAgo;
    })
    .slice(0, 3); // Show max 3 recent achievements

  // Get available and used abilities
  const availableAbilities = abilities.abilities.filter(a => !a.used);
  const usedAbilities = abilities.abilities.filter(a => a.used);

  return (
    <>
      <Seo
        title="StoryMaster Quest – Dashboard"
        description="View your story progress, achievements, and character stats."
        canonical="/dashboard"
      />
      
      <main className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
              <Button 
                onClick={() => navigate("/subscription")}
                className={`flex items-center gap-2 ${
                  isPremium 
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 shadow-lg shadow-amber-500/50 hover:shadow-amber-500/70" 
                    : "bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70"
                } text-white transition-all duration-300 hover:scale-105 font-semibold`}
              >
                <Crown className="h-5 w-5" />
                {isPremium ? "Premium Member ✨" : "Upgrade to Premium"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate("/parent-dashboard")}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Heart className="h-4 w-4" />
                Parent Mode
              </Button>
              <Button 
                onClick={() => navigate("/mission")}
                variant="hero"
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Continue Your Quest
              </Button>
              <Button 
                onClick={async () => {
                  const { getStoriesRemaining } = await import('@/lib/subscription');
                  const { canPlay } = await getStoriesRemaining();
                  if (!canPlay) {
                    navigate("/subscription");
                  } else if (hasActiveStory) {
                    setShowNewStoryDialog(true);
                  } else {
                    navigate("/profile?new=true");
                  }
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Adventure
              </Button>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-heading text-3xl md:text-4xl font-extrabold">
                🎮 Adventure Dashboard
              </h1>
              {isPremium && (
                <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 shadow-lg shadow-amber-500/30 px-3 py-1 text-sm font-semibold">
                  <Crown className="h-3.5 w-3.5 mr-1" />
                  PREMIUM
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-2">
              {isPremium ? "Enjoying your premium experience with custom themes!" : "Your stories, achievements, and progress"}
            </p>
          </div>

          {/* Premium Theme Selector */}
          <div className="mb-8">
            <PremiumThemeSelector />
          </div>

          {/* Character Stats */}
          <Card className="glass-panel border-0 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Character Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 tablet:grid-cols-3 lg:grid-cols-5 gap-6">
                <div>
                  <div className="text-2xl font-bold flex items-center gap-1">
                    <Crown className="h-6 w-6 text-amber-500" />
                    {character.level}
                  </div>
                  <div className="text-sm text-muted-foreground">Level</div>
                </div>
                <div>
                  <div className="text-2xl font-bold flex items-center gap-1">
                    <Zap className="h-6 w-6 text-blue-500" />
                    {character.totalExperienceEarned}
                  </div>
                  <div className="text-sm text-muted-foreground">Total XP Earned</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{progress.totalStories}</div>
                  <div className="text-sm text-muted-foreground">Stories Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{progress.totalChoices}</div>
                  <div className="text-sm text-muted-foreground">Choices Made</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{completionRate}%</div>
                  <div className="text-sm text-muted-foreground">Achievement Rate</div>
                </div>
                <div>
                  <div className="text-2xl font-bold flex items-center gap-1">
                    <Sparkles className="h-6 w-6 text-purple-500" />
                    {availableAbilities.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Abilities Ready</div>
                </div>
              </div>
              
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>Experience Progress to Level {character.level + 1}</span>
                  <span>{character.experience} / {character.experienceToNext}</span>
                </div>
                <Progress 
                  value={(character.experience / character.experienceToNext) * 100} 
                  className="h-3"
                />
              </div>
            </CardContent>
          </Card>

          {/* Abilities Section - Enhanced Showcase */}
          {abilities.abilities.length > 0 && (
            <Card className="relative overflow-hidden border-0 mb-8 bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-purple-900/20 backdrop-blur-sm">
              {/* Animated background effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5 animate-pulse" />
              
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="relative">
                        <Sparkles className="h-7 w-7 text-purple-400 animate-pulse" />
                        <Sparkles className="h-4 w-4 text-pink-400 absolute -top-1 -right-1 animate-pulse" style={{ animationDelay: '0.5s' }} />
                      </div>
                      Ultra Abilities
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Earned through excellence: master comprehension, strategic thinking, and heroic choices
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      {abilities.abilities.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Earned</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                {availableAbilities.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-400 animate-pulse" />
                        Ready for Action
                      </h3>
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                        {availableAbilities.length} Available
                      </Badge>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {availableAbilities.map((ability) => (
                        <div 
                          key={ability.id}
                          className="group relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-background/95 to-background/80 backdrop-blur-sm p-5 hover:border-purple-500/60 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 hover:scale-105"
                        >
                          {/* Shine effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                          
                          <div className="relative">
                            <div className="flex items-start gap-4 mb-3">
                              <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${getAbilityCategoryColor(ability.category)} flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform`}>
                                <Sparkles className="h-7 w-7 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-base mb-1 text-foreground">{ability.name}</h4>
                                <Badge variant="outline" className="text-xs capitalize font-medium border-purple-500/30 text-purple-300">
                                  {ability.category}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                              {ability.description}
                            </p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/30">
                              <span>From: {ability.storySource}</span>
                              <span className="flex items-center gap-1 text-green-400">
                                <Crown className="h-3 w-3" />
                                Active
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {usedAbilities.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-sm flex items-center gap-2 text-muted-foreground">
                        <span className="inline-block w-2 h-2 rounded-full bg-muted" />
                        Previously Used
                      </h3>
                      <Badge variant="outline" className="text-muted-foreground">
                        {usedAbilities.length} Consumed
                      </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {usedAbilities.map((ability) => (
                        <div 
                          key={ability.id}
                          className="relative overflow-hidden rounded-lg border border-border/30 bg-muted/20 backdrop-blur-sm p-3 opacity-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${getAbilityCategoryColor(ability.category)} flex items-center justify-center opacity-40`}>
                              <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-xs mb-1 truncate">{ability.name}</h4>
                              <Badge variant="outline" className="text-xs capitalize opacity-60">
                                {ability.category}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-8 tablet-lg:grid-cols-2 lg:grid-cols-2">
            {/* Recent Stories */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-2xl font-bold flex items-center gap-2">
                  <BookOpen className="h-6 w-6 text-blue-500" />
                  Recent Stories ({recentStories.length + completedStories.length})
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate("/gallery")}
                >
                  View All
                </Button>
              </div>
              
              {recentStories.length === 0 && completedStories.length === 0 ? (
                <Card className="glass-panel border-0 p-8 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No stories yet</p>
                  <Button 
                    onClick={() => navigate("/profile?new=true")}
                    variant="outline"
                  >
                    Start Your First Adventure
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Show database stories (both in-progress and completed) */}
                  {recentStories.slice(0, 3).map((story) => (
                    <Card key={story.id} className="glass-panel border-0">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg truncate flex-1 mr-4">{story.title || 'Untitled Adventure'}</h3>
                          <div className="flex items-center gap-2">
                            {story.status === 'active' || story.status === 'paused' ? (
                              <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100">
                                In Progress
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                Completed
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {story.profile.selectedBadges.slice(0, 2).map((badge) => (
                            <Badge 
                              key={badge} 
                              className={getBadgeColor(badge)}
                              variant="secondary"
                            >
                              {badge}
                            </Badge>
                          ))}
                          {story.profile.selectedBadges.length > 2 && (
                            <Badge variant="secondary">
                              +{story.profile.selectedBadges.length - 2}
                            </Badge>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            {story.status === 'active' || story.status === 'paused' ? (
                              <span>Scene {story.current_scene_index + 1} of {story.scene_count}</span>
                            ) : (
                              <>
                                <span>{story.scene_count} scenes</span>
                                <span>{formatDate(story.completed_at || story.last_played_at)}</span>
                              </>
                            )}
                          </div>
                          {(story.status === 'active' || story.status === 'paused') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate("/mission")}
                              className="flex items-center gap-1"
                            >
                              <Play className="h-3 w-3" />
                              Continue
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {/* Show local storage completed stories if database doesn't have them */}
                  {recentStories.length < 3 && completedStories.slice(0, 3 - recentStories.length).map((story) => (
                    <Card key={story.id} className="glass-panel border-0">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg truncate flex-1 mr-4">{story.title}</h3>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            Completed
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {story.profile.selectedBadges.slice(0, 2).map((badge) => (
                            <Badge 
                              key={badge} 
                              className={getBadgeColor(badge)}
                              variant="secondary"
                            >
                              {badge}
                            </Badge>
                          ))}
                          {story.profile.selectedBadges.length > 2 && (
                            <Badge variant="secondary">
                              +{story.profile.selectedBadges.length - 2}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{story.sceneCount} scenes</span>
                          <span>{formatDate(story.completedAt)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Recent Achievements */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-2xl font-bold flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-amber-500" />
                  Achievements ({unlockedAchievements.length})
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate("/achievements")}
                >
                  View All
                </Button>
              </div>
              
              {/* Recent Achievements */}
              {recentAchievements.length > 0 && (
                <Card className="glass-panel border-0 mb-4 bg-gradient-to-r from-amber-50/50 to-yellow-50/50 dark:from-amber-900/20 dark:to-yellow-900/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-amber-500" />
                      Recently Unlocked!
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {recentAchievements.map((achievement) => (
                        <div key={achievement.id} className="flex items-center gap-3 p-2 bg-white/60 dark:bg-black/20 rounded-lg">
                          <div className="text-xl">{achievement.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{achievement.name}</div>
                            <Badge className={getRarityColor(achievement.rarity)} variant="secondary">
                              {achievement.rarity}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {unlockedAchievements.length === 0 ? (
                <Card className="glass-panel border-0 p-8 text-center">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No achievements yet</p>
                  <Button 
                    onClick={() => navigate("/profile")}
                    variant="outline"
                  >
                    Start Your First Adventure
                  </Button>
                </Card>
              ) : (
                <div className="space-y-3">
                  {unlockedAchievements.slice(0, 4).map((achievement) => (
                    <Card key={achievement.id} className="glass-panel border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{achievement.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{achievement.name}</div>
                            <div className="text-sm text-muted-foreground truncate">{achievement.description}</div>
                            <Badge className={getRarityColor(achievement.rarity)} variant="secondary">
                              {achievement.rarity}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
      
      {/* New Story Confirmation Dialog */}
      <Dialog open={showNewStoryDialog} onOpenChange={setShowNewStoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start New Adventure?</DialogTitle>
            <DialogDescription>
              You have an adventure in progress. Starting a new one will save your current progress and begin a fresh story.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowNewStoryDialog(false)}
              className="flex-1"
            >
              Cancel
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
    </>
  );
};

export default Dashboard;