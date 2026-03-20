import { supabase } from '@/integrations/supabase/client';
import { saveAchievements, updateProgress, AchievementProgress } from './achievements';
import { saveCharacter, gainExperience, DEFAULT_CHARACTER, CharacterStats } from './character';
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
        achievements: { totalStories: 0, totalChoices: 0, badgeUsage: {}, modeUsage: {}, achievements: [] },
        character: DEFAULT_CHARACTER,
        abilities: { abilities: [], totalAbilitiesEarned: 0, abilitiesUsed: 0 }
      };
    }

    // Get completed stories from user_stories (uses user_id-based RLS which works reliably)
    const userStoriesResult = await supabase
      .from('user_stories')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: true });

    if (userStoriesResult.error) {
      console.error('Failed to fetch completed stories:', userStoriesResult.error);
      throw userStoriesResult.error;
    }

    const completedStories = userStoriesResult.data || [];
    const totalStoriesCompleted = completedStories.length;

    if (totalStoriesCompleted === 0) {
      console.log('No completed stories found in database');
      return {
        syncedStories: 0,
        achievements: { totalStories: 0, totalChoices: 0, badgeUsage: {}, modeUsage: {}, achievements: [] },
        character: DEFAULT_CHARACTER,
        abilities: { abilities: [], totalAbilitiesEarned: 0, abilitiesUsed: 0 }
      };
    }

    console.log(`🔄 Syncing ${totalStoriesCompleted} completed stories from database (${completedStories.length} detailed)...`);

    // Initialize fresh progress tracking
    let character = { ...DEFAULT_CHARACTER };
    // Save fresh character to localStorage so gainExperience reads from clean state
    saveCharacter(character);
    let achievementProgress: AchievementProgress = {
      totalStories: totalStoriesCompleted, // Use actual count from story_completions
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
      
      // ABILITIES DISABLED - Uncomment to re-enable
      // // Check and award abilities for this story
      // const newAbilities = checkAndAwardAbilities(
      //   profile.selectedBadges || [],
      //   choiceCount,
      //   true,
      //   profile
      // );
      // 
      // // Add new abilities to the progress (abilities are saved by checkAndAwardAbilities)
      // if (newAbilities.length > 0) {
      //   abilityProgress.totalAbilitiesEarned += newAbilities.length;
      // }
    }

    // Now check all achievements at once based on the totals
    const allNewAchievements = updateProgress(
      [], // Don't pass badges since we already updated the totals
      '', // Don't pass mode
      0   // Don't add more choices
    );
    
    // ABILITIES DISABLED - Uncomment to re-enable
    // saveAbilities(abilityProgress);

    console.log(`✅ Sync complete: ${totalStoriesCompleted} stories, ${achievementProgress.totalChoices} choices, ${allNewAchievements.length} achievements, ${abilityProgress.totalAbilitiesEarned} abilities unlocked`);
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
