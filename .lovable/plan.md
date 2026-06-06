Add a **Log Out** button to the Subscription (paywall) page header so users can easily sign out without leaving the paywall.

### Scope
- **File:** `src/pages/Subscription.tsx`
- **Changes only:** import `useAuth` + `LogOut` icon, add a small header button, wire it to the existing `signOut()` function.

### Implementation
1. Import `useAuth` from `@/hooks/useAuth` and `LogOut` from `lucide-react`.
2. Inside the `Subscription` component, read `const { user, signOut } = useAuth();`.
3. Add an async `handleLogout` helper that calls `await signOut();` and then `navigate('/')`.
4. In the existing header bar (the `bg-black/20` strip at the top), add a small ghost-styled **Log Out** button to the right of the badge — visible only when `user` is truthy.
   - Uses `text-white/80 hover:text-white hover:bg-white/10` styling to match the existing header.
   - Shows a `LogOut` icon + "Log Out" text.
5. No changes to auth logic, routing, or other pages.

### Result
A clean, readable logout control in the paywall header that works immediately and preserves all existing UI behavior.