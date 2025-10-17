import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { Achievement } from "@/lib/achievements";

interface AchievementsListProps {
  achievements: Achievement[];
  unlockedAchievements: Achievement[];
  maxDisplay?: number;
}

export const AchievementsList = ({ 
  achievements, 
  unlockedAchievements,
  maxDisplay 
}: AchievementsListProps) => {
  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'rare':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'epic':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'legendary':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const displayAchievements = maxDisplay ? achievements.slice(0, maxDisplay) : achievements;
  const isUnlocked = (id: string) => unlockedAchievements.some(a => a.id === id);

  return (
    <div className="grid gap-4 tablet:grid-cols-2 lg:grid-cols-2">
      {displayAchievements.map((achievement) => {
        const unlocked = isUnlocked(achievement.id);
        const unlockedData = unlockedAchievements.find(a => a.id === achievement.id);
        
        return (
          <Card 
            key={achievement.id} 
            className={`glass-panel border-0 transition-all ${
              unlocked 
                ? 'animate-fade-in shadow-lg' 
                : 'opacity-60 grayscale'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`text-3xl ${unlocked ? '' : 'opacity-30'}`}>
                  {unlocked ? achievement.icon : <Lock className="h-8 w-8" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-sm leading-tight">
                      {achievement.name}
                    </h3>
                    <Badge 
                      className={getRarityColor(achievement.rarity)} 
                      variant="secondary"
                    >
                      {achievement.rarity}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {achievement.description}
                  </p>
                  {unlocked && unlockedData?.unlockedAt && (
                    <p className="text-xs text-muted-foreground italic">
                      Unlocked {new Date(unlockedData.unlockedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
