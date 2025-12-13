import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Sparkles, Lock } from "lucide-react";
import { hasAbilityCategory } from "@/lib/abilities";
import { getRequirementForBadge, getRarityColor, getCategoryForBadge } from "@/lib/abilityRequirements";

interface AbilityProgressIndicatorProps {
  choicesMade: number;
  selectedBadges: string[];
  availableAbilitiesCount: number;
  onUnlockAbility?: () => void;
}

export const AbilityProgressIndicator = ({ 
  choicesMade, 
  selectedBadges,
  availableAbilitiesCount,
  onUnlockAbility 
}: AbilityProgressIndicatorProps) => {
  const badge = selectedBadges[0] || 'action';
  const requirement = getRequirementForBadge(badge);
  const requiredChoices = requirement.choicesRequired;
  const progress = Math.min((choicesMade / requiredChoices) * 100, 100);
  const canEarnAbility = choicesMade >= requiredChoices;
  const rarityColor = getRarityColor(requirement.rarity);
  
  // Check if player already has an ability for this badge's category
  const category = getCategoryForBadge(badge);
  const alreadyHasAbility = hasAbilityCategory(category);

  console.log('🎯 AbilityProgressIndicator render:', {
    choicesMade,
    requiredChoices,
    canEarnAbility,
    availableAbilitiesCount,
    badge,
    category,
    alreadyHasAbility,
    hasUnlockCallback: !!onUnlockAbility
  });

  const handleButtonClick = () => {
    console.log('🔥 UNLOCK BUTTON CLICKED!');
    if (!onUnlockAbility) {
      console.error('❌ onUnlockAbility is undefined!');
      return;
    }
    console.log('✅ Calling onUnlockAbility...');
    onUnlockAbility();
  };

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

  // If player already has this ability, show the "active abilities" state
  if (alreadyHasAbility || availableAbilitiesCount > 0) {
    return (
      <Card className="bg-gradient-to-br from-purple-600/30 to-pink-600/30 border-purple-400/40 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-400/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-purple-300" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-white">Secret Abilities</h3>
              <span className="text-sm font-semibold text-purple-200">{availableAbilitiesCount} Active</span>
            </div>
            <p className="text-sm text-purple-100">
              Your abilities unlock special Secret Choices throughout your adventures!
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Show progress toward unlocking
  if (!canEarnAbility) {
    return (
      <Card className={`bg-gradient-to-br ${rarityColor}/30 border-purple-500/30 p-4`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-purple-400" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">Unlock Secret Abilities</h3>
              <span className="text-sm text-purple-300">{choicesMade}/{requiredChoices}</span>
            </div>
            <Progress value={progress} className={`h-2 bg-purple-950/50`} />
            <p className="text-sm text-purple-200">
              Make {requiredChoices - choicesMade} more choice{requiredChoices - choicesMade !== 1 ? 's' : ''} to unlock <span className="font-semibold">{getBadgeAbilityName(badge)}</span>!
            </p>
            <div className="text-xs text-purple-300/80 italic">
              {requirement.description} • {requirement.rarity.toUpperCase()}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Show unlock button - player made enough choices and doesn't have this ability yet
  console.log('🎨 Rendering UNLOCK BUTTON state');
  return (
    <Card className={`bg-gradient-to-br ${rarityColor}/40 border-purple-400/50 p-4`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-400/30 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-purple-200 animate-pulse" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white mb-1">Ability Ready!</h3>
            <p className="text-sm text-purple-100 mb-1">
              You've made enough choices to unlock <span className="font-semibold">{getBadgeAbilityName(badge)}</span>!
            </p>
            <div className="text-xs text-purple-200/80 italic uppercase font-semibold">
              {requirement.rarity} Ability
            </div>
          </div>
        </div>
        <Button
          type="button"
          onClick={handleButtonClick}
          className={`w-full bg-gradient-to-r ${rarityColor} hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-purple-500/50 flex items-center justify-center gap-2`}
        >
          <Sparkles className="h-5 w-5 animate-pulse" />
          Ready to Unlock! Gain Access to Secret Choices
        </Button>
      </div>
    </Card>
  );
};
