import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rannikon.app',
  appName: 'Rannikon',
  webDir: 'out',
  server: {
    url: 'https://www.rannikon.com',
    cleartext: true
  }
};

export default config;
