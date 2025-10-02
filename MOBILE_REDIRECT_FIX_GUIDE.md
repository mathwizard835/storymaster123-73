# Mobile App Redirect Fix Guide - Complete Troubleshooting

## Problem Description
Mobile app redirects to external Lovable website/auth instead of keeping everything within the native app.

## Root Causes & Solutions

### 1. **Capacitor Configuration Issues**

#### Check capacitor.config.ts
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.2809bfa0b669424e9eb06511e3cb6327',
  appName: 'storymaster123-73',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1a1a2e'
    }
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
```

**CRITICAL**: Remove any `server.url` configuration that points to Lovable dev server!

### 2. **Build Process Problems**

#### Step-by-Step Build Process
```bash
# 1. Clean previous builds
rm -rf dist/
rm -rf node_modules/.vite/

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Sync with Capacitor
npx cap sync

# 5. Run on device
npx cap run android
# or
npx cap run ios
```

#### Verify Build Output
- Check that `dist/` folder exists and contains built files
- Verify `dist/index.html` doesn't reference Lovable URLs
- Confirm assets are properly bundled

### 3. **Supabase Auth Configuration**

#### Update Supabase Dashboard Settings
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set **Site URL** to: `capacitor://localhost` (for mobile)
3. Add **Redirect URLs**:
   - `capacitor://localhost`
   - `capacitor://localhost/**`
   - Your actual app scheme if different

#### Disable Email Confirmation (for testing)
1. Go to Supabase Dashboard → Authentication → Settings
2. Disable "Enable email confirmations"
3. This prevents auth redirects during testing

### 4. **Code-Level Fixes**

#### A. Mobile Detection Library
Ensure `src/lib/mobileFeatures.ts` properly detects mobile:

```typescript
export const isMobilePlatform = (): boolean => {
  // Check for Capacitor
  if (typeof window !== 'undefined' && window.Capacitor) {
    return true;
  }
  
  // Check for mobile user agents
  if (typeof navigator !== 'undefined') {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  return false;
};
```

#### B. Auth Hook - Skip Supabase on Mobile
Update `src/hooks/useAuth.tsx`:

```typescript
useEffect(() => {
  // Mobile-specific initialization - prevent external auth redirects
  if (isMobilePlatform()) {
    // Clear any existing URL parameters that might cause redirects
    if (window.location.search) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
    
    // For mobile, skip Supabase auth setup and use trial mode
    setLoading(false);
    return;
  }

  // Web-only auth setup...
}, []);
```

#### C. App Routing - Mobile First
Update `src/App.tsx`:

```typescript
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const isTrialMode = searchParams.get('trial') === 'true';
  
  // Import mobile detection
  const isMobile = () => {
    try {
      const { isMobilePlatform } = require('@/lib/mobileFeatures');
      return isMobilePlatform();
    } catch {
      return false;
    }
  };
  
  if (loading) {
    return <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }
  
  // Mobile users automatically get trial mode access
  const shouldAllowAccess = user || isTrialMode || isMobile();
  
  if (!shouldAllowAccess) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};
```

#### D. Auth Page - Redirect Mobile Users
Update `src/pages/Auth.tsx`:

```typescript
useEffect(() => {
  // Mobile users should never see this auth page - redirect to home with trial mode
  if (isMobilePlatform()) {
    navigate('/?trial=true', { replace: true });
    return;
  }

  // Web-only auth logic...
}, [navigate]);
```

### 5. **Common Issues & Solutions**

#### Issue: App still loads from dev server
**Solution**: 
- Remove any `server.url` from `capacitor.config.ts`
- Run `npm run build` before `npx cap sync`
- Check that `dist/` folder exists

#### Issue: Auth redirects to external site
**Solution**:
- Update Supabase redirect URLs to use `capacitor://localhost`
- Ensure mobile detection works properly
- Add trial mode fallback for mobile users

#### Issue: White screen on mobile
**Solution**:
- Check console logs in Xcode/Android Studio
- Verify all assets are properly bundled
- Ensure no missing dependencies

#### Issue: App doesn't detect mobile platform
**Solution**:
- Verify Capacitor is properly installed
- Check `window.Capacitor` exists
- Add user agent fallback detection

### 6. **Debugging Steps**

#### Step 1: Verify Capacitor Detection
Add this to your app temporarily:
```typescript
console.log('Is mobile platform:', isMobilePlatform());
console.log('Capacitor exists:', !!window.Capacitor);
console.log('User agent:', navigator.userAgent);
```

#### Step 2: Check Build Output
- Open `dist/index.html`
- Verify no references to `.lovableproject.com`
- Confirm assets are relative paths

#### Step 3: Monitor Network Requests
- Open dev tools in Xcode/Android Studio
- Look for any external URL requests
- Block external requests to force local behavior

#### Step 4: Check Auth State
Add logging to `useAuth.tsx`:
```typescript
console.log('Auth state - User:', user, 'Loading:', loading, 'Mobile:', isMobilePlatform());
```

### 7. **Final Verification Checklist**

- [ ] `capacitor.config.ts` has NO `server.url` pointing to external site
- [ ] `npm run build` creates `dist/` folder with assets
- [ ] `npx cap sync` completes without errors
- [ ] Mobile detection function returns `true` on mobile
- [ ] Auth hook skips Supabase setup on mobile
- [ ] App routing allows mobile access without auth
- [ ] Auth page redirects mobile users to home
- [ ] Supabase redirect URLs include `capacitor://localhost`

### 8. **Emergency Reset Steps**

If nothing works:

1. **Clean Everything**:
```bash
rm -rf dist/
rm -rf node_modules/
rm -rf android/
rm -rf ios/
npm install
```

2. **Rebuild Capacitor**:
```bash
npm run build
npx cap add android
npx cap add ios
npx cap sync
```

3. **Test on Device**:
```bash
npx cap run android --livereload
```

### 9. **Platform-Specific Notes**

#### Android
- Check `android/app/src/main/AndroidManifest.xml` for correct intent filters
- Verify app scheme matches `capacitor.config.ts`

#### iOS
- Check `ios/App/App/Info.plist` for URL schemes
- Ensure app identifier matches bundle ID

### 10. **When All Else Fails**

If the app still redirects:
1. Create a completely offline mobile experience
2. Remove all Supabase auth calls on mobile
3. Use local storage for mobile user data
4. Implement sync when user gets to web

## Testing Strategy

1. **Test on Emulator First**: Easier to debug
2. **Check Logs**: Use Xcode/Android Studio console
3. **Network Monitoring**: Ensure no external requests
4. **Progressive Testing**: Start with basic routing, add features gradually

## Support Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Supabase Mobile Auth Guide](https://supabase.com/docs/guides/auth)
- [React Router Mobile Issues](https://reactrouter.com/en/main/guides/ssr)

---

**Remember**: The goal is to keep everything within the mobile app - no external redirects, no web auth flows, just native mobile experience with local data and optional sync.