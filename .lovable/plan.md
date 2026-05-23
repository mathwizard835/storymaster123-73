## Urgent fixes only

### 1. Finishing a story ends as `paused` instead of `completed`
**Cause:** `SavedStory.completed` is never set to `true`. Post-finish autosaves (inventory use, quiz completion, go-back on last scene) call `saveStoryToDatabase`, which writes `status: 'active'` because `story.completed` is falsy. Then "Save & Exit" pauses → row ends as `paused`.

**Fix:**
- `src/pages/Mission.tsx`: add an `isFinishedRef` set the moment Finish Adventure runs. Short-circuit every `saveStoryToDatabase` / pause call while it's true (inventory handler, quiz completion handler, go-back handler, Save & Exit).
- `src/lib/databaseStory.ts`: in `saveStoryToDatabase`, never downgrade an existing `completed` row to `active`. Read current status first; if `'completed'`, keep it.
- `src/lib/databaseStory.ts`: in `pauseStoryInDatabase` and `pauseAllActiveStoriesForUser`, skip rows whose status is already `completed`.

### 2. Quiz closes when clicking "Next Question"
**Cause:** `ComprehensionQuiz.tsx` uses `<Dialog onOpenChange={onClose}>` with no guards. Radix fires `onOpenChange(false)` on outside-click / Escape; on mobile, near-edge taps on the Next button can register as outside clicks and dismiss the dialog mid-quiz.

**Fix:**
- `src/components/ComprehensionQuiz.tsx`: change `onOpenChange` to only react to explicit close, and add `onInteractOutside={(e) => e.preventDefault()}` + `onEscapeKeyDown={(e) => e.preventDefault()}` on `<DialogContent>`. The built-in `X` close button still works for intentional exit.

### 3. "Share Story" still appearing in the deployed app
Already removed from `Mission.tsx` source — the live build is stale. Only remaining reference is the "📤 Share Story" copy-to-clipboard button on completed cards in `StoryGallery.tsx`.

**Fix:**
- `src/pages/StoryGallery.tsx`: remove the "📤 Share Story" button.

### Files touched
- `src/pages/Mission.tsx`
- `src/lib/databaseStory.ts`
- `src/components/ComprehensionQuiz.tsx`
- `src/pages/StoryGallery.tsx`

No DB migrations. After landing, publish (Update) for the fixes to reach the deployed web app and the next iOS build.
