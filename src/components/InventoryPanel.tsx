import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { 
  Backpack, 
  Key, 
  Wrench, 
  Cookie, 
  FileText, 
  Sword, 
  Heart, 
  Info
} from "lucide-react";
import { InventoryItem } from "@/lib/story";

interface InventoryPanelProps {
  inventory: InventoryItem[];
  onUseItem?: (item: InventoryItem) => void;
  disabled?: boolean;
}

const getItemIcon = (type: InventoryItem['type']) => {
  const iconMap = {
    key: Key,
    tool: Wrench,
    consumable: Cookie,
    document: FileText,
    weapon: Sword,
    potion: Heart,
  };
  return iconMap[type] || Wrench;
};

const getItemColor = (type: InventoryItem['type']) => {
  const colorMap = {
    key: "bg-yellow-100 text-yellow-800 border-yellow-200",
    tool: "bg-blue-100 text-blue-800 border-blue-200",
    consumable: "bg-green-100 text-green-800 border-green-200",
    document: "bg-purple-100 text-purple-800 border-purple-200",
    weapon: "bg-red-100 text-red-800 border-red-200",
    potion: "bg-pink-100 text-pink-800 border-pink-200",
  };
  return colorMap[type] || "bg-gray-100 text-gray-800 border-gray-200";
};

export const InventoryPanel = ({ inventory, onUseItem, disabled }: InventoryPanelProps) => {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2"
        >
          <Backpack className="h-4 w-4" />
          Inventory ({inventory.length})
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Backpack className="h-5 w-5" />
            Your Inventory
          </SheetTitle>
          <SheetDescription>
            Items you've collected during your adventure. Click on items to use them in your story.
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {inventory.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Backpack className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Your inventory is empty</p>
              <p className="text-sm">Collect items during your adventure!</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {inventory.map((item) => {
                const ItemIcon = getItemIcon(item.type);
                const itemColor = getItemColor(item.type);
                
                return (
                  <Card 
                    key={item.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedItem?.id === item.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <ItemIcon className="h-4 w-4" />
                          {item.name}
                        </CardTitle>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${itemColor}`}
                        >
                          {item.type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-sm mb-3">
                        {item.description}
                      </CardDescription>
                      
                      {selectedItem?.id === item.id && (
                        <div className="space-y-2 pt-2 border-t">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Info className="h-3 w-3" />
                            {item.consumable ? "Will be consumed when used" : "Reusable item"}
                          </div>
                          {item.usable && onUseItem && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUseItem(item);
                                setSelectedItem(null);
                              }}
                              disabled={disabled}
                              className="w-full"
                            >
                              Use {item.name}
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};