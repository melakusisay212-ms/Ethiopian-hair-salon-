import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ethiopia.salonmanager',
  appName: 'Salon Manager',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Preferences: {
      // default
    },
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
