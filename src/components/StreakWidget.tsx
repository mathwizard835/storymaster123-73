import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, Trophy, Calendar, Star } from "lucide-react";
import { getStreakStats } from "@/lib/streaks";

export const StreakWidget = () => {
  const [stats, setStats] = useState({
    currentStreak: 0,
    longestStreak: 0,
    bonusStoriesEarned: 0,
    daysUntilNextBonus: 3,
    nextMilestone: 3
  });

  useEffect(() => {
    loadStreakStats();
  }, []);

  const loadStreakStats = async () => {
    const data = await getStreakStats();
    setStats(data);
  };

  const getStreakLevel = (streak: number) => {
    if (streak >= 100) return { level: "Legend", color: "text-purple-500", icon: "👑" };
    if (streak >= 50) return { level: "Master", color: "text-yellow-500", icon: "🏆" };
    if (streak >= 30) return { level: "Expert", color: "text-blue-500", icon: "⭐" };
    if (streak >= 14) return { level: "Advanced", color: "text-green-500", icon: "💎" };
    if (streak >= 7) return { level: "Committed", color: "text-orange-500", icon: "🔥" };
    if (streak >= 3) return { level: "Getting Started", color: "text-primary", icon: "📚" };
    return { level: "Beginner", color: "text-muted-foreground", icon: "🌟" };
  };

  const streakInfo = getStreakLevel(stats.currentStreak);
  const progressPercent = ((stats.nextMilestone - stats.daysUntilNextBonus) / stats.nextMilestone) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className={`w-5 h-5 ${stats.currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
          Daily Streak
        </CardTitle>
        <CardDescription>
          Keep playing daily to unlock bonus stories and achievements!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-2">{streakInfo.icon}</div>
          <div className={`text-2xl font-bold ${streakInfo.color}`}>
            {stats.currentStreak} Day{stats.currentStreak !== 1 ? 's' : ''}
          </div>
          <Badge variant="secondary" className="mt-1">
            {streakInfo.level}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress to next bonus</span>
            <span>{stats.nextMilestone - stats.daysUntilNextBonus}/{stats.nextMilestone}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="text-xs text-center text-muted-foreground">
            {stats.daysUntilNextBonus === 0 ? 
              "🎉 Bonus unlocked! Play today to earn extra stories!" :
              `${stats.daysUntilNextBonus} more days until bonus stories`
            }
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <Trophy className="w-4 h-4" />
              Longest Streak
            </div>
            <div className="text-xl font-bold">{stats.longestStreak}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <Star className="w-4 h-4" />
              Bonus Stories
            </div>
            <div className="text-xl font-bold text-primary">{stats.bonusStoriesEarned}</div>
          </div>
        </div>

        <div className="bg-muted p-3 rounded-lg text-sm">
          <div className="font-medium text-center mb-1">Streak Milestones</div>
          <div className="grid grid-cols-2 gap-1 text-xs text-center">
            <div>3 days: +1 story</div>
            <div>7 days: +2 stories</div>
            <div>14 days: +4 stories</div>
            <div>30 days: +10 stories</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};