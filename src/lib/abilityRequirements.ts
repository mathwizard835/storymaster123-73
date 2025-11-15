// Define requirements for unlocking each ability type
import { AbilityCategory } from './abilities';

export type AbilityRequirement = {
  choicesRequired: number;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
};

export const ABILITY_REQUIREMENTS: Record<AbilityCategory, AbilityRequirement> = {
  // Common abilities - 3 choices
  combat: {
    choicesRequired: 3,
    description: 'Awarded for brave combat choices',
    rarity: 'common'
  },
  detective: {
    choicesRequired: 3,
    description: 'Awarded for solving mysteries and finding clues',
    rarity: 'common'
  },
  
  // Rare abilities - 4 choices
  diplomacy: {
    choicesRequired: 4,
    description: 'Awarded for peaceful resolutions and social success',
    rarity: 'rare'
  },
  survival: {
    choicesRequired: 4,
    description: 'Awarded for overcoming environmental challenges',
    rarity: 'rare'
  },
  
  // Epic abilities - 5 choices
  magic: {
    choicesRequired: 5,
    description: 'Awarded for mastering mystical forces',
    rarity: 'epic'
  },
  creativity: {
    choicesRequired: 5,
    description: 'Awarded for unique and creative solutions',
    rarity: 'epic'
  },
  
  // Legendary abilities - 6 choices
  leadership: {
    choicesRequired: 6,
    description: 'Awarded for inspiring others and leading by example',
    rarity: 'legendary'
  }
};

// Helper function to get requirement for a badge
export const getRequirementForBadge = (badge: string): AbilityRequirement => {
  const mapping: Record<string, AbilityCategory> = {
    'action': 'combat',
    'detective': 'detective',
    'social': 'diplomacy',
    'beast': 'survival',
    'mystic': 'magic',
    'creative': 'creativity',
    'space': 'leadership'
  };
  
  const category = mapping[badge] || 'combat';
  return ABILITY_REQUIREMENTS[category];
};

// Get display color for rarity
export const getRarityColor = (rarity: string): string => {
  switch (rarity) {
    case 'common': return 'from-blue-500 to-cyan-500';
    case 'rare': return 'from-purple-500 to-violet-500';
    case 'epic': return 'from-pink-500 to-rose-500';
    case 'legendary': return 'from-amber-500 to-orange-500';
    default: return 'from-gray-500 to-slate-500';
  }
};
