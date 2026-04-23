import { supabase as supabaseClient } from "@/integrations/supabase/client";

// Cast to `any` because the `reading_sessions` table is not present in the
// generated Supabase types but exists in the database.
const supabase = supabaseClient as any;

export type ReadingSession = {
  id: string;
  user_id: string;
  story_id: string;
  words_read: number;
  reading_time_seconds: number;
  completed_at: string;
  story_title?: string;
};

export type ReadingStats = {
  totalWordsRead: number;
  totalReadingTimeMinutes: number;
  averageReadingSpeed: number; // words per minute
  sessionsThisWeek: number;
  sessionsThisMonth: number;
  currentStreak: number;
  longestStreak: number;
};

// Estimate words in text (rough but good enough)
export const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// Estimate reading time based on word count (average 200 words per minute for kids)
export const estimateReadingTime = (wordCount: number): number => {
  const wordsPerMinute = 200;
  return Math.ceil((wordCount / wordsPerMinute) * 60); // return seconds
};

// Track a reading session when story is completed
export const trackReadingSession = async (
  storyId: string,
  storyTitle: string,
  scenes: any[]
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Count total words in all scenes
    let totalWords = 0;
    scenes.forEach(scene => {
      if (scene.narrative) totalWords += countWords(scene.narrative);
      if (scene.choices) {
        scene.choices.forEach((choice: any) => {
          totalWords += countWords(choice.text || '');
        });
      }
    });

    const readingTimeSeconds = estimateReadingTime(totalWords);

    // Save to database
    const { error } = await supabase
      .from('reading_sessions')
      .insert({
        user_id: user.id,
        story_id: storyId,
        story_title: storyTitle,
        words_read: totalWords,
        reading_time_seconds: readingTimeSeconds,
        completed_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error tracking reading session:', error);
    }
  } catch (e) {
    console.error('Failed to track reading session:', e);
  }
};

// Track reading progress after each individual scene (incremental updates)
export const trackSceneReading = async (
  storyId: string,
  storyTitle: string,
  scene: any
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let sceneWords = 0;
    if (scene.narrative) sceneWords += countWords(scene.narrative);
    if (scene.choices) {
      scene.choices.forEach((choice: any) => {
        sceneWords += countWords(choice.text || '');
      });
    }

    if (sceneWords === 0) return;

    const readingTimeSeconds = estimateReadingTime(sceneWords);

    const { error } = await supabase
      .from('reading_sessions')
      .insert({
        user_id: user.id,
        story_id: `${storyId}_scene`,
        story_title: storyTitle,
        words_read: sceneWords,
        reading_time_seconds: readingTimeSeconds,
        completed_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error tracking scene reading:', error);
    }
  } catch (e) {
    console.error('Failed to track scene reading:', e);
  }
};

// Get reading statistics
export const getReadingStats = async (): Promise<ReadingStats> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        totalWordsRead: 0,
        totalReadingTimeMinutes: 0,
        averageReadingSpeed: 0,
        sessionsThisWeek: 0,
        sessionsThisMonth: 0,
        currentStreak: 0,
        longestStreak: 0
      };
    }

    // Get all reading sessions
    const { data: allSessions, error } = await supabase
      .from('reading_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false });

    if (error) throw error;

    let sessions = allSessions || [];

    // If no reading sessions exist, estimate from completed user_stories
    if (sessions.length === 0) {
      const { data: completedStories } = await supabase
        .from('user_stories')
        .select('id, scene_count, completed_at, title')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (completedStories && completedStories.length > 0) {
        // Estimate ~150 words per scene, ~45 seconds per scene for kids
        sessions = completedStories.map(story => ({
          id: story.id,
          user_id: user.id,
          story_id: story.id,
          words_read: (story.scene_count || 5) * 150,
          reading_time_seconds: (story.scene_count || 5) * 45,
          completed_at: story.completed_at || new Date().toISOString(),
          story_title: story.title || 'Adventure',
          created_at: story.completed_at || new Date().toISOString(),
        }));
      }
    }

    // Calculate totals
    const totalWords = sessions.reduce((sum, s) => sum + (s.words_read || 0), 0);
    const totalSeconds = sessions.reduce((sum, s) => sum + (s.reading_time_seconds || 0), 0);
    const totalMinutes = Math.round(totalSeconds / 60);
    const avgSpeed = totalMinutes > 0 ? Math.round(totalWords / totalMinutes) : 0;

    // Calculate this week and this month
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const sessionsThisWeek = sessions.filter(s => 
      new Date(s.completed_at) >= weekAgo
    ).length;

    const sessionsThisMonth = sessions.filter(s => 
      new Date(s.completed_at) >= monthAgo
    ).length;

    // Calculate streak (consecutive days with reading)
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    if (sessions.length > 0) {
      const dates = sessions.map(s => new Date(s.completed_at).toISOString().split('T')[0]);
      const uniqueDates = [...new Set(dates)].sort().reverse() as string[];
      
      // Current streak
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
        currentStreak = 1;
        let checkDate = new Date(uniqueDates[0]);
        
        for (let i = 1; i < uniqueDates.length; i++) {
          const prevDate = new Date(uniqueDates[i]);
          const dayDiff = Math.floor((checkDate.getTime() - prevDate.getTime()) / 86400000);
          
          if (dayDiff === 1) {
            currentStreak++;
            checkDate = prevDate;
          } else {
            break;
          }
        }
      }

      // Longest streak
      for (let i = 0; i < uniqueDates.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const currDate = new Date(uniqueDates[i]);
          const prevDate = new Date(uniqueDates[i - 1]);
          const dayDiff = Math.floor((prevDate.getTime() - currDate.getTime()) / 86400000);
          
          if (dayDiff === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    return {
      totalWordsRead: totalWords,
      totalReadingTimeMinutes: totalMinutes,
      averageReadingSpeed: avgSpeed,
      sessionsThisWeek,
      sessionsThisMonth,
      currentStreak,
      longestStreak
    };
  } catch (e) {
    console.error('Failed to get reading stats:', e);
    return {
      totalWordsRead: 0,
      totalReadingTimeMinutes: 0,
      averageReadingSpeed: 0,
      sessionsThisWeek: 0,
      sessionsThisMonth: 0,
      currentStreak: 0,
      longestStreak: 0
    };
  }
};

// Get recent reading sessions for display
export const getRecentReadingSessions = async (limit: number = 10): Promise<ReadingSession[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('reading_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Failed to get recent sessions:', e);
    return [];
  }
};

// Get reading stats for a specific date range
export const getReadingStatsForRange = async (
  startDate: Date,
  endDate: Date
): Promise<{ totalWords: number; totalMinutes: number; sessionCount: number }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { totalWords: 0, totalMinutes: 0, sessionCount: 0 };

    const { data, error } = await supabase
      .from('reading_sessions')
      .select('words_read, reading_time_seconds')
      .eq('user_id', user.id)
      .gte('completed_at', startDate.toISOString())
      .lte('completed_at', endDate.toISOString());

    if (error) throw error;

    const sessions = data || [];
    const totalWords = sessions.reduce((sum, s) => sum + (s.words_read || 0), 0);
    const totalSeconds = sessions.reduce((sum, s) => sum + (s.reading_time_seconds || 0), 0);

    return {
      totalWords,
      totalMinutes: Math.round(totalSeconds / 60),
      sessionCount: sessions.length
    };
  } catch (e) {
    console.error('Failed to get stats for range:', e);
    return { totalWords: 0, totalMinutes: 0, sessionCount: 0 };
  }
};
