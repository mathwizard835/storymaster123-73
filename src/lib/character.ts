export type CharacterStats = {
  level: number;
  experience: number;
  experienceToNext: number;
  skillPoints: number;
  attributes: {
    courage: number;
    wisdom: number;
    creativity: number;
    leadership: number;
    empathy: number;
  };
  titles: string[];
  favoriteThemes: string[];
};

const CHARACTER_KEY = "smq.character";

export const DEFAULT_CHARACTER: CharacterStats = {
  level: 1,
  experience: 0,
  experienceToNext: 100,
  skillPoints: 0,
  attributes: {
    courage: 1,
    wisdom: 1,
    creativity: 1,
    leadership: 1,
    empathy: 1,
  },
  titles: ["Novice Adventurer"],
  favoriteThemes: [],
};

export const loadCharacter = (): CharacterStats => {
  try {
    const raw = localStorage.getItem(CHARACTER_KEY);
    if (raw) {
      const character = JSON.parse(raw) as CharacterStats;
      // Ensure all required fields exist (for backwards compatibility)
      return { ...DEFAULT_CHARACTER, ...character };
    }
  } catch (e) {
    console.error("Failed to load character", e);
  }
  
  return { ...DEFAULT_CHARACTER };
};

export const saveCharacter = (character: CharacterStats): void => {
  try {
    localStorage.setItem(CHARACTER_KEY, JSON.stringify(character));
  } catch (e) {
    console.error("Failed to save character", e);
  }
};

export const gainExperience = (
  badges: string[],
  mode: string,
  choiceCount: number,
  storyLength: 'short' | 'medium' | 'epic'
): { character: CharacterStats; leveledUp: boolean; newTitles: string[]; expGained: number } => {
  const character = loadCharacter();
  const newTitles: string[] = [];
  
  // Calculate experience - 25 XP per story completion
  const totalExp = 25;
  
  character.experience += totalExp;
  
  // Update favorite themes
  badges.forEach(badge => {
    if (!character.favoriteThemes.includes(badge)) {
      character.favoriteThemes.push(badge);
    }
  });
  
  // Check for level up
  let leveledUp = false;
  while (character.experience >= character.experienceToNext) {
    character.experience -= character.experienceToNext;
    character.level += 1;
    character.skillPoints += 2;
    leveledUp = true;
    
    // Increase exp requirement for next level
    character.experienceToNext = Math.floor(character.experienceToNext * 1.2);
    
    // Grant new titles based on level milestones
    const newTitle = getTitleForLevel(character.level);
    if (newTitle && !character.titles.includes(newTitle)) {
      character.titles.push(newTitle);
      newTitles.push(newTitle);
    }
  }
  
  // Gain attribute points based on story type
  if (leveledUp) {
    gainAttributePoints(character, badges, mode);
  }
  
  saveCharacter(character);
  return { character, leveledUp, newTitles, expGained: totalExp };
};

const getTitleForLevel = (level: number): string | null => {
  const titles: Record<number, string> = {
    3: "Aspiring Storyteller",
    5: "Tale Seeker",
    8: "Apprentice Hero",
    10: "Seasoned Adventurer",
    12: "Quest Master",
    15: "Veteran Explorer",
    18: "Champion of Tales",
    20: "Master Storyteller",
    22: "Elite Adventurer",
    25: "Legendary Champion",
    28: "Grand Master",
    30: "Mythic Hero",
    35: "Eternal Legend",
    40: "Storytelling Deity",
    50: "Transcendent Sage",
  };
  return titles[level] || null;
};

const gainAttributePoints = (character: CharacterStats, badges: string[], mode: string): void => {
  // Gain attributes based on badges used
  badges.forEach(badge => {
    switch (badge) {
      case 'action':
        character.attributes.courage += 1;
        break;
      case 'detective':
      case 'mystic':
        character.attributes.wisdom += 1;
        break;
      case 'creative':
        character.attributes.creativity += 1;
        break;
      case 'social':
        character.attributes.leadership += 1;
        character.attributes.empathy += 1;
        break;
      case 'beast':
      case 'space':
        character.attributes.courage += 1;
        character.attributes.wisdom += 1;
        break;
    }
  });
  
  // Bonus attributes based on mode
  switch (mode) {
    case 'thrill':
      character.attributes.courage += 1;
      break;
    case 'mystery':
      character.attributes.wisdom += 1;
      break;
    case 'fun':
      character.attributes.creativity += 1;
      break;
    case 'explore':
      character.attributes.leadership += 1;
      break;
  }
};