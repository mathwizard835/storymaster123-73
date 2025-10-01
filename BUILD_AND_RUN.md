# iOS Build & Run Instructions

## One-Command Build & Sync Workflow

```bash
npm run build && npx cap sync ios && npx cap open ios
```

This command will:
1. Build your React app to `dist/`
2. Sync the build to your iOS project
3. Open Xcode with your project

## Step-by-Step Instructions

### Initial Setup (First Time Only)
```bash
# 1. Install dependencies
npm install

# 2. Add iOS platform (if not already added)
npx cap add ios

# 3. Update iOS dependencies
npx cap update ios
```

### Regular Development Workflow

#### For Each Code Change:
```bash
# 1. Build the frontend
npm run build

# 2. Sync to iOS
npx cap sync ios

# 3. Open in Xcode
npx cap open ios
```

Then in Xcode:
- Select your target device (Simulator or physical device)
- Click the Play button to run

### Quick Rebuild Script

Create a file `rebuild-ios.sh`:
```bash
#!/bin/bash
echo "🔨 Building frontend..."
npm run build

echo "📱 Syncing to iOS..."
npx cap sync ios

echo "🚀 Opening Xcode..."
npx cap open ios

echo "✅ Ready! Press Play in Xcode to run."
```

Make it executable:
```bash
chmod +x rebuild-ios.sh
```

Run it:
```bash
./rebuild-ios.sh
```

## Troubleshooting

### Blank Screen Issues
1. Ensure you've run `npm run build` before syncing
2. Check that `dist/` folder exists and contains files
3. Verify `capacitor.config.ts` has `webDir: 'dist'`
4. Clear Xcode build folder: Product → Clean Build Folder

### Capacitor Configuration
Your `capacitor.config.ts` should look like:
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.2809bfa0b669424e9eb06511e3cb6327',
  appName: 'storymaster123-73',
  webDir: 'dist',  // ← CRITICAL: Must be 'dist'
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  }
};

export default config;
```

### Force Clean Rebuild
```bash
# Remove old builds
rm -rf dist/ ios/App/public/

# Fresh build
npm run build

# Force sync
npx cap sync ios --force

# Open Xcode
npx cap open ios
```

## Production Build Checklist
✅ No `server.url` in capacitor.config.ts (removes dev server link)
✅ `webDir: 'dist'` is set
✅ Run `npm run build` before every sync
✅ Run `npx cap sync ios` after every build
✅ Mobile detection bypasses Supabase auth
✅ No external redirects or auth flows on mobile

## Notes
- The app runs in "trial mode" on mobile (no auth required)
- All Supabase auth is bypassed on iOS/Android
- Changes to HTML/CSS/JS require rebuild + sync
- Native plugin changes require `npx cap sync ios`
- Xcode project changes are preserved across syncs
