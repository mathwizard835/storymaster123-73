# Fix: Save & Exit marking stories as "Completed" + "Try that choice again" errors

## Root cause found (Save & Exit bug)

Every time a new scene is generated, the code does:

```
scenes.length      → scene_count = N
currentSceneIndex  → N - 1
```

so `current_scene_index + 1 === scene_count` **always** immediately after a scene write.

Both the Dashboard and the Story Gallery use this heuristic to decide "Completed":

```ts
const isCompleted =
  story.status === 'completed' ||
  !!story.completed_at ||
  ((story.scene_count || 0) > 0 &&
    (story.current_scene_index || 0) + 1 >= (story.scene_count || 0));
```

Result: as soon as you tap **Save & Exit**, the story shows a green "Completed" badge and the **Continue** button disappears — even though the DB row is actually `paused` (or `active`) and the story is fully resumable. `pauseStoryInDatabase` never marks anything completed, and `saveStoryToDatabase` only completes when `story.completed === true`. The row itself is fine — the UI is lying.

## Root cause (secondary — "Try that choice again")

Edge-function logs show the choice endpoint is succeeding, but occasionally the model returns a JSON payload that fails direct parse + code-block parse (recent example: scene 5 with `end: true`, response length 2014 chars, code fence present but inner body failed strict JSON.parse). The client then throws and shows the generic "Try that choice again" toast, even though the very next attempt succeeds.

We are not going to touch the parser this pass — it is already robust (code-block, balanced-brace, and truncation-repair paths). The observed failures are transient and self-heal on retry. What we can safely improve: give the user a clearer, less alarming toast so an occasional single failure doesn't feel like a systemic outage.

## Changes

### 1. `src/pages/Dashboard.tsx` — Recent Stories list
Remove the scene-count heuristic. Trust only the DB fields:

```ts
const isStoryCompleted =
  story.status === 'completed' || !!story.completed_at;
```

Continue button reappears for every paused/active story regardless of scene index.

### 2. `src/pages/StoryGallery.tsx` — Gallery grid
Same fix at line 213–217:

```ts
const isCompleted =
  story.status === 'completed' || !!story.completed_at;
```

### 3. `src/pages/Mission.tsx` — friendlier transient-error toast (optional, small)
In the `onChoose` catch block, when the error is an unparseable-AI-response (not a paywall, not auth, not rate limit), keep the "Try that choice again" title but add a hint that the previous scene is preserved and no progress was lost. No behavioral change — copy only.

## Out of scope

- No schema changes.
- No edge-function changes.
- No changes to `pauseStoryInDatabase` / `saveStoryToDatabase` — they are already correct.
- No parser changes in `generate-story`.

## Verification

1. Start a story, play 2–3 scenes, tap **Save & Exit** → Dashboard shows **In Progress** with a **Continue** button (currently shows Completed).
2. Tap **Continue** → resumes at the correct scene.
3. Finish a story via the **Finish Adventure** button → still shows **Completed** (because `status='completed'` is written by `clearCurrentStoryInDatabase`).
4. Trigger a forced parse failure (dev only) → toast copy is friendly and the previous scene remains on screen; a second tap succeeds.
