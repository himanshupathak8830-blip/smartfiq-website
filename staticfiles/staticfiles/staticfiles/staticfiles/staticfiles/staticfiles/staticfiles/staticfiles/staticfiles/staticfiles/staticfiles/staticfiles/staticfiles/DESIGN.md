---
name: Azure Agency System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#3e4850'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6e7881'
  outline-variant: '#bdc8d1'
  surface-tint: '#00658d'
  primary: '#00658d'
  on-primary: '#ffffff'
  primary-container: '#00aeef'
  on-primary-container: '#003e58'
  inverse-primary: '#82cfff'
  secondary: '#465d92'
  on-secondary: '#ffffff'
  secondary-container: '#acc3ff'
  on-secondary-container: '#384f84'
  tertiary: '#305ea2'
  on-tertiary: '#ffffff'
  tertiary-container: '#79a4ec'
  on-tertiary-container: '#003874'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c6e7ff'
  primary-fixed-dim: '#82cfff'
  on-primary-fixed: '#001e2d'
  on-primary-fixed-variant: '#004c6b'
  secondary-fixed: '#d9e2ff'
  secondary-fixed-dim: '#b0c6ff'
  on-secondary-fixed: '#001945'
  on-secondary-fixed-variant: '#2e4579'
  tertiary-fixed: '#d6e3ff'
  tertiary-fixed-dim: '#a9c7ff'
  on-tertiary-fixed: '#001b3e'
  on-tertiary-fixed-variant: '#0d4688'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 64px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '300'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  section-gap: 120px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system embodies the essence of a high-end digital agency: professional, innovative, and meticulously polished. It utilizes a **Glassmorphism** and **Corporate Modern** hybrid style, focusing on depth through translucent layers, soft glows, and high-fidelity 3D assets.

The target audience consists of enterprise clients and high-growth startups seeking a premium, trustworthy partner. The UI should evoke a sense of "technological luxury"—where precision meets fluidity. 

Key visual principles include:
- **Atmospheric Depth:** Extensive use of `backdrop-blur` and multi-layered box shadows.
- **Luminous Accents:** Subtle gradients and inner glows that make elements appear as if they are light-emitting.
- **Generous Breathing Room:** High whitespace ratios to maintain an editorial, high-end feel.

## Colors

The palette is rooted in deep oceanic blues to establish authority, contrasted with a vibrant cyan that acts as a digital "spark."

- **Primary (#00aeef):** The "Cyan Spark." Used for primary calls to action, active states, and focus indicators.
- **Secondary (#001f52):** The "Deep Abyss." Used for primary backgrounds in dark mode or hero sections to create a high-contrast foundation for white text.
- **Tertiary (#004082):** The "Oceanic Mid." Used for secondary surfaces, gradients, and decorative glows.
- **Neutral (#F8FAFC):** A crisp, cool-toned white for typography and "light mode" surfaces.

**Implementation Note:** Utilize semi-transparent versions of these colors (e.g., `rgba(255, 255, 255, 0.1)`) for glass panels to allow the background gradients to bleed through.

## Typography

The system uses **Plus Jakarta Sans** (a modern alternative to Urbanist) to achieve a sophisticated, geometric look. 

- **Headlines:** Set in Bold or ExtraBold weights with tight tracking to create impact. For hero sections, use `display-lg` with a slight gradient fill or a soft drop shadow for legibility over complex backgrounds.
- **Body:** Use the Light (300) weight for long-form content to maintain an elegant, airy feel. Ensure line height is generous (1.6x) to facilitate readability.
- **Labels:** Small caps with increased tracking are used for "over-titles" or category chips to provide a structured hierarchy.

## Layout & Spacing

This system utilizes a **Fluid Grid** model with a heavy emphasis on vertical rhythm.

- **Desktop (1440px+):** 12-column grid, 1280px max-width container, 24px gutters, and 64px side margins.
- **Tablet (768px - 1024px):** 8-column grid, 32px side margins.
- **Mobile (Under 768px):** 4-column grid, 16px side margins.

**Spacing Philosophy:** Use "The Rule of Double." If a gap feels too small, double it. High-end design lives in the whitespace. Sections should be separated by at least 120px on desktop to allow each service or case study to stand alone.

## Elevation & Depth

Hierarchy is established through **Luminous Stacking**. Instead of traditional grey shadows, this system uses:

1.  **Backdrop Blurs:** Every floating card or navigation bar must use a `backdrop-filter: blur(20px)` and a semi-transparent background (typically `white` at 70% opacity for light surfaces or `secondary` at 40% for dark surfaces).
2.  **Inner Glows:** Use a 1px white or light-cyan inner border (stroke) to simulate a glass edge catching the light.
3.  **Colored Shadows:** For primary elements like buttons or active cards, use a shadow that inherits the color of the element (e.g., a cyan shadow for a cyan button) at a very low opacity (15-20%) and high blur (30px+).

## Shapes

The shape language is friendly yet structured.
- **Base Radius:** 16px (0.5rem base in this system's scale) for standard components like input fields and small cards.
- **Large Radius:** 24px (1.5rem) for main containers, hero sections, and featured images.
- **Pill Shapes:** Used exclusively for tags, badges, and the primary "Get in Touch" buttons to create a distinct interactive language.

## Components

### Buttons
- **Primary:** Pill-shaped, vibrant cyan (#00aeef) gradient background, white text, bold weight. Features a soft cyan glow on hover.
- **Secondary (Glass):** Pill-shaped, semi-transparent background with a 1px white border and backdrop-blur. 

### Cards
- **The "Glass" Card:** 24px corner radius, white background at 10% opacity (on dark) or 80% (on light), 20px blur, and a subtle 1px border.
- **The "3D" Card:** For service highlights, include a floating 3D icon that breaks the top boundary of the card to create depth.

### Input Fields
- Semi-transparent fills with 16px corner radius. On focus, the border transitions to Primary Cyan with a subtle outer glow.

### Chips & Badges
- Small, pill-shaped, with a Tertiary Blue background and 50% opacity. Text should be `label-md`.

### Navigation Bar
- A floating "dock" style bar with high backdrop-blur, keeping the brand logo on the left and primary CTA as a pill button on the right.