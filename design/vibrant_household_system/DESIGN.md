---
name: Vibrant Household System
colors:
  surface: '#fcf8ff'
  surface-dim: '#dbd8e4'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2fe'
  surface-container: '#efecf8'
  surface-container-high: '#e9e6f3'
  surface-container-highest: '#e4e1ed'
  on-surface: '#1b1b23'
  on-surface-variant: '#464554'
  inverse-surface: '#303038'
  inverse-on-surface: '#f2effb'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#9d4300'
  on-secondary: '#ffffff'
  secondary-container: '#fd761a'
  on-secondary-container: '#5c2400'
  tertiary: '#904900'
  on-tertiary: '#ffffff'
  tertiary-container: '#b55d00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb690'
  on-secondary-fixed: '#341100'
  on-secondary-fixed-variant: '#783200'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703700'
  background: '#fcf8ff'
  on-background: '#1b1b23'
  surface-variant: '#e4e1ed'
typography:
  display-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-bold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  container-margin: 20px
  stack-gap: 16px
  inline-gap: 12px
  section-padding: 32px
  grid-columns: '4'
---

## Brand & Style

This design system is built on a **Modern Minimalist** foundation infused with **Gamified accents**. The brand personality is that of an "Encouraging Coach"—efficient and organized, yet celebratory of small wins. 

The aesthetic prioritizes clarity to reduce the cognitive load of household management, utilizing generous whitespace and a "soft-touch" interface. While the base is clean and systematic, high-energy focal points (streaks, leveling up, and task completion) use vibrant color and subtle motion to create an addictive, rewarding experience. The emotional response should be one of "effortless productivity" and "domestic harmony."

## Colors

The palette leverages a sophisticated **Electric Violet** as the primary driver for navigation and core actions. To fuel the gamification engine, an **Energetic Orange** is reserved exclusively for "heat" mechanics, such as streaks and urgent tasks.

- **Primary (Violet):** Used for primary buttons, active states, and progress bars.
- **Secondary (Orange):** Used for fire icons, streak counters, and high-priority alerts.
- **Success (Green):** Specifically for "Task Complete" states and badge unlocks.
- **Neutrals:** A range of cool grays (Slate) provides a breathable, modern backdrop.

**Dark Mode Strategy:** Transitions from a Slate-50 background to a deep Navy-900. Surfaces use a slightly lighter elevation tint rather than pure black to maintain the "soft" feel.

## Typography

This system uses a pairing of **Plus Jakarta Sans** for headings and **Inter** for functional copy. 

- **Plus Jakarta Sans** provides a friendly, slightly rounded geometric feel that aligns with the "soft" visual style. It is used for "Big Numbers" (streak counts, points) and screen titles.
- **Inter** ensures maximum legibility for task lists and settings. 

Letter spacing is tightened on larger headlines to create a punchy, editorial look, while body text maintains standard tracking for readability during quick scans.

## Layout & Spacing

This design system utilizes a **Mobile-First Fluid Grid** with a 4-column structure. 

- **The 8px Rhythm:** All spacing increments are multiples of 8.
- **Generous Margins:** 20px horizontal margins ensure content feels centered and "contained" even on edge-to-edge displays.
- **Visual Breathing Room:** Vertical spacing between cards is set to 16px to prevent the interface from feeling cluttered, reinforcing the "Minimalist" brand pillar.
- **Safe Areas:** Extra bottom padding is reserved for the floating action button (FAB) or primary navigation bar.

## Elevation & Depth

Hierarchy is established through **Ambient Shadows** and **Tonal Layering**. 

1.  **Level 0 (Base):** Neutral background (F8FAFC).
2.  **Level 1 (Cards/Tiles):** White background with a very soft, diffused shadow: `0px 10px 30px rgba(0, 0, 0, 0.04)`.
3.  **Level 2 (Active Elements):** Elements being interacted with or floating (like a FAB) use a more pronounced shadow with a hint of the primary color: `0px 15px 35px rgba(99, 102, 241, 0.15)`.

Avoid harsh borders. Instead, use thin 1px inner strokes in a slightly darker neutral shade to define boundaries on light surfaces.

## Shapes

The shape language is defined by **Extreme Roundedness**. 

- **Standard Cards/Modals:** 24px corner radius.
- **Buttons:** Fully pill-shaped (50px+) to encourage tapping and feel "friendly."
- **Progress Bars:** Fully rounded caps.

The high corner radius (24px+) is the primary differentiator, making the app feel like a modern digital toy rather than a spreadsheet of chores.

## Components

- **Task Cards:** Use a 24px radius. Contain a large checkbox on the left and a "streak fire" icon on the right if applicable. 
- **The "Big Check":** A custom circular checkbox that, when tapped, triggers a haptic pop and a confetti burst of the Success Green color.
- **Gamification Badges:** Circular or hex-shaped containers with 2-color gradients using the Primary and Secondary palette.
- **Primary Button:** Pill-shaped, using the Vibrant Violet. High vertical padding (16px) for a "squishy," tactile feel.
- **Streak Tracker:** A specialized horizontal component with a gradient background (Orange to Yellow) and white "Plus Jakarta Sans" bold typography.
- **Input Fields:** Large, 20px rounded corners with a subtle gray fill that turns into a Primary Violet border on focus. No shadows on resting state.
- **Progress Rings:** Thick stroke widths (8pt+) with rounded ends to visualize chore completion percentage for the household.