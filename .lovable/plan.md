## Goal

Rework `NativeOnboarding` so it visually matches an Action Mode story (same background, header, HUD, narrative panel, choices panel) and gate the story behind a "Start My Adventure" intro button.

## What changes (UI/presentation only)

### 1. New intro screen (shown before scene1)
- A new state `started: boolean` (default `false`).
- While `!started`, render an intro view using the same Action Mode chrome (action-hero background + dark overlay + header) but with a centered title card:
  - Eyebrow: "ACTION MODE · Mini Story"
  - Title: "The Backpack"
  - Sub: "A 20‑second taste of how every choice changes your story."
  - Primary button: **Start My Adventure** (haptic medium → sets `started = true`, starts scene1 audio).
  - Secondary text button: Skip (existing behavior).
- Audio for scene1 does NOT auto‑play until the button is pressed (avoids autoplay block too).

### 2. Match Action Mode structure exactly
Replace the current purple-gradient layout with the same shell `Mission.tsx` uses for an active story:

- Root: `min-h-[100dvh]` with `bg-cover bg-center` using `actionHeroBg` (`@/assets/action-hero-bg.jpg`), `bg-black/40` overlay layer, safe‑area top/bottom padding.
- Header bar (`bg-black/30 backdrop-blur-sm border-b border-white/20`):
  - Left: Crosshair icon (Action badge) + scene title ("The Backpack").
  - Right: Scene counter pill `Scene {n}` (1–7), mute toggle, Skip.
- HUD panel (`bg-black/50 backdrop-blur-sm rounded-lg border-white/20`) with the same 4 tiles Mission uses, populated with safe static values for the demo:
  - Zap (energy): "10"
  - Timer (time): "20s"
  - Star (choice points): increments as the user makes choices
  - Heart (status): "Curious"
- Narrative panel (`bg-white/10 backdrop-blur-md rounded-lg border-white/20`) holding the scene text, with the same fade/translate paragraph animation Mission uses.
- Choices panel (`bg-black/50 backdrop-blur-sm rounded-lg border-white/20`) with the "What do you choose?" header + Target icon, and the same motion buttons styled like Mission's choice buttons.
- Final scene swaps the choices panel for the existing `Keep the Adventure Going` CTA + "$4.99/mo" caption, kept inside the same black/50 panel for visual consistency.

### 3. Behavior preserved
- All 7 scenes, branching, audio preload + per‑scene playback, mute, skip, haptics, `markComplete()`, `onComplete()` → `/auth?mode=signup` unchanged.
- `hasSeenOnboarding()` export unchanged.

## Files touched
- `src/components/NativeOnboarding.tsx` — rewrite the JSX layout only; logic/state additions limited to `started` and `choicePointsUsed` counters.

No other files, routes, or business logic change.

## Out of scope
- No new audio (existing `/onboarding-story/*.mp3` reused).
- No changes to Auth, paywall, or Action Mode itself.
