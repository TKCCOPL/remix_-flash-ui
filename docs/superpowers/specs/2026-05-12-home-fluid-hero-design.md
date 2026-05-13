# Home Hero Fluid Interaction Design

## Problem

The home page hero title should feel closer to the MiMo reference style: a dark fluid mask that follows pointer movement and creates strong contrast over hero content, while preserving current bilingual copy and existing page structure.

## Scope

In scope:
- Home page hero visual and interaction only
- Hero badge, title, subtitle remain current i18n content
- Desktop full interaction
- Mobile simplified interaction
- Accessibility and graceful fallback

Out of scope:
- Backend/API changes
- Other pages, routes, and admin surfaces
- Copy rewrite

## Proposed Approach

Create a dedicated `FluidHero` component used only by `Home.tsx`.

### Layer Structure

1. Background layer:
   - Subtle repeated typography pattern to echo the reference rhythm
2. Content layer:
   - Existing `heroBadge`, `heroTitle`, `heroSubtitle`
3. Interaction layer:
   - Canvas-driven dark fluid mask rendered above background, visually interacting with hero text

### Interaction Model

- Track normalized pointer/touch position
- Maintain blob state (position, velocity, radius)
- Spawn short-lived ripple perturbations on movement
- Render on `requestAnimationFrame` with eased follow and mild viscous lag
- Cleanup animation frame and listeners on unmount

### Device Strategy

- Desktop: full fluid behavior
- Mobile: simplified behavior (lower update pressure, fewer ripples, smaller influence area)

## Visual Rules

- Fluid color uses near-black neutral, not pure `#000`
- Keep typography strong and readable
- No bounce/elastic motion; use smooth ease-out behavior
- Preserve existing hero copy in both Chinese and English

## Accessibility and Fallback

- Respect `prefers-reduced-motion`: disable animation and keep static hero
- If required canvas/compositing behavior is unsupported, fall back to static hero styling
- Keep semantic heading structure and text readability intact

## Technical Changes

- `src/pages/Home.tsx`
  - Replace current hero section with `FluidHero` usage
- `src/components/FluidHero.tsx` (new)
  - Implements layer layout, pointer handling, and canvas rendering lifecycle
- `src/index.css` (or local style module)
  - Adds pattern and blending utility styles for hero effect
- `src/i18n.ts`
  - No copy change required

## Acceptance Criteria

1. Desktop pointer movement creates a stable dark fluid mask effect in the hero area with clear contrast response.
2. Mobile keeps simplified weak interaction without obvious jank.
3. Language switching keeps hero copy and layout correct.
4. Reduced-motion users see a static, readable hero without fluid animation.
5. Non-supporting environments gracefully degrade to static hero.

## Risks and Mitigations

- Performance spikes on low-end mobile devices
  - Mitigation: lower interaction complexity and cap ripple count for mobile
- Visual noise reducing readability
  - Mitigation: keep pattern contrast low and text layer hierarchy strong
- Browser rendering inconsistency
  - Mitigation: strict fallback path to static hero

