import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.turbodrift.racer',
  appName: 'Turbo Drift Racer',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
