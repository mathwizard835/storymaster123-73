export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
};

export type AchievementProgress = {
  totalStories: number;
  totalStoriesStarted: number;
  totalChoices: number;
  badgeUsage: Record<string, number>;
  modeUsage: Record<string, number>;
  achievements: Achievement[];
};

const ACHIEVEMENTS_KEY = "smq.achievements";

export const ALL_ACHIEVEMENTS: Achievement[] = [
  // Story completion achievements
  { id: "first_story", name: "First Adventure", description: "Complete your first story", icon: "🎯", rarity: "common" },
  { id: "story_master", name: "Story Master", description: "Complete 5 stories", icon: "📚", rarity: "rare" },
  { id: "legend", name: "Legendary Hero", description: "Complete 10 stories", icon: "👑", rarity: "legendary" },
  
  // Choice-based achievements
  { id: "decisive", name: "Decisive Hero", description: "Make 25 choices", icon: "⚡", rarity: "common" },
  { id: "tactician", name: "Master Tactician", description: "Make 100 choices", icon: "🧠", rarity: "epic" },
  
  // Badge specialization
  { id: "mystic_master", name: "Mystic Master", description: "Complete 3 stories as a Mystic Mage", icon: "🔮", rarity: "rare" },
  { id: "beast_lord", name: "Beast Lord", description: "Complete 3 stories as a Beast Master", icon: "🐺", rarity: "rare" },
  { id: "detective_ace", name: "Detective Ace", description: "Complete 3 stories as a Detective", icon: "🔍", rarity: "rare" },
  { id: "action_hero", name: "Action Hero", description: "Complete 3 stories as an Action Hero", icon: "🎬", rarity: "rare" },
  { id: "social_champion", name: "Social Champion", description: "Complete 3 stories as a Social Champion", icon: "🤝", rarity: "rare" },
  { id: "creative_genius", name: "Creative Genius", description: "Complete 3 stories as a Creative Genius", icon: "🎨", rarity: "rare" },
  { id: "space_explorer", name: "Space Explorer", description: "Complete 3 stories as a Space Explorer", icon: "🚀", rarity: "rare" },
  
  // Mode achievements
  { id: "thrill_seeker", name: "Thrill Seeker", description: "Complete 3 stories in Thrill Mode", icon: "⚡", rarity: "rare" },
  { id: "mystery_solver", name: "Mystery Solver", description: "Complete 3 stories in Mystery Mode", icon: "🕵️", rarity: "rare" },
  { id: "explorer", name: "Explorer", description: "Complete 3 stories in Explore Mode", icon: "🗺️", rarity: "rare" },
  { id: "comedy_master", name: "Comedy Master", description: "Complete 3 stories in Comedy Mode", icon: "🎉", rarity: "rare" },
  
  // Special achievements
  { id: "versatile", name: "Versatile Hero", description: "Use all 7 different badges", icon: "🌟", rarity: "epic" },
  { id: "adventurous", name: "Adventurous Spirit", description: "Try all 4 different modes", icon: "🎭", rarity: "epic" },
];

export const loadAchievements = (): AchievementProgress => {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (raw) {
      return JSON.parse(raw) as AchievementProgress;
    }
  } catch (e) {
    console.error("Failed to load achievements", e);
  }
  
  return {
    totalStories: 0,
    totalStoriesStarted: 0,
    totalChoices: 0,
    badgeUsage: {},
    modeUsage: {},
    achievements: [],
  };
};

export const saveAchievements = (progress: AchievementProgress): void => {
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(progress));
    // Notify subscribers (Dashboard, Achievements, ParentDashboard) to re-render
    import("./progressEvents").then(({ emitProgressUpdate }) => emitProgressUpdate()).catch(() => {});
  } catch (e) {
    console.error("Failed to save achievements", e);
  }
};

export const updateProgress = (
  badges: string[],
  mode: string,
  choiceCount: number
): Achievement[] => {
  const progress = loadAchievements();
  const newAchievements: Achievement[] = [];
  
  // Update stats
  progress.totalStories += 1;
  progress.totalStoriesStarted = (progress.totalStoriesStarted || 0) + 1;
  progress.totalChoices += choiceCount;
  
  // Update badge usage
  badges.forEach(badge => {
    progress.badgeUsage[badge] = (progress.badgeUsage[badge] || 0) + 1;
  });
  
  // Update mode usage
  progress.modeUsage[mode] = (progress.modeUsage[mode] || 0) + 1;
  
  // Check for new achievements
  for (const achievement of ALL_ACHIEVEMENTS) {
    if (progress.achievements.some(a => a.id === achievement.id)) continue;
    
    let unlocked = false;
    
    switch (achievement.id) {
      case "first_story":
        unlocked = (progress.totalStoriesStarted || 0) >= 1;
        break;
      case "story_master":
        unlocked = progress.totalStories >= 5;
        break;
      case "legend":
        unlocked = progress.totalStories >= 10;
        break;
      case "decisive":
        unlocked = progress.totalChoices >= 25;
        break;
      case "tactician":
        unlocked = progress.totalChoices >= 100;
        break;
      case "mystic_master":
        unlocked = (progress.badgeUsage["mystic"] || 0) >= 3;
        break;
      case "beast_lord":
        unlocked = (progress.badgeUsage["beast"] || 0) >= 3;
        break;
      case "detective_ace":
        unlocked = (progress.badgeUsage["detective"] || 0) >= 3;
        break;
      case "action_hero":
        unlocked = (progress.badgeUsage["action"] || 0) >= 3;
        break;
      case "social_champion":
        unlocked = (progress.badgeUsage["social"] || 0) >= 3;
        break;
      case "creative_genius":
        unlocked = (progress.badgeUsage["creative"] || 0) >= 3;
        break;
      case "space_explorer":
        unlocked = (progress.badgeUsage["space"] || 0) >= 3;
        break;
      case "thrill_seeker":
        unlocked = (progress.modeUsage["thrill"] || 0) >= 3;
        break;
      case "mystery_solver":
        unlocked = (progress.modeUsage["mystery"] || 0) >= 3;
        break;
      case "explorer":
        unlocked = (progress.modeUsage["explore"] || 0) >= 3;
        break;
      case "comedy_master":
        unlocked = (progress.modeUsage["comedy"] || 0) >= 3;
        break;
      case "versatile":
        unlocked = Object.keys(progress.badgeUsage).length >= 7;
        break;
      case "adventurous":
        unlocked = Object.keys(progress.modeUsage).length >= 4;
        break;
    }
    
    if (unlocked) {
      const newAchievement = { ...achievement, unlockedAt: new Date().toISOString() };
      progress.achievements.push(newAchievement);
      newAchievements.push(newAchievement);
    }
  }
  
  saveAchievements(progress);
  return newAchievements;
};