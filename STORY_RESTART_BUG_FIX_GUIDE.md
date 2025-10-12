# Story Restart Bug - Complete Fix Guide

## Problem Overview

Users are experiencing an unexpected behavior where they're in the middle of reading a story, and suddenly a **new story starts** based on the same profile settings, causing confusion and lost progress.

### Root Cause

The application uses a URL parameter `?new=true` on the `/mission` route to indicate when a fresh story should be started. When this parameter is present, the Mission page:

1. Skips loading any existing active story
2. Clears all active stories from the database
3. Creates a brand new story session

**The bug occurs when users navigate to `/mission?new=true` while already having an active story**, typically by:
- Clicking \"New Adventure\" from the Dashboard
- Clicking \"Start New Adventure\" within a story
- Any navigation that appends `?new=true` without user confirmation

## Why This Happens

Looking at `src/pages/Mission.tsx` lines 194-224:

```typescript
// Check if user wants to start fresh (from URL param)
const forceNew = searchParams.get('new') === 'true';

// Skip loading existing story for trial mode or if forcing new story
if (!isTrialMode && !forceNew) {
  const existingStory = await loadCurrentStoryFromDatabase();
  if (existingStory && existingStory.scenes.length > 0) {
    // Resume existing story...
    return;
  }
}

// If forceNew is true, it reaches here and clears everything:
console.log('🧹 Preparing to create new story - clearing all existing active stories');
const clearedCount = await clearAllActiveStoriesForUser();
// ... creates new story
```

**The logic is correct** - it's designed to clear active stories when starting fresh. **The bug is that navigation to `/mission?new=true` happens without proper user confirmation.**

## Console Log Evidence

When the bug occurs, you'll see this pattern in the console:

```
✅ Story saved successfully: [story-id] (scene 3)
[User continues reading...]
🧹 Preparing to create new story - clearing all existing active stories
🧹 Cleaning up 1 orphaned active stories
✅ Cleared 1 active stories
Scene cache cleared
🆕 Starting fresh story session: [new-story-id]
```

Notice how it suddenly \"prepares to create new story\" and clears the existing one mid-session.

## Diagnosis Steps

### Step 1: Identify Navigation Sources

Search for all locations that navigate to `/mission` with the `?new=true` parameter:

```bash
# Search for navigation to /mission?new=true
grep -r \"mission?new=true\" src/
grep -r 'mission\\\\\\\\?new=true' src/
grep -r \"/mission\" src/pages/*.tsx
```

Common culprits:
- **Dashboard.tsx**: \"New Adventure\" button
- **Index.tsx**: \"Start New Story\" button  
- **Mission.tsx**: \"Start New Adventure\" button (inside stories)
- Any other button that says \"Start Fresh\", \"New Story\", etc.

### Step 2: Check for Missing Confirmation Dialogs

For each navigation source found in Step 1, verify:

1. ✅ Does it check if an active story exists before navigating?
2. ✅ Does it show a confirmation dialog if an active story exists?
3. ✅ Does the dialog clearly explain: \"You have an active story. Starting a new one will end your current progress\"?

### Step 3: Verify Active Story Detection

Check that the application correctly detects active stories:

**In Dashboard.tsx:**
```typescript
useEffect(() => {
  const loadStories = async () => {
    if (user) {
      const stories = await loadRecentStoriesFromDatabase();
      setRecentStories(stories);
      
      // Check for any active or paused story
      const activeStoryExists = stories.some(story => 
        story.status === 'active' || story.status === 'paused'
      );
      setHasActiveStory(activeStoryExists);
    }
  };
  loadStories();
}, [user]);
```

**Common issues:**
- `hasActiveStory` not being set correctly
- Checking only for `'active'` status, missing `'paused'`
- Not waiting for database query to complete before allowing navigation

## The Complete Fix

### Fix 1: Dashboard \"New Adventure\" Button

**File:** `src/pages/Dashboard.tsx`

**Current problematic code (if exists):**
```typescript
<Button onClick={() => navigate(\"/mission?new=true\")}>
  New Adventure
</Button>
```

**Correct implementation:**
```typescript
// Add state for dialog
const [showNewStoryDialog, setShowNewStoryDialog] = useState(false);
const [hasActiveStory, setHasActiveStory] = useState(false);

// Load active story status on mount
useEffect(() => {
  const checkActiveStory = async () => {
    if (user) {
      const currentStory = await loadCurrentStoryFromDatabase();
      setHasActiveStory(!!currentStory);
    }
  };
  checkActiveStory();
}, [user]);

// Button with confirmation
<Button 
  onClick={() => {
    if (hasActiveStory) {
      setShowNewStoryDialog(true);
    } else {
      navigate(\"/mission?new=true\");
    }
  }}
>
  New Adventure
</Button>

// Confirmation Dialog (add near the end of component)
<Dialog open={showNewStoryDialog} onOpenChange={setShowNewStoryDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Start New Adventure?</DialogTitle>
      <DialogDescription>
        You have an active story in progress. Starting a new adventure will 
        save your current progress but start a completely fresh story.
      </DialogDescription>
    </DialogHeader>
    <div className=\"flex gap-3 justify-end mt-4\">
      <Button
        variant=\"outline\"
        onClick={() => setShowNewStoryDialog(false)}
      >
        Cancel
      </Button>
      <Button
        onClick={() => {
          setShowNewStoryDialog(false);
          navigate(\"/mission?new=true\");
        }}
      >
        Start New Story
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

### Fix 2: Mission \"Start New Adventure\" Button

**File:** `src/pages/Mission.tsx`

The \"Start New Adventure\" button inside an active story should always show confirmation:

**Look for this pattern (around line 950):**
```typescript
<Button onClick={() => {
  setShowNewStoryDialog(true);
}}>
  Start New Adventure
