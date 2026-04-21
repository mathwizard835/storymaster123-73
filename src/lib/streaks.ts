import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/story";

export type DailyStreak = {
  id: string;
  device_id: string;
  user_id?: string | null;
  current_streak: number;
  longest_streak: number;
  last_story_date?: string;
  bonus_stories_earned: number;
  created_at: string;
  updated_at: string;
};

export const updateDailyStreak = async (): Promise<{
  newStreak: number;
  bonusEarned: number;
  isNewRecord: boolean;
}> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Not authenticated — cannot update streaks under new RLS.
      return { newStreak: 0, bonusEarned: 0, isNewRecord: false };
    }
    const deviceId = await getDeviceId();
    const today = new Date().toISOString().split('T')[0];

    // Get existing streak data for this user
    let { data: streak } = await supabase
      .from('daily_streaks')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!streak) {
      // Create new streak record
      const { error } = await supabase
        .from('daily_streaks')
        .insert([{
          user_id: user.id,
          device_id: deviceId,
          current_streak: 1,
          longest_streak: 1,
          last_story_date: today,
          bonus_stories_earned: 0
        }]);

      if (error) throw error;

      return {
        newStreak: 1,
        bonusEarned: 0,
        isNewRecord: true
      };
    }

    // Check if already played today
    if (streak.last_story_date === today) {
      return {
        newStreak: streak.current_streak,
        bonusEarned: 0,
        isNewRecord: false
      };
    }

    const lastDate = new Date(streak.last_story_date || '');
    const todayDate = new Date(today);
    const daysDifference = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    let newCurrentStreak: number;
    let bonusEarned = 0;

    if (daysDifference === 1) {
      newCurrentStreak = streak.current_streak + 1;
    } else {
      newCurrentStreak = 1;
    }

    const streakMilestones = [3, 7, 14, 30, 50, 100];
    if (streakMilestones.includes(newCurrentStreak)) {
      bonusEarned = Math.floor(newCurrentStreak / 3);
    }

    const newLongestStreak = Math.max(streak.longest_streak, newCurrentStreak);
    const isNewRecord = newCurrentStreak > streak.longest_streak;

    await supabase
      .from('daily_streaks')
      .update({
        current_streak: newCurrentStreak,
        longest_streak: newLongestStreak,
        last_story_date: today,
        bonus_stories_earned: streak.bonus_stories_earned + bonusEarned
      })
      .eq('user_id', user.id);

    return {
      newStreak: newCurrentStreak,
      bonusEarned,
      isNewRecord
    };
  } catch (e) {
    console.error("Failed to update daily streak", e);
    return {
      newStreak: 0,
      bonusEarned: 0,
      isNewRecord: false
    };
  }
};

export const getDailyStreak = async (): Promise<DailyStreak | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('daily_streaks')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (e) {
    console.error("Failed to get daily streak", e);
    return null;
  }
};

export const getStreakStats = async (): Promise<{
  currentStreak: number;
  longestStreak: number;
  bonusStoriesEarned: number;
  daysUntilNextBonus: number;
  nextMilestone: number;
}> => {
  try {
    const streak = await getDailyStreak();
    
    if (!streak) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        bonusStoriesEarned: 0,
        daysUntilNextBonus: 3,
        nextMilestone: 3
      };
    }

    const streakMilestones = [3, 7, 14, 30, 50, 100];
    const nextMilestone = streakMilestones.find(m => m > streak.current_streak) || 100;
    const daysUntilNextBonus = nextMilestone - streak.current_streak;

    return {
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
      bonusStoriesEarned: streak.bonus_stories_earned,
      daysUntilNextBonus,
      nextMilestone
    };
  } catch (e) {
    console.error("Failed to get streak stats", e);
    return {
      currentStreak: 0,
      longestStreak: 0,
      bonusStoriesEarned: 0,
      daysUntilNextBonus: 3,
      nextMilestone: 3
    };
  }
};
