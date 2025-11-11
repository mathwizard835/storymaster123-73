import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Lock } from "lucide-react";
import { AbilityCategory } from "@/lib/abilities";

interface AbilityProgressIndicatorProps {
  choicesMade: number;
  selectedBadges: string[];
  availableAbilitiesCount: number;
}

export const AbilityProgressIndicator = ({ 
  choicesMade, 
  selectedBadges,
  availableAbilitiesCount 
}: AbilityProgressIndicatorProps) => {
  const requiredChoices = 3;
  const progress = Math.min((choicesMade / requiredChoices) * 100, 100);
  const canEarnAbility = choicesMade >= requiredChoices;

  const getBadgeAbilityName = (badge: string): string => {
    const mapping: Record<string, string> = {
      'detective': 'Master Detective',
      'action': 'Combat Expert',
      'social': 'Master Diplomat',
      'mystic': 'Arcane Master',
      'beast': 'Wilderness Expert',
      'creative': 'Creative Genius'
    };
    return mapping[badge] || 'Special Ability';
  };

  if (availableAbilitiesCount === 0 && !canEarnAbility) {
    return (
      <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-purple-400" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">Unlock Ultra Abilities</h3>
              <span className="text-sm text-purple-300">{choicesMade}/{requiredChoices}</span>
            </div>
            <Progress value={progress} className="h-2 bg-purple-950/50" />
            <p className="text-sm text-purple-200">
              Make {requiredChoices - choicesMade} more choice{requiredChoices - choicesMade !== 1 ? 's' : ''} to unlock <span className="font-semibold">{getBadgeAbilityName(selectedBadges[0])}</span>!
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (canEarnAbility && availableAbilitiesCount === 0) {
    return (
      <Card className="bg-gradient-to-br from-purple-600/40 to-pink-600/40 border-purple-400/50 p-4 animate-pulse">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-400/30 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-purple-200 animate-pulse" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white mb-1">Ready to Unlock!</h3>
            <p className="text-sm text-purple-100">
              Complete this story to unlock <span className="font-semibold">{getBadgeAbilityName(selectedBadges[0])}</span> and gain access to Ultra Choices!
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-600/30 to-pink-600/30 border-purple-400/40 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-400/20 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-purple-300" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-white">Ultra Abilities</h3>
            <span className="text-sm font-semibold text-purple-200">{availableAbilitiesCount} Active</span>
          </div>
          <p className="text-sm text-purple-100">
            Your abilities unlock special Ultra Choices throughout your adventures!
          </p>
        </div>
      </div>
    </Card>
  );
};
