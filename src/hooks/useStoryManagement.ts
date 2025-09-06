import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createUserStory, getActiveUserStory, userStoryToSavedStory } from '@/lib/userStories';
import { loadCurrentStory, SavedStory, Profile } from '@/lib/story';

export const useStoryManagement = () => {
  const { user } = useAuth();
  const [currentStory, setCurrentStory] = useState<SavedStory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
  const loadStory = async () => {
      setIsLoading(true);
      try {
        if (user) {
          // Load from database for authenticated users
          const { story, error } = await getActiveUserStory();
          if (!error && story) {
            setCurrentStory(userStoryToSavedStory(story));
          } else {
            setCurrentStory(null);
          }
        } else {
          // Load from localStorage for non-authenticated users
          const story = loadCurrentStory(); // Use synchronous version
          setCurrentStory(story);
        }
      } catch (e) {
        console.error('Error loading story:', e);
        setCurrentStory(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadStory();
  }, [user]);

  const createNewStory = async (profile: Profile): Promise<{ success: boolean; storyId?: string; error?: any }> => {
    try {
      if (user) {
        // Create in database for authenticated users
        const { story, error } = await createUserStory(profile);
        if (error) {
          return { success: false, error };
        }
        if (story) {
          const savedStory = userStoryToSavedStory(story);
          setCurrentStory(savedStory);
          return { success: true, storyId: story.id };
        }
      } else {
        // Create locally for non-authenticated users
        const newStory: SavedStory = {
          id: crypto.randomUUID(),
          profile,
          scenes: [],
          currentSceneIndex: 0,
          startedAt: new Date().toISOString(),
          lastPlayedAt: new Date().toISOString(),
          completed: false,
        };
        setCurrentStory(newStory);
        return { success: true, storyId: newStory.id };
      }
      
      return { success: false, error: 'Unknown error' };
    } catch (e) {
      return { success: false, error: e };
    }
  };

  return {
    currentStory,
    setCurrentStory,
    isLoading,
    createNewStory,
  };
};