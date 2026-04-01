

## What You Asked About

### 1. Offline Story Caching — What It Is (Plain English)

Right now, when you open the Story Gallery, it fetches your completed stories from Supabase (the internet). If you have no internet, you see nothing.

**Offline caching** means: after stories load successfully, we save a copy on your phone's local storage. Next time you open the gallery with no internet, you still see your stories instead of an error. That's it — it's already implemented in `offlineStories.ts` and wired into `StoryGallery.tsx`.

It does **not** mean you can generate new stories offline (that still needs AI/internet). It just means previously completed stories are viewable without connectivity.

---

### 2. White Loading Screen Fix

**The problem**: Before React mounts (and before any component renders), the browser shows whatever background color is on `<html>` and `<body>`. Right now `index.html` has `<body style="margin: 0;">` with **no background color** — so it's white. On a Capacitor iOS app, this means a white flash before the dark-themed `NativeLoadingScreen` component appears.

**The fix** (2 changes):

#### A. `index.html` — Set body/html background to match the app's dark theme
Add `background-color: #1a1a2e` (the app's base dark color) to both `<html>` and `<body>` so the moment the webview opens, the background is already dark — no white flash.

```html
<html lang="en" style="background-color: #1a1a2e;">
  ...
  <body style="margin: 0; background-color: #1a1a2e;">
```

#### B. `index.html` — Add an inline loading indicator inside `#root`
Put a simple CSS-only spinner inside `<div id="root">` so there's visible feedback before React hydrates. React will replace it automatically when it mounts.

```html
<div id="root">
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1a1a2e;">
    <div style="width:32px;height:32px;border:3px solid rgba(255,255,255,0.1);border-top-color:rgba(255,255,255,0.5);border-radius:50%;animation:spin .8s linear infinite;"></div>
  </div>
</div>
<style>@keyframes spin{to{transform:rotate(360deg)}}</style>
```

This ensures:
- Native iOS launch screen → dark background with spinner → React app (no white flash at any point)
- Web users also get a themed pre-render instead of blank white

---

**Summary**: 2 edits to `index.html` only. No other files change.

