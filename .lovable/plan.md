

## Fix: Externalize RevenueCat from Vite Build

**Problem:** `@revenuecat/purchases-capacitor` is a native-only Capacitor plugin that doesn't work in web builds. Rollup can't resolve it during `vite build`.

**Solution:** Add it to `build.rollupOptions.external` in `vite.config.ts` so Rollup skips it during bundling. The plugin only runs on native iOS anyway.

### Change in `vite.config.ts`

Update the `build.rollupOptions` to externalize the RevenueCat package:

```typescript
build: {
  rollupOptions: {
    external: ['@revenuecat/purchases-capacitor'],
    output: {
      manualChunks: undefined,
      assetFileNames: 'assets/[name]-[hash][extname]',
      chunkFileNames: 'assets/[name]-[hash].js',
      entryFileNames: 'assets/[name]-[hash].js',
    },
  },
  emptyOutDir: true,
},
```

This is a single-line addition. The app will continue to work on native iOS (where RevenueCat is available) and gracefully skip IAP on web (which `iapService.ts` already handles via `Capacitor.isNativePlatform()` checks).

