# **Fix: Stories Crashing Mid-Way & Restarting as a New Story (Bulletproof Edition)**

**What Parents & Kids See**

When a child is several scenes into a story and the app suddenly closes or reloads, reopening the app brings them right back to the exact scene they were onâ€”unless the story itself caused repeated crashes, in which case the app safely resets so the child is never locked out.

**Core Plan**

1. **Smart Crash Recovery with a Circuit Breaker**
  - When the app reopens, look for an unfinished story from the last 24 hours (active or paused).
  - **Crash-Loop Guard:** Track consecutive boot attempts for the same storyId in localStorage with a timestamp. If the same story triggers 2 crashes within 60 seconds, abort auto-resume, mark the story as paused (or crashed_recovered), and route cleanly to the main screen so the user is never trapped in an infinite reload loop.
  - **Stale Story Prompt (Optional UX Safeguard):** If the unfinished story is more than 2â€“4 hours old (but under 24h), prompt *"Continue your story or start a new one?"* rather than forcing an immediate jump.
2. **Instant Local Checkpointing (Zero Lost Progress on Hard OOM)**
  - Because iOS terminates out-of-memory webviews instantly without running cleanup callbacks, write the current storyId, sceneIndex, and latest choice to localStorage synchronously on every scene render and choice tap.
  - On boot, reconcile localStorage with Supabaseâ€”if the local checkpoint is ahead of the database (because the app died mid-network-request), trust the local checkpoint and sync it back up.
3. **Eliminate Audio Memory Leaks**
  - Clear old narration audio buffers (audio.pause(), reset src = '', and call URL.revokeObjectURL()) immediately when:
    - The child picks a choice.
    - A new scene begins playback.
    - The story view unmounts.
  - Ensure only **one** active audio blob exists in memory at any moment.
4. **Lighter Text Streaming & Rendering**
  - Throttle onNarrativeDelta updates to ~80â€“100ms (10â€“12 renders/sec instead of 60fps) so older iPhones and iPads don't choke on DOM layout recalculations while audio is streaming.
5. **Silent State Self-Healing**
  - Remove hard redirects (navigate('/profile?new=true')) when state desyncs occur. Instead, quietly re-sync currentStoryId from the local checkpoint or database and stay on the active scene.

**Safeguards & Edge-Case Protections**

- **Finished stories stay finished:** The resume query strictly excludes status = 'completed'.
- **"New Story" always works:** Tapping "New Story" explicitly clears the local checkpoint, resets the crash counter, marks prior stories inactive, and starts fresh.
- **No duplicate story generation:** Before creating a new story, check if an active creation lock/story from the last 30 seconds already exists and reuse it.
- **Graceful scene fallback:** If a resumed story is missing its latest scene payload, fall back to the highest valid saved scene instead of throwing an error.
- **Telemetry:** Log story_resumed_after_crash (with sceneIndex and attemptCount) and story_crash_loop_aborted to track real-world stability.

**Technical Implementation Checklist**

- **localStorage Checkpoint & Circuit Breaker (storyRecovery.ts)**
  - Store { storyId, sceneIndex, updatedAt, bootAttempts, lastBootAt }.
  - Increment bootAttempts on story mount; reset bootAttempts = 0 once the user successfully interacts (e.g., taps a choice or finishes audio playback) or after 60 seconds of stable runtime.
  - If bootAttempts >= 2 within 60 seconds, trip the breaker, clear the auto-resume flag, and land safely on /profile.
- **databaseStory.ts**
  - loadCurrentStoryFromDatabase() queries .in('status', ['active', 'paused']), updated_at within 24h, ordered newest first, skipping completed.
  - Merge with localStorage checkpoint so a hard OOM kill before a Supabase write never loses the last choice.
- **Mission.tsx**
  - Run clearAllActiveStoriesForUser() and auto-generate *only* when new=true (and no crash-loop breaker just tripped).
  - Replace corruption redirect branches with a silent currentStoryId resync.
  - Enforce strict audio teardown (pause(), removeAttribute('src'), load(), URL.revokeObjectURL()) on choice selection, before new audio creation, and in useEffect cleanup.
  - Throttle onNarrativeDelta to 80ms.
- **Backend / Schema**
  - Zero changes required to Edge Functions, AI prompts, or Supabase tables.
- Make sure the circuit breaker's bootAttempts 
  counter only resets after the scene has stayed alive for a few seconds (or once the user taps a choice), rather than immediately when the component mounts. If a crash happens halfway through rendering the scene or loading its audio, resetting the counter too early would defeat the breaker.

**Pre-Release Verification & Rollout**

1. **Automated / Unit Tests:**
  Bullet Verify resume filter (active/paused, < 24h, ignores completed).
  Bullet Simulate 2 rapid reloads on the same storyId within 60s and confirm the circuit breaker aborts auto-resume and lands on /profile.
  Bullet Simulate an OOM kill right after a choice tap (before DB sync) and confirm localStorage restores the exact scene