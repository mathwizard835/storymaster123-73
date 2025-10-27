import { Ability } from "@/lib/abilities";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface AbilityToastProps {
  ability: Ability;
}

export const AbilityToast = ({ ability }: AbilityToastProps) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'detective': return 'from-blue-500 to-cyan-500';
      case 'combat': return 'from-red-500 to-orange-500';
      case 'diplomacy': return 'from-green-500 to-emerald-500';
      case 'magic': return 'from-purple-500 to-pink-500';
      case 'survival': return 'from-yellow-500 to-amber-500';
      case 'creativity': return 'from-indigo-500 to-violet-500';
      case 'leadership': return 'from-yellow-600 to-orange-600';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  return (
    <div className="flex items-start gap-3 p-4">
      <div className={`flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br ${getCategoryColor(ability.category)} flex items-center justify-center`}>
        <Sparkles className="h-6 w-6 text-white" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-lg">{ability.name}</h3>
          <Badge variant="outline" className="text-xs capitalize">
            {ability.category}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{ability.description}</p>
        <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 font-medium">
          ✨ Unlocks Ultra Choices in future stories!
        </p>
      </div>
    </div>
  );
};
