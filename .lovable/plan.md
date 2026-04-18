

## Problems

### 1. XP per choice
`gainSceneExperience` already awards `8 + 4 = 12` XP per choice, which matches the request. No change needed unless we want to make it cleaner — I'll consolidate to a single explicit `12`.

### 2. Save & Exit wipes mid-story XP
**Root cause:** `syncProgressFromDatabase` (called by Dashboard on mount) **resets `character` to `DEFAULT_CHARACTER`** and only replays **completed** stories. All in-progress XP earned from per-scene choices in active/paused stories is wiped on every Dashboard load.

**Fix:** When syncing, also award per-scene XP for the **active and paused** stories' progress (12 XP × scenes viewed in those stories), so saving and exiting mid-story preserves the XP earned from each choice.

### 3. System prompt drift after first scene
**Root cause #1 (CRITICAL):** The userPrompt's mode-specific tone instructions compare `profile.mode === "Fun" | "Thrill" | "Mystery" | "Explore"` (capitalized) — but the actual profile values are lowercase `"thrill" | "comedy" | "mystery" | "explore"`. The mode-specific tone block **never fires**, on any scene. The AI gets only the literal string `"Mode: thrill"` with no enforcement of what that means tonally.

**Root cause #2:** On continuation scenes the prompt structure is the same, but the AI receives the previous scene as `Continue from: {...huge JSON...}` which buries the profile requirements. Need to re-emphasize the profile constraints on every continuation.

## Plan

### Fix A — `supabase/functions/generate-story/index.ts`
1. Fix the mode comparison to use lowercase values matching the actual profile (`"comedy" | "thrill" | "mystery" | "explore" | "learning"`), so the tone-enforcement instructions actually run on every scene.
2. On continuation scenes (`scene` present), prepend a short reinforcement reminder before the `Continue from:` block: "MAINTAIN THE SAME mode/age/lexile/badges/protagonist name as defined above. Do NOT drift in tone or vocabulary."
3. Move the `=== CRITICAL PLAYER PROFILE ===` block to also appear AFTER the scene context as a final reminder, so the model sees requirements both before and after the previous scene JSON.

### Fix B — `src/lib/syncProgress.ts`
1. After replaying completed stories' XP, also iterate over **active + paused** stories and award `12 XP × scene_count` for each (matching the per-choice XP awarded live in Mission). This preserves mid-story progress after Save & Exit.
2. Keep the existing completed-story XP logic untouched.

### Fix C — `src/lib/character.ts` (clarity only)
- Update `gainSceneExperience` constants to `const sceneExp = 12; const choiceExp = 0;` (or `8 + 4`, same total) with a comment noting "12 XP per choice as per design", to make intent obvious.

## Files Modified
- `supabase/functions/generate-story/index.ts` — fix mode case mismatch, reinforce profile on continuation scenes
- `src/lib/syncProgress.ts` — include active/paused stories' scene XP in sync replay
- `src/lib/character.ts` — clarify 12 XP constant

## Result
- Every choice grants exactly 12 XP and the Dashboard reflects that XP even after Save & Exit (because sync no longer wipes it).
- Every scene (not just scene 1) follows the full profile: mode tone is enforced via the now-correct lowercase comparison, and the profile block is reinforced around the previous-scene context on every continuation call.

