import { InventoryItem, Scene } from "./story";
import { useItem } from "./inventory";

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
    if (object.requiresItem && 
        item.type !== object.requiresItem && 
        item.id !== object.requiresItem &&
        !item.name.toLowerCase().includes(object.requiresItem.toLowerCase())) {
      return { 
        success: false, 
        message: `${object.name} requires a ${object.requiresItem}, but you used ${item.name}` 
      };
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

  // Check if choice requires an item
  if (choice.requiresItem) {
    const hasItem = inventory.some(item => 
      item.id === choice.requiresItem ||
      item.type === choice.requiresItem ||
      item.name.toLowerCase().includes(choice.requiresItem.toLowerCase())
    );
    
    if (!hasItem) {
      return { 
        valid: false, 
        reason: `This choice requires: ${choice.requiresItem}` 
      };
    }
  }

  return { valid: true };
};