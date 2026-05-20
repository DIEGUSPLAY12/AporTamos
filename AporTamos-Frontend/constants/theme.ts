import { Platform } from 'react-native';

// Design system: Vibrant Household System
// Primary: Electric Violet | Secondary/Streak: Energetic Orange

export const Colors = {
  light: {
    // Core text & background
    text: '#1b1b23',
    background: '#fcf8ff',
    subtext: '#464554',

    // Primary (violet)
    tint: '#4648d4',
    primary: '#4648d4',
    onPrimary: '#ffffff',
    primaryContainer: '#6063ee',
    primaryFixed: '#e1e0ff',
    inversePrimary: '#c0c1ff',

    // Secondary / streak (orange)
    streak: '#fd761a',
    streakContainer: '#fd761a',
    onStreak: '#ffffff',

    // Surfaces
    surface: '#fcf8ff',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#f5f2fe',
    surfaceContainer: '#efecf8',
    surfaceContainerHigh: '#e9e6f3',
    surfaceContainerHighest: '#e4e1ed',
    surfaceVariant: '#e4e1ed',

    // On-surface
    onSurface: '#1b1b23',
    onSurfaceVariant: '#464554',

    // Borders
    outline: '#767586',
    outlineVariant: '#c7c4d7',
    border: '#c7c4d7',

    // Cards
    cardBackground: '#ffffff',

    // States
    error: '#ba1a1a',
    errorContainer: '#ffdad6',

    // Tab bar aliases
    icon: '#767586',
    tabIconDefault: '#767586',
    tabIconSelected: '#4648d4',
  },
  dark: {
    text: '#e4e1ed',
    background: '#12121a',
    subtext: '#9794a8',

    tint: '#c0c1ff',
    primary: '#c0c1ff',
    onPrimary: '#07006c',
    primaryContainer: '#2f2ebe',
    primaryFixed: '#e1e0ff',
    inversePrimary: '#4648d4',

    streak: '#ffb690',
    streakContainer: '#783200',
    onStreak: '#341100',

    surface: '#1b1b23',
    surfaceContainerLowest: '#0f0f17',
    surfaceContainerLow: '#1e1e27',
    surfaceContainer: '#232330',
    surfaceContainerHigh: '#2d2d3a',
    surfaceContainerHighest: '#383845',
    surfaceVariant: '#464554',

    onSurface: '#e4e1ed',
    onSurfaceVariant: '#c7c4d7',

    outline: '#918fa5',
    outlineVariant: '#464554',
    border: '#464554',

    cardBackground: '#1e1e27',

    error: '#ffb4ab',
    errorContainer: '#93000a',

    icon: '#918fa5',
    tabIconDefault: '#918fa5',
    tabIconSelected: '#c0c1ff',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "'Plus Jakarta Sans', Inter, system-ui, -apple-system, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});

// Spacing tokens (8px rhythm)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
};

// Border radius tokens
export const Radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
};

// Shadow tokens
export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 30,
    elevation: 2,
  },
  primary: {
    shadowColor: '#4648d4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 4,
  },
  streak: {
    shadowColor: '#fd761a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 3,
  },
};
