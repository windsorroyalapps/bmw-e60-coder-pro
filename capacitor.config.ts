import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bmwe60.coderpro',
  appName: 'BMW E60 Coder Pro',
  webDir: 'dist',
  android: {
    backgroundColor: '#0a0a0a',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#0a0a0a',
      androidScaleType: 'CENTER_CROP',
    },
  },
  server: {
    cleartext: true,
  },
};

export default config;
