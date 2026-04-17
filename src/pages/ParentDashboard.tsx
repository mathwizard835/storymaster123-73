import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, Star, Heart, Lightbulb, Shield, Users, Sparkles, Target, TrendingUp, Award, BookOpen, Clock, Book, Flame, Zap, Lock, Unlock } from "lucide-react";
import { loadCharacter } from "@/lib/character";
import { loadAchievements } from "@/lib/achievements";
// ABILITIES DISABLED - Uncomment to re-enable
// import { loadAbilities, type Ability } from "@/lib/abilities";
import { loadCompletedStoriesFromDatabase } from "@/lib/databaseStory";
import { getStreakStats } from "@/lib/streaks";
import { getReadingStats, type ReadingStats } from "@/lib/readingAnalytics";
import { Seo } from "@/components/Seo";
import { useDevice } from "@/contexts/DeviceContext";
import { addHapticFeedback } from "@/lib/mobileFeatures";
import { NativeNavigationHeader } from "@/components/NativeNavigationHeader";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { SwipeBackIndicator } from "@/components/SwipeBackIndicator";
import { useProgressSync } from "@/hooks/useProgressSync";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { isPhone, isNative } = useDevice();
  const { swipeProgress } = useSwipeBack();
  const mainRef = useRef<HTMLDivElement>(null);

  // Disable premium themes in parent mode
  useEffect(() => {
    const savedTheme = document.documentElement.getAttribute("data-theme");
    if (savedTheme) {
      document.documentElement.removeAttribute("data-theme");
    }
    return () => {
      const theme = localStorage.getItem("premium-theme");
      if (theme && theme !== "default") {
        document.documentElement.setAttribute("data-theme", theme);
      }
    };
  }, []);
  const [character, setCharacter] = useState(loadCharacter());
  const [achievements, setAchievements] = useState(loadAchievements());
  // ABILITIES DISABLED - Uncomment to re-enable
  // const [abilityProgress, setAbilityProgress] = useState(loadAbilities());
  const abilityProgress = { abilities: [], totalAbilitiesEarned: 0, abilitiesUsed: 0 }; // Placeholder
  const [recentStories, setRecentStories] = useState<any[]>([]);
  const [streakStats, setStreakStats] = useState<any>(null);
  const [readingStats, setReadingStats] = useState<ReadingStats | null>(null);
  const [childName, setChildName] = useState<string>("Your child");

  const loadData = useCallback(async () => {
    setCharacter(loadCharacter());
    setAchievements(loadAchievements());
    const stories = await loadCompletedStoriesFromDatabase();
    const stats = await getStreakStats();
    const reading = await getReadingStats();
    setRecentStories(stories.slice(0, 5));
    setStreakStats(stats);
    setReadingStats(reading);

    // Get child name from most recent story profile
    if (stories.length > 0 && stories[0].profile?.name) {
      setChildName(stories[0].profile.name);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time refresh on progress events / focus / visibility
  useProgressSync(loadData);

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

  const getAbilityIcon = (category: string) => {
    switch (category) {
      case 'detective': return '🔍';
      case 'combat': return '⚔️';
      case 'diplomacy': return '🤝';
      case 'magic': return '✨';
      case 'survival': return '🏕️';
      case 'creativity': return '🎨';
      case 'leadership': return '👑';
      default: return '⭐';
    }
  };

  const getStoryMessage = (story: any) => {
    const name = story.profile?.name || "Your child";
    const badges = story.profile?.badges || [];
    const mode = story.profile?.mode || 'adventure';

    const badgeQualities: { [key: string]: { trait: string; action: string } } = {
      'detective': { trait: 'curiosity and critical thinking', action: 'solved mysteries' },
      'action-hero': { trait: 'courage and determination', action: 'overcame challenges' },
      'creative-genius': { trait: 'imagination and innovation', action: 'created amazing solutions' },
      'social-champion': { trait: 'empathy and teamwork', action: 'built strong friendships' },
      'mystic-mage': { trait: 'wisdom and insight', action: 'made thoughtful decisions' },
      'beast-master': { trait: 'compassion and kindness', action: 'cared for others' }
    };

    if (badges.length === 0) {
      const templates = [
        `${name} embarked on an incredible journey and let their imagination soar!`,
        `${name} discovered new worlds and showed wonderful creativity!`,
        `${name} explored bravely and made exciting choices throughout their adventure!`
      ];
      return templates[Math.floor(Math.random() * templates.length)];
    }

    const primaryBadge = badges[0];
    const quality = badgeQualities[primaryBadge] || { trait: 'determination', action: 'made great progress' };
    
    const templates = mode === 'educational' 
      ? [
          `${name} ${quality.action} while learning important concepts! They demonstrated ${quality.trait}.`,
          `${name} mastered new skills and showed incredible ${quality.trait} throughout their learning journey!`,
          `${name} explored educational content with enthusiasm, displaying ${quality.trait} every step of the way!`
        ]
      : [
          `${name} ${quality.action} in an epic adventure! They displayed remarkable ${quality.trait}.`,
          `${name} journeyed through challenges with ${quality.trait}, proving they can achieve anything!`,
          `${name} conquered their quest by showing ${quality.trait} and never giving up!`
        ];

    if (badges.length > 1) {
      const secondBadge = badges[1];
      const secondQuality = badgeQualities[secondBadge]?.trait || 'perseverance';
      const message = templates[Math.floor(Math.random() * templates.length)];
      return `${message.slice(0, -1)}, plus ${secondQuality}!`;
    }

    return templates[Math.floor(Math.random() * templates.length)];
  };

  const unlockedAchievements = achievements.achievements.filter(a => a.unlockedAt);
  const attributeData = Object.entries(character.attributes).map(([key, value]) => ({
    name: key,
    value: value as number,
    label: getAttributeLabel(key),
    icon: getAttributeIcon(key)
  }));
  const totalStories = achievements.totalStories;

  // Calculate Secret Choices used from ability usage
  const secretChoicesUsed = abilityProgress.abilitiesUsed;
  const activeAbilities = abilityProgress.abilities.filter(a => !a.used);

  return (
    <>
      <Seo 
        title="Parent Dashboard - Track Your Child's Reading Progress"
        description="See real reading progress: time spent, words read, streaks, and emotional growth through interactive storytelling"
      />
      
      <SwipeBackIndicator progress={swipeProgress} />
      <div ref={mainRef} className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-auto pb-24 md:pb-8">
        {/* Native iOS-style header */}
        {isPhone && isNative && (
          <NativeNavigationHeader
            title="Parents"
            scrollRef={mainRef as React.RefObject<HTMLDivElement>}
            leftAction={
              <button onClick={() => { addHapticFeedback('light'); navigate("/dashboard"); }} className="text-primary text-[15px] font-medium">
                Back
              </button>
            }
          />
        )}

        <div className="container max-w-6xl mx-auto p-4 md:p-8 space-y-8">
          {/* Mobile Header (web only) */}
          {isPhone && !isNative && (
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/dashboard")}
                className="h-10 w-10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="font-heading text-xl font-bold">Parent Dashboard</h1>
            </div>
          )}

          {/* Desktop header */}
          {!isPhone && (
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Adventure
              </Button>
            </div>
          )}

          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 flex-wrap">
              <Heart className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-rose-500 flex-shrink-0" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">
                📚 {childName}'s Reading Journey
              </h1>
              <Heart className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-rose-500 flex-shrink-0" />
            </div>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Watch reading become your child's favorite adventure!
            </p>
          </div>

          {/* Reading Progress - FEATURED */}
          {readingStats && (
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-primary" />
                  <CardTitle className="text-2xl">Reading Progress</CardTitle>
                </div>
                <CardDescription>Real measurable growth you can celebrate!</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-card border">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                    <div className="text-3xl font-bold">{readingStats.totalReadingTimeMinutes}</div>
                    <div className="text-sm text-muted-foreground">Minutes Read</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-card border">
                    <Book className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <div className="text-3xl font-bold">{readingStats.totalWordsRead.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Words Read</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-card border">
                    <Flame className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                    <div className="text-3xl font-bold">{readingStats.currentStreak}</div>
                    <div className="text-sm text-muted-foreground">Day Streak</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-card border">
                    <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                    <div className="text-3xl font-bold">{readingStats.averageReadingSpeed}</div>
                    <div className="text-sm text-muted-foreground">Words/Min</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Recent Activity
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">This Week</div>
                      <div className="text-2xl font-bold">{readingStats.sessionsThisWeek} stories</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-sm text-muted-foreground">This Month</div>
                      <div className="text-2xl font-bold">{readingStats.sessionsThisMonth} stories</div>
                    </div>
                  </div>
                </div>

                {readingStats.currentStreak >= 3 && (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                    <p className="text-center font-semibold text-green-700 dark:text-green-300">
                      🎉 Amazing! {childName} is on a {readingStats.currentStreak}-day reading streak!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Special Abilities - NEW SECTION */}
          {abilityProgress.abilities.length > 0 && (
            <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/50 dark:to-pink-950/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                  <CardTitle className="text-2xl">✨ Special Abilities Unlocked</CardTitle>
                </div>
                <CardDescription>
                  Abilities earned through quality story choices unlock Secret Choices in adventures!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700">
                    <Award className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                    <div className="text-3xl font-bold">{abilityProgress.abilities.length}</div>
                    <div className="text-sm text-muted-foreground">Abilities Earned</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-pink-100 dark:bg-pink-900/30 border border-pink-300 dark:border-pink-700">
                    <Unlock className="w-8 h-8 mx-auto mb-2 text-pink-600" />
                    <div className="text-3xl font-bold">{secretChoicesUsed}</div>
                    <div className="text-sm text-muted-foreground">Secret Choices Used</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700">
                    <Lock className="w-8 h-8 mx-auto mb-2 text-indigo-600" />
                    <div className="text-3xl font-bold">{activeAbilities.length}</div>
                    <div className="text-sm text-muted-foreground">Ready to Use</div>
                  </div>
                </div>

                {/* ABILITIES DISABLED - Uncomment to re-enable */}
                {/* {abilityProgress.abilities.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Earned Abilities:</h3>
                    <div className="grid gap-3">
                      {abilityProgress.abilities.map((ability: Ability) => (
                        <div 
                          key={ability.id} 
                          className={`p-4 rounded-lg border ${
                            ability.used 
                              ? 'bg-muted/50 border-muted opacity-75' 
                              : 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 border-purple-200 dark:border-purple-700'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-3xl">{getAbilityIcon(ability.category)}</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold">{ability.name}</h4>
                                <Badge variant={ability.used ? "secondary" : "default"} className="text-xs">
                                  {ability.used ? "Used" : "Available"}
                                </Badge>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {ability.category}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{ability.description}</p>
                              <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                                Earned from story adventures
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )} */}

                {secretChoicesUsed > 0 && (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <p className="text-center font-semibold text-purple-700 dark:text-purple-300">
                      🌟 {childName} has used {secretChoicesUsed} Secret Choice{secretChoicesUsed !== 1 ? 's' : ''} to unlock unique story paths!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-2 border-amber-200 dark:border-amber-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-600" />
                  Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{character.level}</div>
              </CardContent>
            </Card>
            <Card className="border-2 border-blue-200 dark:border-blue-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  Stories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalStories}</div>
              </CardContent>
            </Card>
            <Card className="border-2 border-purple-200 dark:border-purple-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Award className="h-4 w-4 text-purple-600" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{unlockedAchievements.length}</div>
              </CardContent>
            </Card>
            <Card className="border-2 border-rose-200 dark:border-rose-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-rose-600" />
                  Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{streakStats?.currentStreak || 0}</div>
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
            </CardHeader>
            <CardContent className="space-y-4">
              {recentStories.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No adventures yet!</p>
              ) : (
                recentStories.map((story) => (
                  <div key={story.id} className="p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border border-amber-200">
                    <p className="text-base font-medium mb-2">{getStoryMessage(story)}</p>
                    <div className="flex flex-wrap gap-2">
                      {(story.profile?.badges || []).map((badge: string) => (
                        <Badge key={badge} variant="secondary">{badge.replace('-', ' ')}</Badge>
                      ))}
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
            </CardHeader>
            <CardContent className="space-y-6">
              {attributeData.map((attr) => (
                <div key={attr.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {attr.icon}
                      <span className="font-medium">{attr.label}</span>
                    </div>
                    <Badge variant="secondary">{attr.value}/100</Badge>
                  </div>
                  <Progress value={attr.value} className="h-3" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
