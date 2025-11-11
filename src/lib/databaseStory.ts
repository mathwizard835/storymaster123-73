import { supabase } from '@/integrations/supabase/client';
import { Profile, Scene, SavedStory } from './story';

export interface DatabaseStory {
  id: string;
  user_id: string;
  profile: Profile;
  scenes: Scene[];
  current_scene_index: number;
  started_at: string;
  last_played_at: string;
  completed_at?: string;
  scene_count: number;
  choices_made: string[];
  status: 'active' | 'completed' | 'paused';
  title?: string;
}

// Phase 1: Clear ALL active stories for the current user
export const clearAllActiveStoriesForUser = async (): Promise<number> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get all active stories
  const { data: activeStories } = await (supabase as any)
    .from('user_stories')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active');

  const count = activeStories?.length || 0;
  
  if (count > 0) {
    console.log(`🧹 Cleaning up ${count} orphaned active stories`);
    
    // Mark ALL active stories as completed
    const { error } = await (supabase as any)
      .from('user_stories')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (error) {
      console.error('Error clearing active stories:', error);
      throw error;
    }
  }

  return count;
};

// Phase 4: Verify a specific story is still active
export const verifyStoryIsActive = async (storyId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await (supabase as any)
    .from('user_stories')
    .select('id')
    .eq('id', storyId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('Error verifying story status:', error);
    return false;
  }

  return !!data;
};

// Phase 6: Improved save with verification - CLEAR FIRST, THEN SAVE
export const saveStoryToDatabase = async (story: SavedStory): Promise<DatabaseStory | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // CRITICAL: Clear ALL other active stories FIRST, before attempting to save
  // This prevents unique constraint violations from the database index
  const { data: otherActiveStories } = await (supabase as any)
    .from('user_stories')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .neq('id', story.id);

  // If found, mark them as completed IMMEDIATELY
  if (otherActiveStories && otherActiveStories.length > 0) {
    console.warn(`⚠️ Found ${otherActiveStories.length} other active stories, marking as completed NOW`);
    const { error: clearError } = await (supabase as any)
      .from('user_stories')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString() 
      })
      .in('id', otherActiveStories.map((s: any) => s.id));
    
    if (clearError) {
      console.error('❌ Failed to clear other active stories:', clearError);
      throw new Error('Failed to clear existing active stories');
    }
    
    console.log('✅ Successfully cleared other active stories');
  }

  const storyData = {
    id: story.id,
    user_id: user.id,
    profile: story.profile,
    scenes: story.scenes,
    current_scene_index: story.currentSceneIndex || 0,
    started_at: story.startedAt,
    last_played_at: story.lastPlayedAt,
    completed_at: story.completed ? new Date().toISOString() : null,
    scene_count: story.scenes.length,
    choices_made: [],
    status: story.completed ? 'completed' : 'active',
    title: story.scenes[0]?.sceneTitle || 'Untitled Adventure'
  };

  const { data: savedData, error } = await (supabase as any)
    .from('user_stories')
    .upsert(storyData)
    .select()
    .single();

  if (error) {
    console.error('❌ Error saving story:', error);
    throw error;
  }

  console.log(`✅ Story saved successfully: ${story.id} (scene ${story.currentSceneIndex + 1})`);
  
  // Return saved data for verification
  return savedData;
};

// Load current active story from database
export const loadCurrentStoryFromDatabase = async (): Promise<SavedStory | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await (supabase as any)
    .from('user_stories')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('last_played_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error loading story:', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    profile: data.profile,
    scenes: data.scenes,
    currentSceneIndex: data.current_scene_index,
    startedAt: data.started_at,
    lastPlayedAt: data.last_played_at,
    completed: data.status === 'completed',
    choicesMade: 0 // Reset choice counter for loaded stories
  };
};

// Load all recent stories (both in-progress and completed) from database
export const loadRecentStoriesFromDatabase = async (): Promise<DatabaseStory[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await (supabase as any)
    .from('user_stories')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['active', 'paused', 'completed'])
    .order('last_played_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error loading recent stories:', error);
    return [];
  }

  return data || [];
};

// Load completed stories from database
export const loadCompletedStoriesFromDatabase = async (): Promise<DatabaseStory[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await (supabase as any)
    .from('user_stories')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  if (error) {
    console.error('Error loading completed stories:', error);
    return [];
  }

  return data || [];
};

// Mark story as completed in database
export const markStoryCompletedInDatabase = async (storyId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await (supabase as any)
    .from('user_stories')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', storyId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error marking story as completed:', error);
    throw error;
  }
};

// Clear current story (mark as completed or delete)
export const clearCurrentStoryInDatabase = async (storyId: string): Promise<void> => {
  await markStoryCompletedInDatabase(storyId);
};