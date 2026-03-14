

## Why You're Getting a White Screen on Xcode

**Root cause:** The `build.rollupOptions.external` setting we added tells Vite/Rollup to treat `@revenuecat/purchases-capacitor` as an external module that will be provided at runtime. But in a Capacitor iOS app, there is no external module loader — the built JS runs directly from local files. So when the app loads `iapService.ts`, it tries to import from an external module that doesn't exist, throws a fatal error, and the entire React app crashes to a white screen.

**The fix:** Instead of externalizing the module, we should use a **dynamic import** inside `iapService.ts` so the module is only loaded at runtime on native platforms (where it exists). All functions already guard with `Capacitor.isNativePlatform()`, so on web the import is never triggered and the build succeeds without needing `external`.

### Changes

**1. `src/lib/iapService.ts`** — Remove the top-level static import of `@revenuecat/purchases-capacitor`. Instead, dynamically import it inside each function that needs it:

```typescript
// REMOVE this line:
// import { Purchases, LOG_LEVEL, PURCHASES_ERROR_CODE } from '@revenuecat/purchases-capacitor';

// ADD a lazy loader:
let _purchasesModule: any = null;
const getPurchases = async () => {
  if (!_purchasesModule) {
    _purchasesModule = await import('@revenuecat/purchases-capacitor');
  }
  return _purchasesModule;
};
```

Then replace every usage of `Purchases`, `LOG_LEVEL`, `PURCHASES_ERROR_CODE` with the dynamically loaded versions (e.g. `const { Purchases, LOG_LEVEL } = await getPurchases();`).

**2. `vite.config.ts`** — Remove `'@revenuecat/purchases-capacitor'` from `build.rollupOptions.external` since it will no longer be needed (the dynamic import handles it).

This way:
- **Web build** succeeds because the import is never statically analyzed  
- **iOS native** works because the dynamic import resolves at runtime where the Capacitor plugin exists  
- No more white screen

