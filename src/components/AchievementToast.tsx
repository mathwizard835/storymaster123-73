import { Achievement } from "@/lib/achievements";
import { Badge } from "@/components/ui/badge";

interface AchievementToastProps {
  achievement: Achievement;
}

export const AchievementToast = ({ achievement }: AchievementToastProps) => {
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

  return (
    <div className="flex items-center gap-3 p-4 bg-background border rounded-lg">
      <div className="text-2xl">{achievement.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm">{achievement.name}</h4>
          <Badge className={getRarityColor(achievement.rarity)} variant="secondary">
            {achievement.rarity}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{achievement.description}</p>
      </div>
    </div>
  );
};