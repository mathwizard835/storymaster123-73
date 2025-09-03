import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  Hand, 
  Key, 
  AlertCircle,
  Sparkles
} from "lucide-react";
import { InteractiveObject, InventoryItem } from "@/lib/story";

interface InteractiveObjectsProps {
  objects: InteractiveObject[];
  inventory: InventoryItem[];
  onObjectInteract: (objectId: string, action: string, itemId?: string) => void;
  disabled?: boolean;
}

export const InteractiveObjects = ({ 
  objects, 
  inventory, 
  onObjectInteract, 
  disabled 
}: InteractiveObjectsProps) => {
  if (!objects || objects.length === 0) {
    return null;
  }

  const getRequiredItem = (objectRequirement?: string) => {
    if (!objectRequirement) return null;
    return inventory.find(item => 
      item.id === objectRequirement || 
      item.type === objectRequirement ||
      item.name.toLowerCase().includes(objectRequirement.toLowerCase())
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Interactive Objects</h3>
      </div>
      
      {objects.map((object) => {
        const requiredItem = getRequiredItem(object.requiresItem);
        const hasRequiredItem = !object.requiresItem || !!requiredItem;
        
        return (
          <Card 
            key={object.id}
            className={`transition-all ${object.highlighted ? 'ring-2 ring-primary animate-pulse' : ''}`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Hand className="h-4 w-4" />
                {object.name}
                {object.requiresItem && (
                  <Badge 
                    variant={hasRequiredItem ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {hasRequiredItem ? (
                      <>✓ Has {requiredItem?.name}</>
                    ) : (
                      <>Needs {object.requiresItem}</>
                    )}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-xs mb-3">
                {object.description}
              </CardDescription>
              
              <div className="flex flex-wrap gap-2">
                {object.actions.map((action) => (
                  <Button
                    key={action}
                    size="sm"
                    variant={action.toLowerCase().includes('examine') ? "outline" : "secondary"}
                    onClick={() => onObjectInteract(object.id, action)}
                    disabled={disabled}
                    className="text-xs"
                  >
                    {action.toLowerCase().includes('examine') && <Search className="h-3 w-3 mr-1" />}
                    {action}
                  </Button>
                ))}
                
                {/* Show item-specific actions */}
                {object.requiresItem && hasRequiredItem && requiredItem && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onObjectInteract(object.id, `use_${requiredItem.type}`, requiredItem.id)}
                    disabled={disabled}
                    className="text-xs bg-primary/90 hover:bg-primary"
                  >
                    <Key className="h-3 w-3 mr-1" />
                    Use {requiredItem.name}
                  </Button>
                )}
              </div>
              
              {object.requiresItem && !hasRequiredItem && (
                <div className="flex items-center gap-2 mt-2 p-2 rounded bg-muted/50">
                  <AlertCircle className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    You need a {object.requiresItem} to fully interact with this
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};