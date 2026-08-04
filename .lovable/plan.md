# Plan: Move Help & Support to Top of Landing Page and Make It a Standalone In-App Button

## Goal
Make the support channel impossible to miss on the landing page and clearly accessible from the main app without requiring users to open Settings first.

## What we will change

### 1. Landing page (`src/pages/Index.tsx`)
- Add a visible, top-aligned "Help & Support" button above the hero content (e.g., in a small top bar or pinned to the top-right of the hero section).
- Remove the current footer-only placement so the button is not buried at the bottom.
- Keep the existing `SupportModal` behavior and the `supportOpen` state; reuse the same mailto modal.

### 2. In-app Dashboard (`src/pages/Dashboard.tsx`)
- Add a standalone LifeBuoy support icon in the native navigation header, next to the existing Settings gear icon.
- For web/mobile-web layouts, add an equivalent support icon/button in the Dashboard top bar so it is visible regardless of platform.
- Tapping it opens `SupportModal` directly from the Dashboard.

### 3. Settings (`src/pages/Settings.tsx`)
- Keep the existing "Help & Support" row, but it becomes a secondary/backup path rather than the primary way to reach support.

## Guardrails
- The new buttons will not overlap existing CTAs, hero content, or the native bottom navigation.
- Existing haptics and routing behavior remain unchanged.
- The support icon will use the same `LifeBuoy` icon and `support@storymaster.app` mailto link already present in `SupportModal`.
