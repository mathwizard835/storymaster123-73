import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ordinaryheroes.storymasterkids',
  appName: 'StoryMaster Kids',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1a1a2e',
      overlaysWebView: true
    }
  },
  ios: {
    contentInset: 'always'
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
