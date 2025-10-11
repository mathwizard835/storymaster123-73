import { supabase } from '@/integrations/supabase/client';
import { Profile, Scene, SavedStory, InventoryItem } from './story';
import { loadInventory } from './inventory';

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

// Save current story to database with inventory snapshot
export const saveStoryToDatabase = async (story: SavedStory, currentInventory?: InventoryItem[]): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get current inventory if not provided
  const inventory = currentInventory || loadInventory();

  const storyData = {
    id: story.id,
    user_id: user.id,
    profile: {
      ...story.profile,
      inventory // Save inventory in profile
    },
    scenes: story.scenes,
    current_scene_index: story.currentSceneIndex || 0,
    started_at: story.startedAt,
    last_played_at: story.lastPlayedAt,
    completed_at: story.completed ? new Date().toISOString() : null,
    scene_count: story.scenes.length,
    choices_made: [], // TODO: track choices made
    status: story.completed ? 'completed' : 'active',
    title: story.scenes[0]?.sceneTitle || 'Untitled Adventure'
  };

  const { error } = await (supabase as any)
    .from('user_stories')
    .upsert(storyData);

  if (error) {
    console.error('Error saving story:', error);
    throw error;
  }
};

// Load current active story from database with inventory reconciliation
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

  // Use inventory from profile
  const inventory = data.profile?.inventory || [];

  return {
    id: data.id,
    profile: {
      ...data.profile,
      inventory // Ensure inventory is in profile
    },
    scenes: data.scenes,
    currentSceneIndex: data.current_scene_index,
    startedAt: data.started_at,
    lastPlayedAt: data.last_played_at,
    completed: data.status === 'completed'
  };
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