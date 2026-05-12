/**
 * TAILWIND CSS CONFIGURATION GUIDE FOR APORTAMOS FRONTEND
 *
 * This document explains how to use Tailwind CSS in the AporTamos frontend.
 * The configuration supports both React Native Web and mobile development.
 */

// ============================================================================
// OVERVIEW
// ============================================================================

/*
AporTamos uses Tailwind CSS configured for React Native development:

1. tailwind.config.js
   - Main Tailwind configuration
   - Defines colors, spacing, typography, breakpoints
   - Used for web development (React Native Web)

2. nativewind.config.ts
   - NativeWind configuration for future mobile integration
   - Currently disabled, can be enabled when NativeWind is installed
   - Allows Tailwind classes in React Native components

3. constants/theme.ts
   - Current primary source for colors and typography
   - Used for mobile styling via React Native styles
   - Aligned with Tailwind design tokens

4. tailwind.css (optional)
   - Create if you need global CSS styles for web
   - Import Tailwind directives
*/

// ============================================================================
// USAGE FOR REACT NATIVE WEB
// ============================================================================

/*
For React Native Web (web development), use Tailwind utilities in className:

Example:
```typescript
import { View, Text } from 'react-native';

export function Component() {
  return (
    <View className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900">
      <Text className="text-2xl font-bold text-slate-900 dark:text-white">
        Hello World
      </Text>
    </View>
  );
}
```

Common Tailwind Classes:
- Spacing: p-4, m-2, gap-3, w-full, h-screen
- Colors: bg-primary-500, text-neutral-900, border-slate-200
- Layout: flex, flex-col, items-center, justify-between
- Responsive: md:text-xl, lg:p-8
- Dark mode: dark:bg-slate-900, dark:text-white
*/

// ============================================================================
// USAGE FOR REACT NATIVE MOBILE
// ============================================================================

/*
For React Native mobile (currently using StyleSheet), use constants/theme.ts:

Example:
```typescript
import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function Component() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: colors.text }]}>Hello</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
```

Future: When NativeWind is integrated, you can use Tailwind classes:
```typescript
import { useTailwind } from 'nativewind';

const styles = useTailwind(
  'flex items-center justify-center bg-white dark:bg-slate-900'
);
<View style={styles.style} />
```
*/

// ============================================================================
// COLOR PALETTE
// ============================================================================

/*
AporTamos uses a coordinated color palette aligned with Tailwind:

Primary (Sky Blue):
  50: #f0f9ff      100: #e0f2fe      200: #bae6fd
  300: #7dd3fc     400: #38bdf8      500: #0ea5e9 (main)
  600: #0284c7     700: #0369a1      800: #075985      900: #0c3d66

Secondary (Purple):
  50: #f5f3ff      100: #ede9fe      200: #ddd6fe
  300: #c4b5fd     400: #a78bfa      500: #8b5cf6
  600: #7c3aed     700: #6d28d9      800: #5b21b6      900: #4c1d95

Neutral (Grays):
  50: #fafafa      100: #f5f5f5      200: #e5e5e5
  300: #d4d4d4     400: #a3a3a3      500: #737373
  600: #525252     700: #404040      800: #262626      900: #171717

Status:
  Success: #10b981  Warning: #f59e0b  Error: #ef4444  Info: #3b82f6

Light Mode:
  Background: #ffffff    Text: #11181C   Border: #e5e7eb

Dark Mode:
  Background: #151718    Text: #ecedee   Border: #404040

Usage in theme.ts:
```typescript
import { Colors } from '@/constants/theme';
const bg = Colors[colorScheme ?? 'light'].background;
const text = Colors[colorScheme ?? 'light'].text;
```
*/

// ============================================================================
// SPACING SCALE
// ============================================================================

/*
Tailwind spacing scale (4px base unit):
  1: 4px       2: 8px        3: 12px       4: 16px
  5: 20px      6: 24px       8: 32px       10: 40px
  12: 48px     16: 64px      20: 80px

Usage:
  <View className="p-4 m-2 gap-3 mb-6">
    margin: 8px, padding: 16px, gap: 12px, margin-bottom: 24px
  </View>
*/

// ============================================================================
// RESPONSIVE BREAKPOINTS
// ============================================================================

/*
Mobile-first breakpoints for responsive design:
  xs: 320px    sm: 375px (mobile width)
  md: 600px    lg: 1024px (desktop)
  xl: 1280px   2xl: 1536px

Usage:
  className="text-sm md:text-base lg:text-lg"
  -> 12px on mobile, 16px on tablet, 18px on desktop
*/

// ============================================================================
// DARK MODE
// ============================================================================

/*
Dark mode is enabled via 'class' strategy. Add "dark" class to root element:

```typescript
// In _layout.tsx
<ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
  <RootStack>
    {/* dark class will be applied when colorScheme is 'dark' */}
  </RootStack>
</ThemeProvider>
```

Using dark mode in web:
  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"

Color scheme auto-detection:
  - Light: white bg, dark text
  - Dark: dark bg, light text
*/

// ============================================================================
// EXTENDING TAILWIND
// ============================================================================

/*
To add custom utilities or colors, edit tailwind.config.js:

```javascript
theme: {
  extend: {
    colors: {
      brand: {
        primary: '#0ea5e9',
        secondary: '#8b5cf6',
      },
    },
    fontSize: {
      'hero': ['48px', { lineHeight: '1.2' }],
    },
  },
},
```

Then use in components:
  className="text-brand-primary text-hero"
*/

// ============================================================================
// FUTURE ENHANCEMENTS
// ============================================================================

/*
To integrate NativeWind for mobile (future):

1. Install: npm install nativewind
2. Update nativewind.config.ts: enable: true
3. Use in React Native components:
   import { useTailwind } from 'nativewind';
   const tw = useTailwind('flex items-center p-4');
   <View style={tw.style} />

Benefits:
  - Single styling approach across web and mobile
  - Consistency with Tailwind ecosystem
  - Easier component reuse between platforms
*/

// ============================================================================
// BEST PRACTICES
// ============================================================================

/*
1. Use constants/theme.ts for colors on mobile
   - More performant than runtime style evaluation
   - Better type checking for React Native

2. Use Tailwind classes for React Native Web
   - Familiar for web developers
   - Built-in responsive design
   - Easy dark mode support

3. Organize components with Tailwind
   - Utility-first approach for simple layouts
   - Extract complex styles to component-specific stylesheets

4. Dark mode: Always provide dark: variant
   className="bg-white dark:bg-slate-900"
   style={{ backgroundColor: colors.background }}

5. Responsive: Mobile-first mindset
   className="text-sm md:text-base lg:text-lg"
*/

// ============================================================================
// RESOURCES
// ============================================================================

/*
- Tailwind CSS Documentation: https://tailwindcss.com/docs
- NativeWind: https://www.nativewind.dev/
- React Native Styling: https://reactnative.dev/docs/style
- Color Reference: tailwind.config.js theme.colors section
*/
