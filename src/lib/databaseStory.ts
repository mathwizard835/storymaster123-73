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

// Phase 1: Pause ALL active stories for the current user (not complete, so they can resume)
export const pauseAllActiveStoriesForUser = async (): Promise<number> => {
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
    console.log(`⏸️ Pausing ${count} active stories for user`);
    
    // Mark ALL active stories as PAUSED (not completed) so users can continue them later
    const { error } = await (supabase as any)
      .from('user_stories')
      .update({
        status: 'paused',
        last_played_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (error) {
      console.error('Error pausing active stories:', error);
      throw error;
    }
  }

  return count;
};

// Legacy function name for backwards compatibility - now pauses instead of completing
export const clearAllActiveStoriesForUser = pauseAllActiveStoriesForUser;

// Phase 4: Verify a specific story is still active or paused
export const verifyStoryIsActive = async (storyId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await (supabase as any)
    .from('user_stories')
    .select('id')
    .eq('id', storyId)
    .eq('user_id', user.id)
    .in('status', ['active', 'paused']) // Include paused stories
    .maybeSingle();

  if (error) {
    console.error('Error verifying story status:', error);
    return false;
  }

  return !!data;
};

// Phase 6: Improved save with verification - PAUSE OTHER STORIES, THEN SAVE
export const saveStoryToDatabase = async (story: SavedStory): Promise<DatabaseStory | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // CRITICAL: Pause ALL other active stories FIRST, before attempting to save
  // This prevents unique constraint violations from the database index
  // IMPORTANT: We now PAUSE (not complete) other stories so users can continue them later
  const { data: otherActiveStories } = await (supabase as any)
    .from('user_stories')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .neq('id', story.id);

  // If found, mark them as PAUSED (not completed) so users can continue them later
  if (otherActiveStories && otherActiveStories.length > 0) {
    console.log(`⏸️ Found ${otherActiveStories.length} other active stories, pausing them`);
    const { error: pauseError } = await (supabase as any)
      .from('user_stories')
      .update({ 
        status: 'paused',
        last_played_at: new Date().toISOString() 
      })
      .in('id', otherActiveStories.map((s: any) => s.id));
    
    if (pauseError) {
      console.error('❌ Failed to pause other active stories:', pauseError);
      throw new Error('Failed to pause existing active stories');
    }
    
    console.log('✅ Successfully paused other active stories');
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

// Load a specific story by ID from database
export const loadStoryByIdFromDatabase = async (storyId: string): Promise<SavedStory | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await (supabase as any)
    .from('user_stories')
    .select('*')
    .eq('id', storyId)
    .eq('user_id', user.id) // Ensure user owns this story
    .maybeSingle();

  if (error) {
    console.error('Error loading story by ID:', error);
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
    choicesMade: 0
  };
};

// Get all in-progress stories for the current user
export const loadInProgressStoriesFromDatabase = async (): Promise<DatabaseStory[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await (supabase as any)
    .from('user_stories')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['active', 'paused'])
    .order('last_played_at', { ascending: false });

  if (error) {
    console.error('Error loading in-progress stories:', error);
    return [];
  }

  return data || [];
};

// Pause current story (mark as paused instead of completed)
export const pauseStoryInDatabase = async (storyId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await (supabase as any)
    .from('user_stories')
    .update({
      status: 'paused',
      last_played_at: new Date().toISOString()
    })
    .eq('id', storyId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error pausing story:', error);
    throw error;
  }
  
  console.log(`⏸️ Story ${storyId} paused`);
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