import { useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getCompletedStories } from "@/lib/story";
import { loadAchievements, ALL_ACHIEVEMENTS } from "@/lib/achievements";
import { loadCharacter } from "@/lib/character";
import { ArrowLeft, Trophy, BookOpen, Star, Crown, Zap, Plus, TrendingUp, Play } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [progress, setProgress] = useState(loadAchievements());
  const [character, setCharacter] = useState(loadCharacter());
  const completedStories = getCompletedStories();
  
  // Refresh data when component mounts
  useEffect(() => {
    setProgress(loadAchievements());
    setCharacter(loadCharacter());
  }, []);

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
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate("/mission")}
                variant="hero"
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Continue Your Quest
              </Button>
              <Button 
                onClick={() => navigate("/profile")}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Adventure
              </Button>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="font-heading text-3xl md:text-4xl font-extrabold">
              🎮 Adventure Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Your stories, achievements, and progress
            </p>
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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
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
                    {character.experience}
                  </div>
                  <div className="text-sm text-muted-foreground">Experience Points</div>
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

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Recent Stories */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-2xl font-bold flex items-center gap-2">
                  <BookOpen className="h-6 w-6 text-blue-500" />
                  Recent Stories ({completedStories.length})
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate("/gallery")}
                >
                  View All
                </Button>
              </div>
              
              {completedStories.length === 0 ? (
                <Card className="glass-panel border-0 p-8 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No completed stories yet</p>
                  <Button 
                    onClick={() => navigate("/profile")}
                    variant="outline"
                  >
                    Start Your First Adventure
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {completedStories.slice(0, 3).map((story) => (
                    <Card key={story.id} className="glass-panel border-0">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg truncate flex-1 mr-4">{story.title}</h3>
                          <span className="text-sm text-muted-foreground">{formatDate(story.completedAt)}</span>
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
                          <span>{story.choicesMade.length} choices</span>
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
    </>
  );
};

export default Dashboard;