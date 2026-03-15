

## Fix: White Space at Top on iPhones (Status Bar / Safe Area)

### Problem
The white space at the top is caused by two issues working together:

1. **`padding-top: env(safe-area-inset-top)` on `html`** — This adds padding equal to the notch/Dynamic Island height, but the Capacitor WebView already handles safe areas natively, causing double spacing.
2. **Missing `UIStatusBarHidden` / overlay config** — The Capacitor WebView isn't configured to extend content behind the status bar, so the system reserves white space for it.

### Plan

**1. Update `capacitor.config.ts`** — Add `ios.contentInset: 'always'` and `StatusBar.overlaysWebView: true` so the WebView extends edge-to-edge behind the status bar:
```ts
plugins: {
  StatusBar: {
    style: 'dark',
    backgroundColor: '#1a1a2e',
    overlaysWebView: true
  }
}
```

**2. Fix `src/index.css`** — Replace the `padding-top` on `html` with a background-color approach. Instead of pushing content down with padding, use the CSS safe area inset only on specific content containers (not the root `html` element). The `html` element should NOT have `padding-top` — that creates the white gap when the native layer already accounts for safe areas:
```css
html {
  background-color: hsl(var(--background));
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}
```

**3. Add safe-area top padding to the app root instead** — In `src/App.css` or a wrapper div in `App.tsx`, add `padding-top: env(safe-area-inset-top)` so content isn't hidden behind the status bar, but the background color extends fully to the top edge (no white gap).

**4. Update `Info.plist`** — Ensure `UIStatusBarStyle` is set to `UIStatusBarStyleLightContent` so the status bar text is visible against the dark background on all iPhone models (including iPhone 17 / Dynamic Island devices).

### Result
- Background color extends edge-to-edge (no white bar)
- Content remains safely below the notch/Dynamic Island
- Works on all iPhones: SE, mini, standard, Pro, Pro Max, and iPhone 17