</Button>
```

**Ensure dialog exists:**
```typescript
<Dialog open={showNewStoryDialog} onOpenChange={setShowNewStoryDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Start New Adventure?</DialogTitle>
      <DialogDescription>
        This will end your current story and start a completely new adventure.
        Your progress will be saved in your story history.
      </DialogDescription>
    </DialogHeader>
    <div className=\"flex gap-3 justify-end mt-4\">
      <Button
        variant=\"outline\"
        onClick={() => setShowNewStoryDialog(false)}
      >
        Cancel
      </Button>
      <Button
        onClick={() => {
          setShowNewStoryDialog(false);
          navigate(\"/mission?new=true\");
        }}
      >
        Confirm New Story
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

### Fix 3: Index Page \"Start New Story\" Button

**File:** `src/pages/Index.tsx`

Same pattern - check for active story before navigating:

```typescript
const [hasActiveStory, setHasActiveStory] = useState(false);

useEffect(() => {
  const checkActive = async () => {
    if (user) {
      const story = await loadCurrentStoryFromDatabase();
      setHasActiveStory(!!story);
    }
  };
  checkActive();
}, [user]);

<Button 
  onClick={() => {
    if (hasActiveStory) {
      setShowDialog(true);
    } else {
      navigate(\"/mission?new=true\");
    }
  }}
>
  Start New Story
</Button>
```

### Fix 4: Profile Setup Page

**File:** `src/pages/ProfileSetup.tsx`

When user finishes creating/updating their profile, check if they're updating an existing profile vs creating a new one:

**Current navigation (problematic):**
```typescript
navigate(\"/mission?new=true\");
```

**Improved logic:**
```typescript
const handleProfileSubmit = async (data) => {
  saveProfileToLocal(data);
  
  // Check if this is a profile update vs new profile
  const existingStory = await loadCurrentStoryFromDatabase();
  
  if (existingStory) {
    // Profile update - return to existing story
    navigate(\"/mission\");
  } else {
    // New profile - start new story
    navigate(\"/mission?new=true\");
  }
};
```

## Preventive Measures

### 1. Create a Centralized Navigation Helper

**File:** `src/lib/navigationHelpers.ts` (create new file)

```typescript
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
 */
export const safeStartNewStory = async ({
  navigate,
  onActiveStoryDetected,
  forceNavigate = false
}: StartNewStoryOptions): Promise<void> => {
  if (forceNavigate) {
    navigate(\"/mission?new=true\");
    return;
  }

  try {
    const activeStory = await loadCurrentStoryFromDatabase();
    
    if (activeStory) {
      // Active story exists - trigger callback for confirmation dialog
      onActiveStoryDetected?.();
    } else {
      // No active story - safe to proceed
      navigate(\"/mission?new=true\");
    }
  } catch (error) {
    console.error('Error checking for active story:', error);
    // On error, assume no active story to avoid blocking user
    navigate(\"/mission?new=true\");
  }
};

/**
 * Navigate to continue existing story
 */
export const continueStory = (navigate: NavigateFunction) => {
  navigate(\"/mission\"); // Without ?new=true
};
```

### 2. Use Helper Everywhere

Replace all direct navigation calls with the helper:

```typescript
// Before (unsafe)
<Button onClick={() => navigate(\"/mission?new=true\")}>
  New Adventure
</Button>

// After (safe)
<Button onClick={() => {
  safeStartNewStory({
    navigate,
    onActiveStoryDetected: () => setShowDialog(true),
  });
}}>
  New Adventure
</Button>
```

### 3. Add Logging for Debugging

In `src/pages/Mission.tsx`, enhance logging when new stories start:

```typescript
if (forceNew) {
  console.log('🆕 User explicitly requested new story via ?new=true parameter');
  console.log('📍 Referrer:', document.referrer);
  console.log('🔗 Navigation source:', window.location.href);
}
```

This helps trace where unexpected `?new=true` navigations originate.

### 4. URL Parameter Validation

Add a safeguard in Mission.tsx to double-check user intent:

```typescript
useEffect(() => {
  const forceNew = searchParams.get('new') === 'true';
  
  if (forceNew) {
    // Check if user has active story
    const checkBeforeForce = async () => {
      const active = await loadCurrentStoryFromDatabase();
      
      if (active && active.scenes.length > 1) {
        // User has significant progress
        console.warn('⚠️ Attempting to start new story with active progress');
        
        // Show confirmation dialog as last resort
        const confirmed = window.confirm(
          'You have an active story. Starting new will save your progress but create a fresh adventure. Continue?'
        );
        
        if (!confirmed) {
          // Remove ?new=true and reload to continue existing story
          navigate('/mission', { replace: true });
          return;
        }
      }
    };
    
    checkBeforeForce();
  }
}, [searchParams]);
```

## Testing Checklist

After implementing fixes, test these scenarios:

### Scenario 1: New Story from Dashboard (No Active Story)
1. ✅ Ensure no active story exists
2. ✅ Click \"New Adventure\" from Dashboard
3. ✅ Should navigate directly to `/mission?new=true`
4. ✅ Should start a new story immediately

### Scenario 2: New Story from Dashboard (With Active Story)
1. ✅ Start a story, progress to scene 2-3
2. ✅ Navigate back to Dashboard
3. ✅ Click \"New Adventure\"
4. ✅ Should show confirmation dialog
5. ✅ Click \"Cancel\" - should stay on Dashboard
6. ✅ Click \"Start New Story\" - should navigate to `/mission?new=true`
7. ✅ Should start fresh story

### Scenario 3: Continue Story from Dashboard
1. ✅ Start a story, progress to scene 2-3
2. ✅ Navigate to Dashboard
3. ✅ \"Recent Stories\" should show in-progress story
4. ✅ Click \"Continue\" button
5. ✅ Should navigate to `/mission` (without `?new=true`)
6. ✅ Should resume at correct scene

### Scenario 4: New Story Within Story
1. ✅ Be reading a story (any scene)
2. ✅ Click \"Start New Adventure\" button
3. ✅ Should show confirmation dialog
4. ✅ Click \"Cancel\" - should stay in current story
5. ✅ Click \"Confirm\" - should start new story

### Scenario 5: Profile Update
1. ✅ Have an active story
2. ✅ Navigate to `/profile` to update settings
3. ✅ Save profile changes
4. ✅ Should navigate to `/mission` (not `/mission?new=true`)
5. ✅ Should continue existing story with updated profile

### Scenario 6: New User First Story
1. ✅ New user creates profile
2. ✅ Save profile
3. ✅ Should navigate to `/mission?new=true`
4. ✅ Should start new story

## Monitoring & Alerts

Add monitoring to detect this bug in production:

```typescript
// In Mission.tsx useEffect
if (forceNew) {
  const existingStory = await loadCurrentStoryFromDatabase();
  
  if (existingStory && existingStory.scenes.length > 1) {
    // This shouldn't happen if confirmation dialogs work correctly
    console.error('🚨 BUG: New story started despite active story with progress', {
      existingStoryId: existingStory.id,
      sceneCount: existingStory.scenes.length,
      timestamp: new Date().toISOString(),
      referrer: document.referrer,
    });
    
    // Optional: Send to error tracking service
    // trackError('unexpected_story_restart', { ... });
  }
}
```

## Future-Proofing

### 1. Code Review Checklist
When adding new \"Start Story\" buttons, verify:
- [ ] Checks for active story before navigating
- [ ] Shows confirmation dialog if active story exists
- [ ] Uses `safeStartNewStory()` helper
- [ ] Clear user messaging about what happens to current progress

### 2. Automated Tests
Create E2E tests for critical flows:

```typescript
// test/story-navigation.spec.ts
describe('Story Navigation', () => {
  it('should show confirmation when starting new story with active progress', async () => {
    // Start story
    await page.goto('/mission?new=true');
    await page.waitForSelector('[data-testid=\"scene-content\"]');
    
    // Make progress
    await page.click('[data-testid=\"choice-1\"]');
    await page.waitForSelector('[data-testid=\"scene-2\"]');
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Try to start new story
    await page.click('button:has-text(\"New Adventure\")');
    
    // Should show dialog
    await expect(page.locator('dialog:has-text(\"Start New Adventure?\")')).toBeVisible();
    
    // Cancel should keep current story
    await page.click('button:has-text(\"Cancel\")');
    await page.goto('/mission');
    await expect(page.locator('[data-testid=\"scene-2\"]')).toBeVisible();
  });
});
```

### 3. TypeScript Route Type Safety

Create route constants to prevent typos:

```typescript
// src/lib/routes.ts
export const ROUTES = {
  MISSION: '/mission',
  MISSION_NEW: '/mission?new=true',
  PROFILE: '/profile',
  PROFILE_NEW: '/profile?new=true',
  DASHBOARD: '/dashboard',
} as const;

// Usage
navigate(ROUTES.MISSION_NEW); // Type-safe, autocomplete
```

## Summary

The bug occurs because navigation to `/mission?new=true` happens without proper confirmation when an active story exists. The fix involves:

1. ✅ **Always check for active stories** before navigating with `?new=true`
2. ✅ **Show confirmation dialog** if active story exists
3. ✅ **Use centralized helper** for all \"start new story\" navigation
4. ✅ **Add safeguards** in Mission.tsx as last resort
5. ✅ **Monitor and log** unexpected new story starts
6. ✅ **Test thoroughly** across all navigation paths

By following this guide, you ensure users are never surprised by their stories restarting unexpectedly.
