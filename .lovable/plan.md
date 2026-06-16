# Mirror the Mobile Story Process in `/try`

Goal: the guest landing-page demo (`src/pages/TryStory.tsx`) plays a story through the same engine and UI as the real app (`src/pages/Mission.tsx`), end-to-end, with these explicit demo-only carve-outs preserved:
- Existing 6-step setup wizard at `/try` stays as the entry point.
- The footer "**N words read • Free demo**" stays under the choices.
- One full-length story per device (already enforced server-side via `guest_demo_usage`).
- No DB writes, no auth, no progress/character/streak side-effects.

Everything else — generation, streaming, scene UI, inventory, interactive objects, learning challenges, comprehension quiz, Read-to-Me, transitions, animations — becomes byte-for-byte the same as Mission.

---

## What changes

### 1. Extract Mission's gameplay UI into a shared component
Create `src/components/StoryPlayer.tsx` containing the scene/HUD/choices/inventory/interactive-objects/learning-challenge/quiz/Read-to-Me UI that today lives inline in `Mission.tsx`. It accepts:
- `profile`, `scene`, `allScenes`, `sceneCount`, `inventory`, `storyMemory`, `learningSession`, `currentChallenge`, `streamedNarrative`, `choiceLoading`, `showQuiz`, `quizQuestions`, etc. as props.
- Callbacks: `onChoose`, `onGoBack`, `onInteract`, `onChallengeComplete`, `onQuizComplete`, `onReadToMe`, `onHome`.
- Render flags: `mode: "authenticated" | "guest"` controls the footer (Free-demo word counter vs normal status text) and disables features that need a server account (saving, achievements toasts).

`Mission.tsx` is refactored to render `<StoryPlayer mode="authenticated" .../>` with its existing state. No behavior change for logged-in users.

### 2. Rewrite `TryStory` playing/finished stages to use `<StoryPlayer>`
Replace the bespoke `renderPlaying` / `renderFinished` blocks (lines ~536–774) with `<StoryPlayer mode="guest" ... />`. Setup (steps 1–6), loading, error, and `demoUsed` screens remain unchanged.

### 3. Route generation through the real engine (`generateNextScene` from `src/lib/story.ts`)
Today `TryStory.callGenerate` calls `supabase.functions.invoke('generate-story', { guest: true, ... })` directly. Replace it with `generateNextScene(profile, scene, sceneCount, { guest: true, onNarrativeDelta })` so guests get the same streaming pipeline, in-flight de-dupe, validation, and fallback as Mission.

Required tweaks in `src/lib/story.ts`:
- Add an `options` arg: `{ guest?: boolean; onNarrativeDelta?: ... }`. When `guest: true`, skip the auth-only cache key suffix and pass `body.guest = true` to the edge function.
- In `invokeStreaming`, when there's no session AND `guest` is true, send `Authorization: Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY}` (anon key) so guests still get the SSE stream instead of falling back. Edge function already accepts anon for guest mode.
- Surface `demo_used` errors unchanged so `TryStory` can show the `demoUsed` screen.

### 4. Wire feature parity in `TryStory`
Add the same client-side state Mission owns, but scoped to the guest session (no localStorage/DB writes):
- `inventory`, `storyMemory`, `learningSession`, `currentChallenge`, `goBacksUsed`, `streamedNarrative`, `showQuiz`, `quizQuestions`, `quizLoading`, audio refs.
- Reuse Mission's existing helpers verbatim by exporting them from `src/pages/Mission.tsx` into `src/lib/missionHelpers.ts` (pure functions only: `initializeLearningSession`, `addLearningConcept`, `handleChallengeComplete`, `getBackgroundForBadge`, `getIconForBadge`, scene-after-choice merge logic). Both pages import from there.
- Read-to-Me: call the same `text-to-speech` edge function. For guests it's allowed once per scene (same as Adventure Pass rule the app already enforces client-side); no purchase gating, no usage write.

### 5. Demo-specific footer
Inside `StoryPlayer`, when `mode="guest"`, render the existing `"{wordsRead} words read • Free demo"` line in the same spot it occupies today. Authenticated mode keeps Mission's current footer.

### 6. End-of-story flow
On `scene.end === true` (or `sceneCount >= maxScenes`), `StoryPlayer` triggers the same comprehension quiz Mission shows. After the quiz, guest mode shows the existing "Adventure Complete! → Create a free account" CTA from `renderFinished`; authenticated mode keeps Mission's current completion screen.

---

## Files touched
- `src/components/StoryPlayer.tsx` — new, holds the shared in-story UI.
- `src/lib/missionHelpers.ts` — new, pure helpers extracted from Mission.
- `src/pages/Mission.tsx` — replace inline gameplay JSX with `<StoryPlayer mode="authenticated" />`; no logic changes.
- `src/pages/TryStory.tsx` — drop bespoke playing/finished UI; wire `generateNextScene` + `<StoryPlayer mode="guest" />`; keep setup wizard, loading, error, `demoUsed`.
- `src/lib/story.ts` — add `guest`/`onNarrativeDelta` options, allow anon-key streaming for guests.

No edge function, RLS, or DB changes. No new dependencies.

---

## Verification
1. **Authenticated regression:** start a new story on `/mission`, confirm narrative streams, HUD/inventory/interactive objects/learning challenge/quiz/Read-to-Me all behave identically to before.
2. **Guest parity:** in an incognito window open `/try`, finish setup, confirm: streaming first words within ~2s, HUD renders, choice animations match, inventory/interactive objects appear when the model emits them, learning mode shows challenges, comprehension quiz fires at end, Read-to-Me plays once per scene, footer shows "N words read • Free demo".
3. **One-shot guard:** after finishing a guest demo, reopening `/try` shows `demoUsed` screen (server-enforced via `guest_demo_usage`).
4. **Fallback:** simulate a streaming failure (block SSE) → guest seamlessly falls back to non-streaming invoke, no UI break.
5. **Full-length:** guest can play through the same scene count as the matching `storyLength` in Mission (short/medium/epic), not capped earlier.
