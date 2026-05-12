/**
 * NativeWind Configuration for AporTamos React Native
 *
 * This file configures NativeWind, which provides Tailwind CSS support
 * for React Native components. NativeWind allows using Tailwind's
 * utility-first approach in React Native code.
 *
 * Installation:
 *   npm install nativewind
 *   npm install -D tailwindcss
 *
 * Usage:
 *   import { useTailwind } from 'nativewind';
 *   const styles = useTailwind(className);
 *   <View style={styles.style} />
 *
 * Note: NativeWind is optional and can be integrated later.
 * For now, use constants/theme.ts for mobile styling.
 */

module.exports = {
  // Input: Tailwind config
  input: './tailwind.config.js',

  // For React Native Web
  web: {
    // Enable CSS parsing for web
    enabled: true,
  },

  // For React Native mobile
  native: {
    // Enable NativeWind for mobile (requires nativewind package)
    enabled: false, // Set to true when nativewind is installed
  },

  // Custom prefix for Tailwind classes (optional)
  prefix: 'tw-',

  // Experimental features
  experimental: {
    // Enable experimental features if needed
    optimizeUnknownUtilities: true,
  },
};
