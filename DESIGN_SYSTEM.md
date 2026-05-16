# Biolabs Design System

## Design Philosophy
Biolabs is a **brutalist scientific workstation** UI inspired by professional tools (Figma Dev Mode, Linear, DaVinci Resolve, Blender). The design prioritizes:
- **Monochrome precision** over colorful aesthetics
- **Sharp, edge-based geometry** (no rounded corners)
- **High information density** with minimal whitespace
- **Dark industrial aesthetic** (#0A0A0A primary background)
- **Keyboard-first interactions** with scientific UX feel

## Color System

### Primary Backgrounds
- `#0A0A0A` - Main application background
- `#111111` - Alternate dark background
- `#161616` - Tertiary dark background

### Secondary Panels
- `#1B1B1B` - Panel backgrounds
- `#202020` - Elevated panel backgrounds

### Borders & Dividers
- `#2A2A2A` - Border color (1px sharp)
- `#3A3A3A` - Subtle dividers

### Text Colors
- `#F2F2F2` - Primary text (high contrast)
- `#9A9A9A` - Secondary text (reduced contrast)
- `#5A5A5A` - Disabled text
- `#7C8A99` - Accent text (subtle cold gray-blue, minimal use)
- `#FFFFFF` - Accent highlights (very limited)

## Typography

### Font Stack
- Primary: Inter
- Secondary: Geist
- Tertiary: IBM Plex Sans
- System: SF Pro Display

### Typography Rules
- Use medium weight (500) for body text
- Uppercase section labels with tight spacing
- No rounded, playful fonts
- Scientific UI feel with precision
- Tight line-height for density

## Layout Architecture

### Docking Panel System
```
┌─────────────────────────────────────────────────────┐
│ LEFT PANEL      │ CENTER VIEWPORT │ RIGHT PANEL     │
│ - Controls      │ - WebGL Scene   │ - Properties    │
│ - Hierarchy     │ - Molecular Sim │ - Metrics       │
│ - Datasets      │                 │ - Chain Info    │
│ - Layers        │                 │ - Interaction   │
└─────────────────────────────────────────────────────┘
│ BOTTOM PANEL (optional)                             │
│ - Timeline / Logs / Console                         │
└─────────────────────────────────────────────────────┘
```

### Panel Sizing
- Left Panel: 280px (fixed)
- Right Panel: 320px (fixed)
- Center: Flexible (remaining space)
- Bottom: 200px (collapsible)

## Component Design Rules

### Buttons
- Sharp corners (no border-radius)
- Thin 1px borders (#2A2A2A)
- Subtle hover effect (opacity change, no glow)
- No shadows or gradients
- Medium weight text

### Panels
- Matte surfaces (#1B1B1B or #202020)
- Low contrast separation via borders
- Compact padding (8px/12px)
- No drop shadows

### Transitions
- Ultra-fast (100-200ms)
- Opacity-only (no scale/transform)
- Cubic-bezier easing for snappy feel

### Icons
- Lucide React (scientific, minimal style)
- Monochrome (#F2F2F2 or #9A9A9A)
- 16px-24px sizing

## Interaction Patterns

### Hover States
- Text: opacity 0.8 → 1.0
- Buttons: background lighten by 1 shade
- Panels: border opacity increase

### Active States
- Highlight with #7C8A99 (subtle accent)
- Maintain monochrome feel
- No color saturation

### Focus States
- Visible focus ring (required for accessibility)
- Use #7C8A99 or #FFFFFF
- 2px width

## Spacing System
- Base unit: 4px
- Compact: 8px (panels, buttons)
- Standard: 12px (section spacing)
- Generous: 16px (major sections)
- Large: 24px (layout sections)

## Border Radius
- **NO rounded corners** - all elements use sharp corners (0px)
- Exception: Only for accessibility focus rings (2-4px)

## Shadows
- **Minimal shadows** - avoid drop shadows
- Use borders (#2A2A2A) for separation instead
- Subtle elevation via background color only

## Animation Guidelines
- Animations are minimal and purposeful
- Keyboard actions: instant (no animation)
- Hover/focus: 100-150ms opacity transitions
- Modal/drawer: 200-300ms slide with opacity
- Respect `prefers-reduced-motion`

## Accessibility
- All interactive elements must have visible focus states
- Minimum contrast ratio 4.5:1 (WCAG AA)
- Keyboard navigation fully supported
- Screen reader friendly semantic HTML
- No color-only information conveyance

## Component Library Usage
- Use shadcn/ui components as base
- Customize to remove border-radius
- Override colors to match monochrome palette
- Maintain consistent spacing

## Future Extensions
- Prepare for AI integration UI (placeholder architecture)
- Extensible simulation type system
- Plugin-ready layer system
- Command palette extensibility
