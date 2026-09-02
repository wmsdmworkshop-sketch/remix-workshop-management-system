import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'devanand.aivaahan.com',
  appName: 'AiVaahan DWIP',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Load the live deployed web app instead of the bundled assets, so every
    // future web deploy reaches installed apps instantly — no APK rebuild per UI
    // change. The bundled `dist` remains only a fallback. Requires a network
    // connection (native plugins — camera, GPS — still work).
    url: 'https://devanand.aivaahan.com',
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1e1e2d',
      androidSplashResourceName: 'splash',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1e1e2d'
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK'
    }
  }
};

export default config;
