import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SceneChoice, InventoryItem } from "@/lib/story";
import { validateChoice } from "@/lib/interactionHandlers";
import { AlertCircle, Key, Hand, Zap } from "lucide-react";

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
    if (choice.type === 'item_use') return Key;
    if (choice.type === 'object_interact') return Hand;
    return Zap;
  };

  const getChoiceVariant = (choice: SceneChoice) => {
    if (choice.type === 'item_use') return 'secondary';
    if (choice.type === 'object_interact') return 'outline';
    return 'hero';
  };

  return (
    <div className="grid gap-3 content-start">
      {choices.map((choice) => {
        const validation = validateChoice(choice.id, { choices } as any, inventory);
        const ChoiceIcon = getChoiceIcon(choice);
        
        return (
          <div key={choice.id} className="space-y-2">
            <Button
              onClick={() => onChoose(choice.id)}
              disabled={loading || !validation.valid}
              variant={getChoiceVariant(choice)}
              size="lg"
              className="w-full text-left h-auto p-4 flex items-start gap-3"
            >
              <ChoiceIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{choice.text}</span>
                  {choice.type && choice.type !== 'standard' && (
                    <Badge variant="outline" className="text-xs">
                      {choice.type === 'item_use' ? 'Use Item' : 'Interact'}
                    </Badge>
                  )}
                </div>
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