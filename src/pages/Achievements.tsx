import { useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { loadAchievements, ALL_ACHIEVEMENTS, type Achievement } from "@/lib/achievements";
import { loadCharacter } from "@/lib/character";
import { ArrowLeft, Trophy, Star, Lock, Crown, Zap, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useDevice } from "@/contexts/DeviceContext";
import { addHapticFeedback } from "@/lib/mobileFeatures";

const Achievements = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(loadAchievements());
  const [character, setCharacter] = useState(loadCharacter());
  const { isPhone, isNative } = useDevice();
  const backPath = isNative ? '/dashboard' : '/';
  
  // Refresh data when component mounts (in case returning from completed story)
  useEffect(() => {
    setProgress(loadAchievements());
    setCharacter(loadCharacter());
  }, []);

  const getRarityColor = (rarity: Achievement['rarity']) => {
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
  const lockedAchievements = ALL_ACHIEVEMENTS.filter(
    a => !unlockedAchievements.some(ua => ua.id === a.id)
  );

  const completionRate = Math.round((unlockedAchievements.length / ALL_ACHIEVEMENTS.length) * 100);
  
  // Sort achievements by unlock date (most recent first)
  const sortedUnlockedAchievements = [...unlockedAchievements].sort((a, b) => {
    const dateA = new Date(a.unlockedAt || 0).getTime();
    const dateB = new Date(b.unlockedAt || 0).getTime();
    return dateB - dateA;
  });
  
  // Get recently unlocked achievements (within last 24 hours)
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  const recentAchievements = sortedUnlockedAchievements.filter(achievement => {
    const unlockTime = new Date(achievement.unlockedAt || 0).getTime();
    return unlockTime > oneDayAgo;
  });

  return (
    <>
      <Seo
        title="StoryMaster Kids – Achievements"
        description="View your achievements and character progression."
        canonical="/achievements"
      />
      
      <main className="min-h-screen bg-background">
        <div className="container py-8 pb-24 md:pb-8">
          {/* Mobile Header */}
          {isPhone ? (
            <div className="flex items-center gap-3 mb-6">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => { addHapticFeedback('light'); navigate(backPath); }}
                className="h-10 w-10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-amber-500" />
                <h1 className="font-heading text-2xl font-extrabold">Achievements</h1>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate(backPath)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          )}

          {!isPhone && (
            <div className="mb-8">
            <h1 className="font-heading text-3xl md:text-4xl font-extrabold flex items-center gap-3">
              <Trophy className="h-8 w-8 text-amber-500" />
              Achievements
            </h1>
            <p className="text-muted-foreground mt-2">
              Your progress and accomplishments
            </p>
          </div>
          )}

          {/* Character Stats */}
          <Card className="glass-panel border-0 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Character Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-6">
                <div>
                  <div className="text-xl sm:text-2xl font-bold flex items-center gap-1">
                    <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
                    {character.level}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Level</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold flex items-center gap-1">
                    <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                    {character.experience}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">XP</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold">{progress.totalStories}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Stories Done</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold">{progress.totalChoices}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Choices Made</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold">{completionRate}%</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Achievement Rate</div>
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
              
              {character.titles.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">Current Titles:</div>
                  <div className="flex flex-wrap gap-2">
                    {character.titles.slice(-3).map((title, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Recent Achievements */}
          {recentAchievements.length > 0 && (
            <Card className="glass-panel border-0 mb-8 bg-gradient-to-r from-amber-50/50 to-yellow-50/50 dark:from-amber-900/20 dark:to-yellow-900/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-amber-500" />
                  Recently Unlocked!
                </CardTitle>
                <CardDescription>
                  Achievements earned in the last 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {recentAchievements.map((achievement) => (
                    <div key={achievement.id} className="flex items-center gap-3 p-3 bg-white/60 dark:bg-black/20 rounded-lg border border-amber-200/50">
                      <div className="text-2xl">{achievement.icon}</div>
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

          {/* Achievements Grid */}
          <div className="space-y-6">
            {/* Unlocked Achievements */}
            {unlockedAchievements.length > 0 && (
              <section>
                <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-amber-500" />
                  Unlocked ({unlockedAchievements.length})
                </h2>
                <div className="grid gap-4 tablet:grid-cols-2 tablet-lg:grid-cols-3 lg:grid-cols-3 auto-rows-fr">
                  {sortedUnlockedAchievements.map((achievement) => (
                    <Card key={achievement.id} className="glass-panel border-0">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="text-3xl">{achievement.icon}</div>
                          <Badge className={getRarityColor(achievement.rarity)} variant="secondary">
                            {achievement.rarity}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{achievement.name}</CardTitle>
                        <CardDescription>{achievement.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-xs text-muted-foreground">
                          Unlocked: {achievement.unlockedAt ? 
                            new Date(achievement.unlockedAt).toLocaleDateString() : 'Recently'
                          }
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Locked Achievements */}
            {lockedAchievements.length > 0 && (
              <section>
                <h2 className="font-heading text-2xl font-bold mb-4 flex items-center gap-2">
                  <Lock className="h-6 w-6 text-muted-foreground" />
                  Locked ({lockedAchievements.length})
                </h2>
                <div className="grid gap-4 tablet:grid-cols-2 tablet-lg:grid-cols-3 lg:grid-cols-3 auto-rows-fr">
                  {lockedAchievements.map((achievement) => (
                    <Card key={achievement.id} className="glass-panel border-0 opacity-60">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="text-3xl grayscale">{achievement.icon}</div>
                          <Badge className="bg-muted text-muted-foreground" variant="secondary">
                            {achievement.rarity}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg text-muted-foreground">{achievement.name}</CardTitle>
                        <CardDescription className="text-muted-foreground/80">
                          {achievement.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default Achievements;