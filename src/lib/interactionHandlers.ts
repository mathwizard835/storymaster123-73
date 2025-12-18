import { InventoryItem, Scene } from "./story";
import { useItem } from "./inventory";
// ABILITIES DISABLED - Uncomment to re-enable
// import { hasAbility, hasAbilityCategory, type AbilityCategory } from "./abilities";

export interface InteractionContext {
  scene: Scene;
  inventory: InventoryItem[];
  onInventoryChange: (newInventory: InventoryItem[]) => void;
  onSceneUpdate: (scene: Scene) => void;
}

export const handleObjectInteraction = async (
  objectId: string,
  action: string,
  itemId: string | undefined,
  context: InteractionContext
): Promise<{ 
  success: boolean; 
  message: string; 
  itemUsed?: InventoryItem;
  newInventory?: InventoryItem[];
}> => {
  const { scene, inventory, onInventoryChange } = context;
  
  const object = scene.interactiveObjects?.find(obj => obj.id === objectId);
  if (!object) {
    return { success: false, message: "Object not found" };
  }

  // Handle item usage
  if (itemId && action.startsWith("use_")) {
    const { item, newInventory } = useItem(itemId, inventory);
    
    if (!item) {
      return { success: false, message: "Item not found in inventory" };
    }

    // Check if object requires this type of item
    if (object.requiresItem) {
      const requiredItem = object.requiresItem.toLowerCase().trim();
      const itemName = item.name.toLowerCase().trim();
      const itemType = item.type.toLowerCase().trim();
      const itemId = item.id.toLowerCase().trim();
      
      const matches = 
        itemId === requiredItem ||
        itemType === requiredItem ||
        itemName === requiredItem ||
        itemName.includes(requiredItem) ||
        requiredItem.includes(itemName) ||
        requiredItem.includes(itemType) ||
        requiredItem.split(/\s+/).some(word => itemName.includes(word) || itemType === word) ||
        itemName.split(/\s+/).some(word => requiredItem.includes(word));
      
      if (!matches) {
        return { 
          success: false, 
          message: `${object.name} requires a ${object.requiresItem}, but you used ${item.name}` 
        };
      }
    }

    onInventoryChange(newInventory);
    
    return {
      success: true,
      message: `Successfully used ${item.name} on ${object.name}`,
      itemUsed: item,
      newInventory
    };
  }

  // Handle basic object actions (examine, search, etc.)
  if (object.actions.includes(action)) {
    return {
      success: true,
      message: `You ${action.toLowerCase()} the ${object.name}`
    };
  }

  return { 
    success: false, 
    message: `Cannot ${action} the ${object.name}` 
  };
};

export const validateChoice = (
  choiceId: string,
  scene: Scene,
  inventory: InventoryItem[]
): { valid: boolean; reason?: string } => {
  const choice = scene.choices.find(c => c.id === choiceId);
  
  if (!choice) {
    return { valid: false, reason: "Choice not found" };
  }

  // ABILITIES DISABLED - Uncomment to re-enable
  // Check if choice requires an ability (for Ultra choices)
  // if (choice.requiresAbility) {
  //   const requiredAbility = choice.requiresAbility.toLowerCase().trim();
  //   
  //   // Check if it's a category or specific ability name
  //   const validCategories: AbilityCategory[] = ['detective', 'combat', 'diplomacy', 'magic', 'survival', 'creativity', 'leadership'];
  //   const isCategory = validCategories.some(cat => cat === requiredAbility);
  //   
  //   const hasRequiredAbility = isCategory 
  //     ? hasAbilityCategory(requiredAbility as AbilityCategory)
  //     : hasAbility(requiredAbility);
  //   
  //   if (!hasRequiredAbility) {
  //     console.log(`❌ Ability requirement NOT met:`, { 
  //       requiresAbility: choice.requiresAbility,
  //       type: isCategory ? 'category' : 'name'
  //     });
  //     return { 
  //       valid: false, 
  //       reason: `🌟 Ultra Choice - Requires: ${choice.requiresAbility}` 
  //     };
  //   }
  //   
  //   console.log(`✅ Ability requirement matched:`, { 
  //     requiresAbility: choice.requiresAbility
  //   });
  // }

  // Check if choice requires an item
  if (choice.requiresItem) {
    const requiredItem = choice.requiresItem.toLowerCase().trim();
    
    const hasItem = inventory.some(item => {
      const itemName = item.name.toLowerCase().trim();
      const itemType = item.type.toLowerCase().trim();
      const itemId = item.id.toLowerCase().trim();
      
      // Match by ID, type, or name (bidirectional contains check)
      const matches = 
        itemId === requiredItem ||
        itemType === requiredItem ||
        itemName === requiredItem ||
        itemName.includes(requiredItem) ||
        requiredItem.includes(itemName) ||
        // Check if the required item contains the item type (e.g., "magic key" contains "key")
        requiredItem.includes(itemType) ||
        // Match individual words (e.g., "golden key" matches item named "Key")
        requiredItem.split(/\s+/).some(word => itemName.includes(word) || itemType === word) ||
        itemName.split(/\s+/).some(word => requiredItem.includes(word));
      
      if (matches) {
        console.log(`✅ Item requirement matched:`, { 
          itemName: item.name, 
          itemType: item.type,
          requiresItem: choice.requiresItem 
        });
      }
      
      return matches;
    });
    
    if (!hasItem) {
      console.log(`❌ Item requirement NOT met:`, { 
        requiresItem: choice.requiresItem,
        inventory: inventory.map(i => ({ name: i.name, type: i.type, id: i.id }))
      });
      return { 
        valid: false, 
        reason: `This choice requires: ${choice.requiresItem}` 
      };
    }
  }

  return { valid: true };
};