import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.7dfcc3406f8946d591f9ec42b59c5d54',
  appName: 'StoryMaster Quest',
  webDir: 'dist',
  server: {
    url: 'https://7dfcc340-6f89-46d5-91f9-ec42b59c5d54.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1a1a2e",
      showSpinner: false
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#1a1a2e"
    },
    Haptics: {},
    Share: {},
    App: {
      deepLinkingEnabled: true
    }
  },
  ios: {
    contentInset: 'automatic'
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'AAB'
    }
  }
};

export default config;