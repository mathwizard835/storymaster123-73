import { supabase } from '@/integrations/supabase/client';
import { saveAchievements, loadAchievements, AchievementProgress, ALL_ACHIEVEMENTS } from './achievements';
import { saveCharacter, gainExperience, loadCharacter, DEFAULT_CHARACTER, CharacterStats } from './character';
import { Profile } from './story';
// ABILITIES DISABLED - Uncomment to re-enable
// import { checkAndAwardAbilities, saveAbilities, type AbilityProgress } from './abilities';
type AbilityProgress = { abilities: any[]; totalAbilitiesEarned: number; abilitiesUsed: number }; // Placeholder type

/**
 * Syncs user progress from database to localStorage
 * ALWAYS call this on login to ensure cross-device consistency
 */
export const syncProgressFromDatabase = async (): Promise<{
  syncedStories: number;
  achievements: AchievementProgress;
  character: CharacterStats;
  abilities: AbilityProgress;
}> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No authenticated user, skipping sync');
      return {
        syncedStories: 0,
        achievements: { totalStories: 0, totalStoriesStarted: 0, totalChoices: 0, badgeUsage: {}, modeUsage: {}, achievements: [] },
        character: DEFAULT_CHARACTER,
        abilities: { abilities: [], totalAbilitiesEarned: 0, abilitiesUsed: 0 }
      };
    }

    // Get ALL stories from user_stories (active, paused, and completed)
    const userStoriesResult = await supabase
      .from('user_stories')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'paused', 'completed'])
      .order('started_at', { ascending: true });

    if (userStoriesResult.error) {
      console.error('Failed to fetch stories:', userStoriesResult.error);
      throw userStoriesResult.error;
    }

    const allStories = userStoriesResult.data || [];
    const completedStories = allStories.filter(s => s.status === 'completed');
    const totalStoriesStarted = allStories.length;
    const totalStoriesCompleted = completedStories.length;

    if (totalStoriesStarted === 0) {
      console.log('No stories found in database, resetting to defaults');
      const freshCharacter = { ...DEFAULT_CHARACTER };
      saveCharacter(freshCharacter);
      const freshAchievements: AchievementProgress = { totalStories: 0, totalStoriesStarted: 0, totalChoices: 0, badgeUsage: {}, modeUsage: {}, achievements: [] };
      saveAchievements(freshAchievements);
      return {
        syncedStories: 0,
        achievements: freshAchievements,
        character: freshCharacter,
        abilities: { abilities: [], totalAbilitiesEarned: 0, abilitiesUsed: 0 }
      };
    }

    console.log(`🔄 Syncing ${totalStoriesStarted} stories (${totalStoriesCompleted} completed) from database...`);

    // Preserve any progress already unlocked locally so re-sync never downgrades
    // counts or strips achievements unlocked moments ago by updateProgress().
    const existingLocal = loadAchievements();
    const existingCharacter = loadCharacter();

    // Initialize fresh progress tracking
    let character = { ...DEFAULT_CHARACTER };
    let achievementProgress: AchievementProgress = {
      totalStories: totalStoriesCompleted,
      totalStoriesStarted: totalStoriesStarted,
      totalChoices: 0,
      badgeUsage: {},
      modeUsage: {},
      achievements: []
    };
    let abilityProgress: AbilityProgress = {
      abilities: [],
      totalAbilitiesEarned: 0,
      abilitiesUsed: 0
    };

    // Reset character in localStorage so gainExperience() replays from a
    // clean baseline instead of stacking XP on top of the previous sync.
    saveCharacter({ ...DEFAULT_CHARACTER });

    // Process detailed stories to rebuild progress accurately
    for (const story of completedStories) {
      const profile = story.profile as unknown as Profile;
      const sceneCount = story.scene_count || 0;
      const choiceCount = Math.max(0, sceneCount - 1); // Approximate choices

      // Update achievements
      achievementProgress.totalChoices += choiceCount;

      // Update badge usage
      if (profile.selectedBadges) {
        profile.selectedBadges.forEach((badge: string) => {
          achievementProgress.badgeUsage[badge] = (achievementProgress.badgeUsage[badge] || 0) + 1;
        });
      }

      // Update mode usage
      if (profile.mode) {
        achievementProgress.modeUsage[profile.mode] = (achievementProgress.modeUsage[profile.mode] || 0) + 1;
      }

      // Gain character experience (without checking achievements to avoid duplicates)
      const expResult = gainExperience(
        profile.selectedBadges || [],
        profile.mode || 'thrill',
        choiceCount,
        profile.storyLength || 'medium'
      );
      character = expResult.character;
    }

    // ALSO award per-scene XP for ACTIVE + PAUSED stories so mid-story progress
    // (12 XP per choice/scene) is preserved after Save & Exit and across devices.
    const inProgressStories = allStories.filter(s => s.status === 'active' || s.status === 'paused');
    for (const story of inProgressStories) {
      const sceneCount = story.scene_count || 0;
      if (sceneCount <= 0) continue;

      const xpToAward = sceneCount * 12; // matches gainSceneExperience (8 + 4)
      character.experience += xpToAward;
      character.totalExperienceEarned += xpToAward;

      // Process level-ups
      while (character.experience >= character.experienceToNext) {
        character.experience -= character.experienceToNext;
        character.level += 1;
        character.skillPoints += 2;
        character.experienceToNext = Math.floor(character.experienceToNext * 1.15);
      }
    }
    // Never downgrade character progress from a re-sync: keep the higher of
    // (computed-from-history) vs (existing local). Other sources of XP not
    // captured in user_stories (e.g. one-off bonuses) are preserved.
    if (existingCharacter.totalExperienceEarned > character.totalExperienceEarned) {
      character = {
        ...character,
        level: Math.max(character.level, existingCharacter.level),
        experience: existingCharacter.experience,
        experienceToNext: existingCharacter.experienceToNext,
        skillPoints: Math.max(character.skillPoints, existingCharacter.skillPoints),
        totalExperienceEarned: existingCharacter.totalExperienceEarned,
        attributes: existingCharacter.attributes,
        titles: Array.from(new Set([...(character.titles || []), ...(existingCharacter.titles || [])])),
        favoriteThemes: existingCharacter.favoriteThemes?.length ? existingCharacter.favoriteThemes : character.favoriteThemes,
      };
    }
    saveCharacter(character);

    // Merge with existing local progress: never downgrade totals, never drop
    // achievements that updateProgress() unlocked locally before this sync ran.
    achievementProgress.totalStories = Math.max(achievementProgress.totalStories, existingLocal.totalStories || 0);
    achievementProgress.totalStoriesStarted = Math.max(achievementProgress.totalStoriesStarted, existingLocal.totalStoriesStarted || 0);
    achievementProgress.totalChoices = Math.max(achievementProgress.totalChoices, existingLocal.totalChoices || 0);
    for (const [k, v] of Object.entries(existingLocal.badgeUsage || {})) {
      achievementProgress.badgeUsage[k] = Math.max(achievementProgress.badgeUsage[k] || 0, v as number);
    }
    for (const [k, v] of Object.entries(existingLocal.modeUsage || {})) {
      achievementProgress.modeUsage[k] = Math.max(achievementProgress.modeUsage[k] || 0, v as number);
    }
    // Preserve every previously-unlocked achievement (keep original unlockedAt).
    for (const prev of existingLocal.achievements || []) {
      if (!achievementProgress.achievements.some(a => a.id === prev.id)) {
        achievementProgress.achievements.push(prev);
      }
    }

    // Save merged totals to localStorage BEFORE checking for new achievements
    saveAchievements(achievementProgress);

    // Check for new achievements directly against computed totals (don't re-increment)
    const newlyUnlocked: typeof achievementProgress.achievements = [];
    for (const achievement of ALL_ACHIEVEMENTS) {
      if (achievementProgress.achievements.some(a => a.id === achievement.id)) continue;


      let unlocked = false;
      switch (achievement.id) {
        case "first_story": unlocked = achievementProgress.totalStoriesStarted >= 1; break;
        case "story_master": unlocked = achievementProgress.totalStories >= 5; break;
        case "legend": unlocked = achievementProgress.totalStories >= 10; break;
        case "decisive": unlocked = achievementProgress.totalChoices >= 25; break;
        case "tactician": unlocked = achievementProgress.totalChoices >= 100; break;
        case "mystic_master": unlocked = (achievementProgress.badgeUsage["mystic"] || 0) >= 3; break;
        case "beast_lord": unlocked = (achievementProgress.badgeUsage["beast"] || 0) >= 3; break;
        case "detective_ace": unlocked = (achievementProgress.badgeUsage["detective"] || 0) >= 3; break;
        case "action_hero": unlocked = (achievementProgress.badgeUsage["action"] || 0) >= 3; break;
        case "social_champion": unlocked = (achievementProgress.badgeUsage["social"] || 0) >= 3; break;
        case "creative_genius": unlocked = (achievementProgress.badgeUsage["creative"] || 0) >= 3; break;
        case "space_explorer": unlocked = (achievementProgress.badgeUsage["space"] || 0) >= 3; break;
        case "thrill_seeker": unlocked = (achievementProgress.modeUsage["thrill"] || 0) >= 3; break;
        case "mystery_solver": unlocked = (achievementProgress.modeUsage["mystery"] || 0) >= 3; break;
        case "explorer": unlocked = (achievementProgress.modeUsage["explore"] || 0) >= 3; break;
        case "comedy_master": unlocked = (achievementProgress.modeUsage["comedy"] || 0) >= 3; break;
        case "versatile": unlocked = Object.keys(achievementProgress.badgeUsage).length >= 7; break;
        case "adventurous": unlocked = Object.keys(achievementProgress.modeUsage).length >= 4; break;
      }

      if (unlocked) {
        const newAchievement = { ...achievement, unlockedAt: new Date().toISOString() };
        achievementProgress.achievements.push(newAchievement);
        newlyUnlocked.push(newAchievement);
      }
    }

    // Save again with any newly unlocked achievements
    if (newlyUnlocked.length > 0) {
      saveAchievements(achievementProgress);
    }
    
    // ABILITIES DISABLED - Uncomment to re-enable
    // saveAbilities(abilityProgress);

    console.log(`✅ Sync complete: ${totalStoriesCompleted} stories, ${achievementProgress.totalChoices} choices, ${newlyUnlocked.length} achievements, ${abilityProgress.totalAbilitiesEarned} abilities unlocked`);
    console.log(`📊 Character: Level ${character.level}, ${character.totalExperienceEarned} total XP`);

    return {
      syncedStories: totalStoriesCompleted,
      achievements: achievementProgress,
      character,
      abilities: abilityProgress
    };
  } catch (error) {
    console.error('Failed to sync progress from database:', error);
    throw error;
  }
};

/**
 * Checks if localStorage needs syncing from database
 * Returns true if localStorage is empty/missing data but database has stories
 */
export const needsSync = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if localStorage has achievement data
    const achievementsRaw = localStorage.getItem('smq.achievements');
    const characterRaw = localStorage.getItem('smq.character');
    
    // If localStorage is empty or has zero progress
    const hasLocalProgress = achievementsRaw && characterRaw;
    if (!hasLocalProgress) {
      // Check if database has completed stories
      const { data, error } = await supabase
        .from('user_stories')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .limit(1);
      
      if (error) throw error;
      
      // Needs sync if database has stories but localStorage doesn't
      return (data && data.length > 0);
    }

    // Check if localStorage shows zero progress but database has stories
    try {
      const achievements = JSON.parse(achievementsRaw);
      if (achievements.totalStories === 0) {
        const { data, error } = await supabase
          .from('user_stories')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .limit(1);
        
        if (error) throw error;
        return (data && data.length > 0);
      }
    } catch (e) {
      console.error('Failed to parse localStorage data:', e);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to check if sync needed:', error);
    return false;
  }
};
