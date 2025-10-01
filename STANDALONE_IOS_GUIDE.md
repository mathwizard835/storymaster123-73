# Standalone iOS Build Guide

This guide ensures your iOS app runs completely standalone without any Lovable redirects.

## ✅ Configuration Verified

Your app is configured to run standalone:
- ✅ No `server.url` in capacitor.config.ts
- ✅ `webDir` points to local `dist/` folder
- ✅ Mobile detection bypasses all web auth/redirects
- ✅ No Lovable scripts in index.html

## 🚀 One-Command Workflow

```bash
npm run build && npx cap sync ios && npx cap open ios
```

This will:
1. Build your React frontend to `dist/`
2. Copy `dist/` to iOS project
3. Open Xcode with your project

## 🔧 Step-by-Step Process

### 1. Clean Build
```bash
# Remove old build artifacts
rm -rf dist/

# Fresh install (only if needed)
npm install

# Build frontend
npm run build
```

### 2. Sync to iOS
```bash
# Copy dist/ to iOS project
npx cap sync ios

# Or sync all platforms
npx cap sync
```

### 3. Open in Xcode
```bash
npx cap open ios
```

### 4. Run in Xcode
- Select your target (Simulator or Device)
- Press ▶️ (Run) or Cmd+R
- App should load your frontend immediately

## 🐛 Troubleshooting

### App shows blank screen
1. Check Console for errors: `cmd+shift+c` in Simulator
2. Verify build exists: `ls -la dist/`
3. Rebuild and sync: `npm run build && npx cap sync ios`

### App redirects to Lovable
**This should NOT happen with current config**. If it does:
1. Check capacitor.config.ts has NO `server.url`
2. Verify you ran `npx cap sync ios` after config changes
3. Clean iOS build: Product → Clean Build Folder in Xcode
4. Rebuild: `npm run build && npx cap sync ios`

### Changes not showing
1. Always build before sync: `npm run build`
2. Always sync before opening Xcode: `npx cap sync ios`
3. If still stuck, quit Xcode and run full workflow again

## 📱 Testing Workflow

### For Frontend Changes
```bash
# Make your changes to src/ files
npm run build
npx cap sync ios
# Rerun app in Xcode
```

### For Native Changes (plugins, config)
```bash
npx cap sync ios
# Reopen Xcode if needed
```

## 🔒 Standalone Verification

Your app is standalone when:
- ✅ Opens immediately to your UI (no redirects)
- ✅ Works without internet connection
- ✅ No external URLs in logs
- ✅ All navigation stays within app

## 🎯 Key Points

1. **Never add server.url** to capacitor.config.ts
2. **Always build before sync** - `dist/` must be fresh
3. **Mobile detection auto-bypasses web auth** - no Supabase redirects
4. **Use local storage** - data persists on device

## 📚 Platform-Specific Notes

### iOS (Current Platform)
- Requires macOS with Xcode
- Simulator recommended for testing
- Physical device requires Apple Developer account
- First run may take longer (compiling)

### Android (Future)
```bash
npx cap add android
npx cap sync android
npx cap open android
```

## 🆘 Emergency Reset

If completely stuck:
```bash
# 1. Remove iOS folder
rm -rf ios/

# 2. Fresh build
npm run build

# 3. Re-add iOS
npx cap add ios

# 4. Sync and open
npx cap sync ios
npx cap open ios
```

## ✨ Production Ready

Your app is ready when:
- ✅ Runs in simulator without issues
- ✅ No console errors
- ✅ All features work offline
- ✅ Supabase calls work (when online)
- ✅ Mobile features (haptics, share) work

---

**Need help?** Check [Capacitor Docs](https://capacitorjs.com/docs) or your console logs first.
