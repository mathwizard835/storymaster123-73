import { InventoryItem, Profile } from "./story";
import { logInventoryChange, logError } from "./debugLogger";

const INVENTORY_KEY = "smq.inventory";
const INVENTORY_VERSION_KEY = "smq.inventory_version";

// Track inventory version to detect conflicts
let currentVersion = 0;

// Mutex lock to prevent simultaneous inventory updates
let inventoryLock = false;

// Validation: Check for duplicates and corruption
export const validateInventory = (inventory: InventoryItem[]): InventoryItem[] => {
  const seen = new Set<string>();
  const valid: InventoryItem[] = [];

  for (const item of inventory) {
    // Check for required fields
    if (!item.id || !item.name || !item.type) {
      logError('Invalid inventory item detected', item);
      continue;
    }

    // Remove duplicates
    if (seen.has(item.id)) {
      logError('Duplicate inventory item removed', { id: item.id, name: item.name });
      continue;
    }

    seen.add(item.id);
    valid.push(item);
  }

  return valid;
};

// Save inventory to localStorage with version tracking
export const saveInventory = (inventory: InventoryItem[]): void => {
  try {
    // Validate before saving
    const validInventory = validateInventory(inventory);
    
    currentVersion++;
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(validInventory));
    localStorage.setItem(INVENTORY_VERSION_KEY, currentVersion.toString());
  } catch (e) {
    logError("Failed to save inventory", e);
    console.error("Failed to save inventory", e);
  }
};

// Load inventory from localStorage with validation
export const loadInventory = (): InventoryItem[] => {
  try {
    const raw = localStorage.getItem(INVENTORY_KEY);
    const versionRaw = localStorage.getItem(INVENTORY_VERSION_KEY);
    
    currentVersion = versionRaw ? parseInt(versionRaw, 10) : 0;
    
    if (!raw) return [];
    
    const inventory = JSON.parse(raw) as InventoryItem[];
    return validateInventory(inventory);
  } catch (e) {
    logError("Failed to load inventory", e);
    console.error("Failed to load inventory", e);
    return [];
  }
};

// Transaction-like behavior: Execute inventory operation with locking
const executeInventoryTransaction = <T>(
  operation: () => T,
  maxRetries: number = 3
): T | null => {
  let retries = 0;
  
  while (retries < maxRetries) {
    if (!inventoryLock) {
      inventoryLock = true;
      try {
        const result = operation();
        inventoryLock = false;
        return result;
      } catch (e) {
        inventoryLock = false;
        logError('Inventory transaction failed', e);
        throw e;
      }
    }
    
    // Wait a bit before retrying
    retries++;
    const wait = retries * 50; // Exponential backoff
    const start = Date.now();
    while (Date.now() - start < wait) {
      // Busy wait
    }
  }
  
  logError('Inventory transaction: max retries exceeded');
  inventoryLock = false;
  return null;
};

// Add item to inventory with transaction safety
export const addItemToInventory = (item: InventoryItem, currentInventory: InventoryItem[]): InventoryItem[] => {
  const result = executeInventoryTransaction(() => {
    // Check if item already exists
    const existingIndex = currentInventory.findIndex(existing => existing.id === item.id);
    
    if (existingIndex >= 0) {
      console.log(`Item ${item.name} already in inventory`);
      return currentInventory;
    }
    
    const newInventory = [...currentInventory, item];
    saveInventory(newInventory);
    logInventoryChange('add', item.name);
    return newInventory;
  });
  
  return result || currentInventory;
};

// Remove item from inventory with transaction safety
export const removeItemFromInventory = (itemId: string, currentInventory: InventoryItem[]): InventoryItem[] => {
  const result = executeInventoryTransaction(() => {
    const item = currentInventory.find(i => i.id === itemId);
    const newInventory = currentInventory.filter(item => item.id !== itemId);
    saveInventory(newInventory);
    
    if (item) {
      logInventoryChange('remove', item.name);
    }
    
    return newInventory;
  });
  
  return result || currentInventory;
};

// Use item from inventory with transaction safety
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
  
  if (item) {
    logInventoryChange('use', item.name);
  }
    
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