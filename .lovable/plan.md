# Skip Landing Page on Native + Make It Feel Like a Real iOS App

## Overview

On Capacitor (native), redirect `/` straight to `/dashboard` (or `/auth` if not logged in), and add several native-feeling enhancements to eliminate the "web wrapper" feel.

---

## Changes

### 1. Skip Landing Page on Native

**File: `src/App.tsx**`

- Change the `/` route: when `Capacitor.isNativePlatform()` is true, render a `<Navigate to="/dashboard" />` (or `/auth` if no user) instead of `<Index />`
- Create a small `NativeHomeRedirect` component that checks auth state and redirects accordingly

### 2. iOS-Style Page Transitions

**File: `src/components/PageTransition.tsx**`

- Update animations to use iOS-native-feeling slide transitions (slide from right on enter, slide to left on exit) with spring easing
- Increase duration slightly for a more polished native feel

### 3. Add Haptic Feedback to More Interactive Elements

**Files: `src/pages/Dashboard.tsx`, `src/pages/Achievements.tsx`, `src/pages/StoryGallery.tsx`, `src/pages/Subscription.tsx**`

- Add `addHapticFeedback()` calls on key button presses: "Start Story", "Continue Story", achievement taps, gallery item taps, subscribe button
- Use light for navigation, medium for actions, heavy for celebrations

### 4. Native Loading Screen

**File: `src/App.tsx**`

- Replace the plain "Loading..." text in `ProtectedRoute` and `PublicRoute` with a branded loading spinner that matches the splash screen (dark purple gradient + app icon/name + animated spinner)

### 5. Hide Web-Like Elements on Native

**File: `src/components/layout/MobileBottomNav.tsx**`

- Already native-feeling, but update the Home tab to go to `/dashboard` instead of `/` when native

**File: `src/pages/Dashboard.tsx**`

- Hide any external link buttons or web-specific UI when `isNative` is true

### 6. Native Pull-to-Refresh Feel

**File: `src/pages/Dashboard.tsx**`

- Add a pull-to-refresh style reload pattern for the dashboard data (using touch events on native)

7. Make each step of the profile setup(name, age, lexile level, etc) a page instead of having them all in one page to make it easier to understand.

---

## Technical Details

- `Capacitor.isNativePlatform()` from `@capacitor/core` is the detection method (already used throughout)
- `useDevice()` hook provides `isNative` in components
- No new dependencies needed
- All changes are scoped to the listed files; no unrelated refactoring