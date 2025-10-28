import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, Star, Heart, Lightbulb, Shield, Users, Sparkles, Target, TrendingUp, Award, BookOpen } from "lucide-react";
import { loadCharacter } from "@/lib/character";
import { loadAchievements } from "@/lib/achievements";
import { loadAbilities } from "@/lib/abilities";
import { loadCompletedStoriesFromDatabase } from "@/lib/databaseStory";
import { getStreakStats } from "@/lib/streaks";
import { Seo } from "@/components/Seo";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [character, setCharacter] = useState(loadCharacter());
  const [achievements, setAchievements] = useState(loadAchievements());
  const [abilities, setAbilities] = useState(loadAbilities());
  const [recentStories, setRecentStories] = useState<any[]>([]);
  const [streakStats, setStreakStats] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      const stories = await loadCompletedStoriesFromDatabase();
      const stats = await getStreakStats();
      setRecentStories(stories.slice(0, 5));
      setStreakStats(stats);
    };
    loadData();
  }, []);

  const getAttributeIcon = (attr: string) => {
    switch (attr) {
      case 'courage': return <Shield className="h-5 w-5" />;
      case 'wisdom': return <Lightbulb className="h-5 w-5" />;
      case 'creativity': return <Sparkles className="h-5 w-5" />;
      case 'leadership': return <Users className="h-5 w-5" />;
      case 'empathy': return <Heart className="h-5 w-5" />;
      default: return <Star className="h-5 w-5" />;
    }
  };

  const getAttributeLabel = (attr: string) => {
    return attr.charAt(0).toUpperCase() + attr.slice(1);
  };

  const getStoryMessage = (story: any) => {
    const name = story.profile?.name || "Your child";
    const badges = story.profile?.badges || [];
    const qualities: string[] = [];

    if (badges.includes('detective')) qualities.push('curiosity');
    if (badges.includes('action-hero')) qualities.push('bravery');
    if (badges.includes('creative-genius')) qualities.push('creativity');
    if (badges.includes('social-champion')) qualities.push('teamwork');
    if (badges.includes('mystic-mage')) qualities.push('wisdom');
    if (badges.includes('beast-master')) qualities.push('kindness');

    if (qualities.length === 0) qualities.push('imagination');

    const qualityText = qualities.slice(0, 3).join(', ');
    const mode = story.profile?.mode || 'adventure';
    const modeText = mode === 'educational' ? 'learned new concepts' : 'had an amazing adventure';

    return `${name} ${modeText}! They showed ${qualityText}.`;
  };

  const unlockedAchievements = achievements.achievements.filter(a => a.unlockedAt);

  const attributeData = Object.entries(character.attributes).map(([key, value]) => ({
    name: key,
    value: value as number,
    label: getAttributeLabel(key),
    icon: getAttributeIcon(key)
  }));

  const totalStories = achievements.totalStories;
  const totalChoices = achievements.totalChoices;

  return (
    <>
      <Seo 
        title="Parent Dashboard - StoryMaster Quest"
        description="View your child's learning journey, achievements, and emotional growth through interactive storytelling"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container max-w-6xl mx-auto p-4 md:p-8 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Adventure
            </Button>
          </div>

          {/* Welcome Section */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Heart className="h-10 w-10 text-rose-500" />
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">
                Parent Dashboard
              </h1>
              <Heart className="h-10 w-10 text-rose-500" />
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Celebrate your child's incredible journey of growth, learning, and imagination
            </p>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-2 border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-600" />
                  Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">{character.level}</div>
                <p className="text-xs text-muted-foreground mt-1">{character.titles[character.titles.length - 1] || 'Adventurer'}</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  Stories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">{totalStories}</div>
                <p className="text-xs text-muted-foreground mt-1">Adventures completed</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Award className="h-4 w-4 text-purple-600" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">{unlockedAchievements.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Badges earned</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-rose-200 dark:border-rose-900 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950 dark:to-pink-950">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-rose-600" />
                  Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-rose-700 dark:text-rose-400">{streakStats?.currentStreak || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Days of learning</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Adventures */}
          <Card className="border-2 border-amber-200 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-600" />
                Recent Adventures
              </CardTitle>
              <CardDescription>
                See what your child has been exploring lately
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentStories.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No adventures yet. Start your child's first story to see their progress here!
                </p>
              ) : (
                recentStories.map((story, index) => (
                  <div
                    key={story.id}
                    className="p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border border-amber-200 dark:border-amber-800"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                        <Trophy className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-foreground mb-2">
                          {getStoryMessage(story)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(story.profile?.badges || []).map((badge: string) => (
                            <Badge key={badge} variant="secondary" className="text-xs">
                              {badge.replace('-', ' ')}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(story.completed_at).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Emotional Growth */}
          <Card className="border-2 border-rose-200 dark:border-rose-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-rose-600" />
                Emotional & Social Growth
              </CardTitle>
              <CardDescription>
                Watch your child develop important life skills through storytelling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {attributeData.map((attr) => (
                <div key={attr.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-rose-600 dark:text-rose-400">
                        {attr.icon}
                      </div>
                      <span className="font-medium">{attr.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-sm">
                      {attr.value}/100
                    </Badge>
                  </div>
                  <Progress value={attr.value} className="h-3" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Ultra Abilities */}
          {abilities.abilities.length > 0 && (
            <Card className="border-2 border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Ultra Abilities Earned
                </CardTitle>
                <CardDescription>
                  Special skills unlocked through achievements and growth
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {abilities.abilities.map((ability) => (
                    <div
                      key={ability.id}
                      className={`p-4 rounded-lg border-2 ${
                        ability.used
                          ? 'bg-muted/30 border-muted'
                          : 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{ability.icon || '✨'}</div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{ability.name}</h4>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {ability.category}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-2">
                            {ability.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Achievement Gallery */}
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-blue-600" />
                Achievement Gallery
              </CardTitle>
              <CardDescription>
                A collection of your child's earned badges and milestones
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unlockedAchievements.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Complete stories to unlock achievements!
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {unlockedAchievements.map((achievement) => {
                    const rarityColors = {
                      common: 'from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border-gray-300 dark:border-gray-700',
                      rare: 'from-blue-100 to-cyan-200 dark:from-blue-900 dark:to-cyan-950 border-blue-300 dark:border-blue-700',
                      epic: 'from-purple-100 to-pink-200 dark:from-purple-900 dark:to-pink-950 border-purple-300 dark:border-purple-700',
                      legendary: 'from-amber-100 to-orange-200 dark:from-amber-900 dark:to-orange-950 border-amber-300 dark:border-amber-700'
                    };

                    return (
                      <div
                        key={achievement.id}
                        className={`p-4 rounded-lg border-2 bg-gradient-to-br ${rarityColors[achievement.rarity]} text-center`}
                      >
                        <div className="text-4xl mb-2">{achievement.icon}</div>
                        <h4 className="font-semibold text-sm mb-1">{achievement.name}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {achievement.rarity}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Encouraging Message */}
          <Card className="border-2 border-rose-200 dark:border-rose-800 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950 dark:to-pink-950">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <TrendingUp className="h-12 w-12 mx-auto text-rose-600" />
                <h3 className="text-xl font-bold text-foreground">
                  Your Child is Thriving! 🌟
                </h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Every story read, choice made, and achievement earned is building confidence, creativity, 
                  and important life skills. Keep encouraging their love of reading and adventure!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
