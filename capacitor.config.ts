import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hadheerti.app',
  appName: 'حضيرتي',
  webDir: 'www',
  bundledWebRuntime: false,
  backgroundColor: '#14243a',
  android: { allowMixedContent: false },
  ios: { contentInset: 'automatic' }
};

export default config;
