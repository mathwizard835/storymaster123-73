import { NavigateFunction } from 'react-router-dom';
import { loadCurrentStoryFromDatabase } from './databaseStory';

export interface StartNewStoryOptions {
  navigate: NavigateFunction;
  onActiveStoryDetected?: () => void;
  forceNavigate?: boolean;
}

/**
 * Safely navigate to start a new story.
 * Checks for active stories and prevents accidental overwrites.
 * 
 * @param options.navigate - React Router navigate function
 * @param options.onActiveStoryDetected - Callback when active story exists (show dialog)
 * @param options.forceNavigate - Skip active story check (use with caution)
 */
export const safeStartNewStory = async ({
  navigate,
  onActiveStoryDetected,
  forceNavigate = false
}: StartNewStoryOptions): Promise<void> => {
  if (forceNavigate) {
    navigate("/profile?new=true");
    return;
  }

  try {
    const activeStory = await loadCurrentStoryFromDatabase();
    
    if (activeStory && activeStory.scenes.length > 0) {
      // Active story exists - trigger callback for confirmation dialog
      console.log('📖 Active story detected, showing confirmation dialog');
      onActiveStoryDetected?.();
    } else {
      // No active story - safe to proceed
      console.log('✅ No active story, proceeding to create new story');
      navigate("/profile?new=true");
    }
  } catch (error) {
    console.error('Error checking for active story:', error);
    // On error, assume no active story to avoid blocking user
    navigate("/profile?new=true");
  }
};

/**
 * Navigate to continue existing story
 */
export const continueStory = (navigate: NavigateFunction) => {
  console.log('📖 Continuing existing story');
  navigate("/mission"); // Without ?new=true
};
