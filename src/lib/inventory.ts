import { InventoryItem, Profile } from "./story";

const INVENTORY_KEY = "smq.inventory";

// Save inventory to localStorage
export const saveInventory = (inventory: InventoryItem[]): void => {
  try {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
  } catch (e) {
    console.error("Failed to save inventory", e);
  }
};

// Load inventory from localStorage
export const loadInventory = (): InventoryItem[] => {
  try {
    const raw = localStorage.getItem(INVENTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load inventory", e);
    return [];
  }
};

// Add item to inventory
export const addItemToInventory = (item: InventoryItem, currentInventory: InventoryItem[]): InventoryItem[] => {
  // Check if item already exists (for stackable items in the future)
  const existingIndex = currentInventory.findIndex(existing => existing.id === item.id);
  
  if (existingIndex >= 0) {
    // Item already exists - for now, we don't add duplicates
    console.log(`Item ${item.name} already in inventory`);
    return currentInventory;
  }
  
  const newInventory = [...currentInventory, item];
  saveInventory(newInventory);
  return newInventory;
};

// Remove item from inventory (for consumables)
export const removeItemFromInventory = (itemId: string, currentInventory: InventoryItem[]): InventoryItem[] => {
  const newInventory = currentInventory.filter(item => item.id !== itemId);
  saveInventory(newInventory);
  return newInventory;
};

// Use item from inventory
export const useItem = (itemId: string, currentInventory: InventoryItem[]): { 
  item: InventoryItem | null, 
  newInventory: InventoryItem[] 
} => {
  const item = currentInventory.find(inv => inv.id === itemId);
  
  if (!item) {
    return { item: null, newInventory: currentInventory };
  }
  
  // If consumable, remove from inventory
  const newInventory = item.consumable 
    ? removeItemFromInventory(itemId, currentInventory)
    : currentInventory;
    
  return { item, newInventory };
};

// Clear all inventory (for new games)
export const clearInventory = (): void => {
  try {
    localStorage.removeItem(INVENTORY_KEY);
  } catch (e) {
    console.error("Failed to clear inventory", e);
  }
};

// Update profile with current inventory
export const updateProfileInventory = (profile: Profile, inventory: InventoryItem[]): Profile => {
  return {
    ...profile,
    inventory: [...inventory]
  };
};