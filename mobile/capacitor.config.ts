import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.emergencydelivery.mobile',
  appName: 'Emergency Delivery',
  webDir: 'www',
  server: {
    url: 'https://emergency-delivery.emergency-delivery1.blitz.cloud',
    cleartext: false,
    allowNavigation: ['emergency-delivery.emergency-delivery1.blitz.cloud']
  }
};

export default config;
