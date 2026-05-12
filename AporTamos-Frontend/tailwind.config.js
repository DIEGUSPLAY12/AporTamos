/**
 * Tailwind CSS Configuration for AporTamos Frontend
 *
 * This configuration provides:
 * - Tailwind CSS setup for React Native Web
 * - Consistent design tokens across mobile and web
 * - Dark mode support via color scheme
 * - Custom colors matching AporTamos brand
 * - Responsive typography
 * - Utility-first styling foundation
 *
 * For React Native mobile development, colors and spacing are available
 * via the theme exports in constants/theme.ts.
 *
 * For web development (React Native Web), Tailwind utilities can be used
 * in className attributes on components.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Enable dark mode via class strategy
  // Add "dark" class to root element to enable dark mode
  darkMode: 'class',

  content: [
    // Include all TypeScript/JavaScript files in the app
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
    './context/**/*.{js,jsx,ts,tsx}',
    './hooks/**/*.{js,jsx,ts,tsx}',
  ],

  theme: {
    extend: {
      // Custom color scheme matching AporTamos design
      colors: {
        // Primary brand colors
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c3d66',
        },

        // Secondary colors for accents
        secondary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },

        // Neutral grays for text, backgrounds, borders
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },

        // Status colors
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',

        // Light mode specific
        light: {
          bg: '#ffffff',
          text: '#11181C',
          border: '#e5e7eb',
        },

        // Dark mode specific
        dark: {
          bg: '#151718',
          text: '#ecedee',
          border: '#404040',
        },
      },

      // Typography configuration
      fontSize: {
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.5' }],
        lg: ['18px', { lineHeight: '1.5' }],
        xl: ['20px', { lineHeight: '1.2' }],
        '2xl': ['24px', { lineHeight: '1.2' }],
        '3xl': ['30px', { lineHeight: '1.2' }],
        '4xl': ['36px', { lineHeight: '1.2' }],
      },

      // Spacing tokens
      spacing: {
        0: '0',
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        16: '64px',
        20: '80px',
      },

      // Responsive breakpoints for web
      screens: {
        xs: '320px',
        sm: '375px', // Mobile width
        md: '600px', // Tablet
        lg: '1024px', // Desktop
        xl: '1280px',
        '2xl': '1536px',
      },

      // Border radius tokens
      borderRadius: {
        none: '0',
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
      },

      // Shadow definitions
      boxShadow: {
        none: 'none',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },

      // Custom animations for interactions
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },

      // Opacity scale
      opacity: {
        0: '0',
        5: '0.05',
        10: '0.1',
        20: '0.2',
        30: '0.3',
        40: '0.4',
        50: '0.5',
        60: '0.6',
        70: '0.7',
        80: '0.8',
        90: '0.9',
        95: '0.95',
        100: '1',
      },
    },
  },

  plugins: [
    // Add plugins here as needed
    // Example: require('@tailwindcss/forms'),
    // Example: require('nativewind/tailwind/css'),
  ],
};
