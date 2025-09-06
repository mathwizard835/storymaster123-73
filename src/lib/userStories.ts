import { supabase } from "@/integrations/supabase/client";
import { Profile, Scene, SavedStory, CompletedStory } from "./story";
import type { Database } from "@/integrations/supabase/types";

type UserStoryRow = Database['public']['Tables']['user_stories']['Row'];

export type UserStory = {
  id: string;
  user_id: string;
  title?: string;
  profile: Profile;
  scenes: Scene[];
  current_scene_index: number;
  started_at: string;
  last_played_at: string;
  completed_at?: string;
  scene_count: number;
  choices_made: string[];
  status: 'active' | 'completed' | 'abandoned';
};

// Convert database row to UserStory
const convertRowToUserStory = (row: UserStoryRow): UserStory => ({
  id: row.id,
  user_id: row.user_id,
  title: row.title || undefined,
  profile: row.profile as Profile,
  scenes: (row.scenes as Scene[]) || [],
  current_scene_index: row.current_scene_index,
  started_at: row.started_at,
  last_played_at: row.last_played_at,
  completed_at: row.completed_at || undefined,
  scene_count: row.scene_count,
  choices_made: (row.choices_made as string[]) || [],
  status: row.status as 'active' | 'completed' | 'abandoned'
});

// Create a new story for the user
export const createUserStory = async (profile: Profile): Promise<{ story: UserStory | null; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { story: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('user_stories')
      .insert([
        {
          user_id: user.id,
          profile: profile,
          scenes: [],
          current_scene_index: 0,
          scene_count: 0,
          choices_made: [],
          status: 'active'
        }
      ])
      .select()
      .single();

    return { story: data ? convertRowToUserStory(data) : null, error };
  } catch (e) {
    return { story: null, error: e };
  }
};

// Update story with new scene
export const updateUserStory = async (
  storyId: string,
  scenes: Scene[],
  currentSceneIndex: number,
  choicesMade?: string[]
): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('user_stories')
      .update({
        scenes: scenes,
        current_scene_index: currentSceneIndex,
        last_played_at: new Date().toISOString(),
        scene_count: scenes.length,
        ...(choicesMade && { choices_made: choicesMade })
      })
      .eq('id', storyId);

    return { error };
  } catch (e) {
    return { error: e };
  }
};

// Mark story as completed
export const completeUserStory = async (
  storyId: string,
  title: string,
  choicesMade: string[]
): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('user_stories')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        title: title,
        choices_made: choicesMade
      })
      .eq('id', storyId);

    return { error };
  } catch (e) {
    return { error: e };
  }
};

// Get user's active story
export const getActiveUserStory = async (): Promise<{ story: UserStory | null; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { story: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('user_stories')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('last_played_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return { story: data ? convertRowToUserStory(data) : null, error };
  } catch (e) {
    return { story: null, error: e };
  }
};

// Get user's completed stories
export const getCompletedUserStories = async (): Promise<{ stories: UserStory[]; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { stories: [], error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('user_stories')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    return { stories: data ? data.map(convertRowToUserStory) : [], error };
  } catch (e) {
    return { stories: [], error: e };
  }
};

// Get all user stories
export const getAllUserStories = async (): Promise<{ stories: UserStory[]; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { stories: [], error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('user_stories')
      .select('*')
      .eq('user_id', user.id)
      .order('last_played_at', { ascending: false });

    return { stories: data ? data.map(convertRowToUserStory) : [], error };
  } catch (e) {
    return { stories: [], error: e };
  }
};

// Delete/abandon a story
export const abandonUserStory = async (storyId: string): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('user_stories')
      .update({ status: 'abandoned' })
      .eq('id', storyId);

    return { error };
  } catch (e) {
    return { error: e };
  }
};

// Convert UserStory to legacy SavedStory format for compatibility
export const userStoryToSavedStory = (userStory: UserStory): SavedStory => ({
  id: userStory.id,
  profile: userStory.profile,
  scenes: userStory.scenes,
  currentSceneIndex: userStory.current_scene_index,
  startedAt: userStory.started_at,
  lastPlayedAt: userStory.last_played_at,
  completed: userStory.status === 'completed'
});

// Convert UserStory to legacy CompletedStory format for compatibility
export const userStoryToCompletedStory = (userStory: UserStory): CompletedStory => ({
  id: userStory.id,
  title: userStory.title || 'Untitled Adventure',
  profile: userStory.profile,
  completedAt: userStory.completed_at || new Date().toISOString(),
  sceneCount: userStory.scene_count,
  choicesMade: userStory.choices_made
});