import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bmwe60.coderpro',
  appName: 'BMW E60 Coder Pro',
  webDir: 'dist',
  android: {
    backgroundColor: '#0a0a0a',
    allowMixedContent: true,
  },
  server: {
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#0a0a0a',
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
