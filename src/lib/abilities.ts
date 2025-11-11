// Ability System - Earned through story achievements and used for Ultra choices

export type AbilityCategory = 
  | 'detective' // Solving mysteries, investigation
  | 'combat' // Combat victories, protection
  | 'diplomacy' // Social achievements, persuasion
  | 'magic' // Mystical accomplishments
  | 'survival' // Overcoming dangers
  | 'creativity' // Creative solutions
  | 'leadership'; // Leading others, heroic acts

export type Ability = {
  id: string;
  name: string;
  description: string;
  category: AbilityCategory;
  earnedAt: string; // ISO timestamp
  storySource: string; // Which story/achievement granted this
  icon: string; // Icon identifier
  used: boolean; // Track if ability has been used
};

export type AbilityProgress = {
  abilities: Ability[];
  totalAbilitiesEarned: number;
  abilitiesUsed: number;
};

const ABILITIES_KEY = 'smq.abilities';

// Load abilities from storage
export const loadAbilities = (): AbilityProgress => {
  try {
    const stored = localStorage.getItem(ABILITIES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading abilities:', error);
  }
  
  return {
    abilities: [],
    totalAbilitiesEarned: 0,
    abilitiesUsed: 0
  };
};

// Save abilities to storage
export const saveAbilities = (progress: AbilityProgress): void => {
  try {
    localStorage.setItem(ABILITIES_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving abilities:', error);
  }
};

// Award new ability
export const awardAbility = (
  name: string,
  description: string,
  category: AbilityCategory,
  storySource: string,
  icon: string = 'star'
): Ability => {
  const progress = loadAbilities();
  
  const newAbility: Ability = {
    id: crypto.randomUUID(),
    name,
    description,
    category,
    earnedAt: new Date().toISOString(),
    storySource,
    icon,
    used: false
  };
  
  progress.abilities.push(newAbility);
  progress.totalAbilitiesEarned++;
  
  saveAbilities(progress);
  
  return newAbility;
};

// Check if player has ability by category
export const hasAbilityCategory = (category: AbilityCategory): boolean => {
  const progress = loadAbilities();
  return progress.abilities.some(ability => ability.category === category && !ability.used);
};

// Check if player has specific ability by name
export const hasAbility = (abilityName: string): boolean => {
  const progress = loadAbilities();
  return progress.abilities.some(
    ability => ability.name.toLowerCase().includes(abilityName.toLowerCase()) && !ability.used
  );
};

// Use an ability (mark as consumed)
export const useAbility = (abilityId: string): void => {
  const progress = loadAbilities();
  const ability = progress.abilities.find(a => a.id === abilityId);
  
  if (ability && !ability.used) {
    ability.used = true;
    progress.abilitiesUsed++;
    saveAbilities(progress);
  }
};

// Get available abilities (unused) by category
export const getAvailableAbilities = (category?: AbilityCategory): Ability[] => {
  const progress = loadAbilities();
  
  if (category) {
    return progress.abilities.filter(a => a.category === category && !a.used);
  }
  
  return progress.abilities.filter(a => !a.used);
};

// Auto-award abilities based on achievements and story completion
export const checkAndAwardAbilities = (
  badges: string[],
  choicesMade: number,
  storyCompleted: boolean,
  profile: any,
  qualityMetrics?: {
    quizScore?: number;
    strategicChoices?: number; // Item use, object interactions
    ultraChoicesUsed?: number;
  }
): Ability[] => {
  const newAbilities: Ability[] = [];
  
  // Calculate quality score (0-100)
  const quizPerformance = qualityMetrics?.quizScore || 0;
  const strategicChoiceBonus = (qualityMetrics?.strategicChoices || 0) * 10;
  const ultraChoiceBonus = (qualityMetrics?.ultraChoicesUsed || 0) * 20;
  const qualityScore = Math.min(100, quizPerformance + strategicChoiceBonus + ultraChoiceBonus);
  
  // Require: 3+ meaningful choices AND (80+ quiz score OR 2+ strategic/ultra choices OR story completion with decent engagement)
  const hasQualityEngagement = storyCompleted && (
    quizPerformance >= 80 || 
    (qualityMetrics?.strategicChoices || 0) >= 2 ||
    (qualityMetrics?.ultraChoicesUsed || 0) >= 1 ||
    choicesMade >= 5
  );
  
  if (!hasQualityEngagement) {
    return []; // No abilities without quality engagement
  }
  
  // Award detective ability for solving mysteries with good comprehension
  if (badges.includes('detective') && !hasAbilityCategory('detective')) {
    newAbilities.push(
      awardAbility(
        'Master Detective',
        'Your keen observation skills unlock hidden clues',
        'detective',
        'Solved complex mystery',
        'search'
      )
    );
  }
  
  // Award combat ability for action heroes
  if (badges.includes('action') && !hasAbilityCategory('combat')) {
    newAbilities.push(
      awardAbility(
        'Combat Expert',
        'Years of training allow you to face any threat',
        'combat',
        'Defeated powerful adversary',
        'sword'
      )
    );
  }
  
  // Award diplomacy for social champions
  if (badges.includes('social') && !hasAbilityCategory('diplomacy')) {
    newAbilities.push(
      awardAbility(
        'Master Diplomat',
        'Your words can sway even the hardest hearts',
        'diplomacy',
        'Resolved conflict peacefully',
        'users'
      )
    );
  }
  
  // Award magic for mystic achievements
  if (badges.includes('mystic') && !hasAbilityCategory('magic')) {
    newAbilities.push(
      awardAbility(
        'Arcane Master',
        'You command powerful magical forces',
        'magic',
        'Mastered ancient magic',
        'wand'
      )
    );
  }
  
  // Award survival for beast masters
  if (badges.includes('beast') && !hasAbilityCategory('survival')) {
    newAbilities.push(
      awardAbility(
        'Wilderness Expert',
        'You can survive and thrive in any environment',
        'survival',
        'Bonded with nature',
        'leaf'
      )
    );
  }
  
  // Award creativity for creative geniuses
  if (badges.includes('creative') && !hasAbilityCategory('creativity')) {
    newAbilities.push(
      awardAbility(
        'Creative Genius',
        'Your imagination finds solutions others miss',
        'creativity',
        'Created unique solution',
        'lightbulb'
      )
    );
  }
  
  // Award leadership for completing epic stories with excellence
  if (profile.storyLength === 'epic' && qualityScore >= 70 && !hasAbilityCategory('leadership')) {
    newAbilities.push(
      awardAbility(
        'Natural Leader',
        'Others follow your example in times of need',
        'leadership',
        'Led party to victory',
        'crown'
      )
    );
  }
  
  return newAbilities;
};
