import { supabase } from '@/integrations/supabase/client';
import { saveAchievements, updateProgress, AchievementProgress } from './achievements';
import { saveCharacter, gainExperience, DEFAULT_CHARACTER, CharacterStats } from './character';
import { Profile } from './story';

/**
 * Syncs user progress from database to localStorage
 * This is needed when localStorage is cleared or user switches devices
 */
export const syncProgressFromDatabase = async (): Promise<{
  syncedStories: number;
  achievements: AchievementProgress;
  character: CharacterStats;
}> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No authenticated user, skipping sync');
      return {
        syncedStories: 0,
        achievements: { totalStories: 0, totalChoices: 0, badgeUsage: {}, modeUsage: {}, achievements: [] },
        character: DEFAULT_CHARACTER
      };
    }

    // Get all completed stories from database
    const { data: completedStories, error } = await supabase
      .from('user_stories')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch completed stories:', error);
      throw error;
    }

    if (!completedStories || completedStories.length === 0) {
      console.log('No completed stories found in database');
      return {
        syncedStories: 0,
        achievements: { totalStories: 0, totalChoices: 0, badgeUsage: {}, modeUsage: {}, achievements: [] },
        character: DEFAULT_CHARACTER
      };
    }

    console.log(`🔄 Syncing ${completedStories.length} completed stories from database...`);

    // Initialize fresh progress tracking
    let character = { ...DEFAULT_CHARACTER };
    let achievementProgress: AchievementProgress = {
      totalStories: 0,
      totalChoices: 0,
      badgeUsage: {},
      modeUsage: {},
      achievements: []
    };

    // Process each completed story to rebuild progress
    for (const story of completedStories) {
      const profile = story.profile as unknown as Profile;
      const sceneCount = story.scene_count || 0;
      const choiceCount = Math.max(0, sceneCount - 1); // Approximate choices

      // Update achievements
      achievementProgress.totalStories += 1;
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

    // Now check all achievements at once based on the totals
    const allNewAchievements = updateProgress(
      [], // Don't pass badges since we already updated the totals
      '', // Don't pass mode
      0   // Don't add more choices
    );

    console.log(`✅ Sync complete: ${completedStories.length} stories, ${achievementProgress.totalChoices} choices, ${allNewAchievements.length} achievements unlocked`);
    console.log(`📊 Character: Level ${character.level}, ${character.totalExperienceEarned} total XP`);

    return {
      syncedStories: completedStories.length,
      achievements: achievementProgress,
      character
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
