import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SceneChoice, InventoryItem } from "@/lib/story";
import { validateChoice } from "@/lib/interactionHandlers";
import { AlertCircle, Key, Hand, Zap, Sparkles } from "lucide-react";

interface InteractiveChoicesProps {
  choices: SceneChoice[];
  inventory: InventoryItem[];
  onChoose: (choiceId: string) => void;
  loading: boolean;
}

export const InteractiveChoices = ({ 
  choices, 
  inventory, 
  onChoose, 
  loading 
}: InteractiveChoicesProps) => {
  
  const getChoiceIcon = (choice: SceneChoice) => {
    if (choice.type === 'ultra') return Sparkles;
    if (choice.type === 'item_use') return Key;
    if (choice.type === 'object_interact') return Hand;
    return Zap;
  };

  const getChoiceVariant = (choice: SceneChoice) => {
    if (choice.type === 'ultra') return 'default';
    if (choice.type === 'item_use') return 'secondary';
    if (choice.type === 'object_interact') return 'outline';
    return 'hero';
  };

  return (
    <div className="grid gap-3 content-start">
      {choices.map((choice) => {
        const validation = validateChoice(choice.id, { choices } as any, inventory);
        const ChoiceIcon = getChoiceIcon(choice);
        const isUltra = choice.type === 'ultra';
        
        return (
          <div key={choice.id} className="space-y-2">
            <Button
              onClick={() => onChoose(choice.id)}
              disabled={loading || !validation.valid}
              variant={getChoiceVariant(choice)}
              size="lg"
              className={`w-full text-left h-auto p-4 flex items-start gap-3 transition-all ${
                isUltra && validation.valid 
                  ? 'ring-2 ring-purple-500/50 hover:ring-purple-400 shadow-lg shadow-purple-500/20 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500' 
                  : ''
              }`}
            >
              <ChoiceIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isUltra ? 'animate-pulse' : ''}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold">{choice.text}</span>
                  {choice.type === 'ultra' && (
                    <Badge variant="default" className="text-xs bg-white/20 backdrop-blur-sm border-0 animate-pulse">
                      ✨ Ultra Choice
                    </Badge>
                  )}
                  {choice.type === 'item_use' && (
                    <Badge variant="outline" className="text-xs">
                      Use Item
                    </Badge>
                  )}
                  {choice.type === 'object_interact' && (
                    <Badge variant="outline" className="text-xs">
                      Interact
                    </Badge>
                  )}
                </div>
                {choice.requiresAbility && (
                  <div className={`text-xs font-medium flex items-center gap-1 ${
                    validation.valid ? 'text-purple-200' : 'text-purple-600 dark:text-purple-400'
                  }`}>
                    <Sparkles className="h-3 w-3" />
                    <span>Requires Ability: {choice.requiresAbility}</span>
                  </div>
                )}
                {choice.requiresItem && (
                  <div className="text-xs text-muted-foreground">
                    Requires: {choice.requiresItem}
                  </div>
                )}
                {choice.consumesItem && (
                  <div className="text-xs text-amber-600">
                    ⚠️ This will consume the item
                  </div>
                )}
              </div>
            </Button>
            
            {!validation.valid && validation.reason && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{validation.reason}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};