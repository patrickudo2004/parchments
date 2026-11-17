import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.parchments.app',
  appName: 'Parchments',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  }
};

export default config;
