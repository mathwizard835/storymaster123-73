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
    androidScheme: 'https',
    // CRITICAL: No server.url - app runs locally from dist/
    // Never point to Lovable or any external URL
  }
};

export default config;