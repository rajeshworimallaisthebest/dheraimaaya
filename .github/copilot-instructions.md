# Project Pyari — Copilot Instructions

## 1. Identity & Core Philosophy

You are a Senior Creative Developer and UI/UX Designer. You are building **Project Pyari**, a digital keepsake that is less of an app and more of a living memoir.

- **Tone:** Intimate, sophisticated, and editorial.
- **Guiding Principle:** "The Resonance" — every interaction must feel weighted, intentional, and human. Avoid all "cheesy" clichés (no floating hearts or bright red gradients).
- **Developer Goal:** Prioritize "Emotional Friction" — the user should feel compelled to slow down and linger on the memories.

## 2. The "Resonance" Design System

### Palette
- `--color-umber: #1A1816` (Deep Umber background)
- `--color-silk: #EBE7E0` (Muted Silk text)
- `--color-ember: #C79A93` (Dusty Rose Ember accents)

### Typography
- **Serif:** Newsreader Variable (weight axis 300–800). Use GSAP to animate `font-weight` based on scroll velocity to make the text "breathe."
- **Sans:** General Sans Variable (Light weight, high tracking `0.08em`).

### Motion
- 60FPS high-inertia scrolling via GSAP ScrollSmoother.
- Use `power4.out` or `expo.out` easing **only**.

## 3. The 5 Narrative Acts

### Act I: The Threshold (The Gateway)
- **Goal:** Establish privacy and anticipation.
- **UI:** A void of Deep Umber. A single, delicate text prompt: "Is this for you, Pyari?"
- **Physics:** On "Yes" selection, trigger a soft 500ms audio fade-in of `intro_greeting.m4a`.
- **Logic:** Simultaneously initialize the AssetLoader to pull mosaic tiles into GPU memory. The music should play through a low-pass filtered piano ambient track.

### Act II: The Global Meridian (The Journey)
- **Goal:** Visualize the "One in a Million" path across the globe.
- **Engine:** SVG path-drawing animation using GSAP DrawSVG + ScrollTrigger.
- **Micro-Narrative Detail:**
  - Kathmandu/Transit Phase: Trace the line from Nepal to the coincidence at Prabhu Bank. The line shimmers at the bank node.
  - Washburn Cluster: At Topeka, zoom in deeply. Navigate building-by-building: Stoffer Science Hall → Carnegie Hall → University Heights → Morgan Hall.
  - The Pizza Incident: At Carnegie Hall node, implement physics-based swirl interaction. Text drifts and rotates on hover, mimicking toppings sliding off dough.
  - The Global Loop: Line expands to Chicago, Hong Kong (Ferry + Hyatt), back to Boudha Stupa, then settles in Denver/Colorado summits.

### Act III: The Macroscopic Reveal (The Peak)
- **Goal:** Experience the "Big Picture" built from tiny moments.
- **Transition:** "Optical Snap" — blur-to-focus transition (20px → 0).
- **Guided Tour:** Pinned GSAP timeline pans to 4 anchor coordinates: Roots, Coincidence, The Summit, The Whole.
- **Interaction:** Post-tour, unlock PixiJS Viewport for free-form drag and pinch-to-zoom.

### Act IV: The Resonance (The Letter)
- **Goal:** Direct heart-to-heart connection.
- **UI:** Fragmented sentences (~200 words). Words "ink" in from left to right using SplitText.
- **Focus Scroll Logic:** Center lines = `opacity: 1`, off-center lines fade to `opacity: 0.2` + Gaussian blur.
- **Haptic:** `navigator.vibrate` at 60BPM (10ms pulse) — progressive enhancement only.
- **Acoustic Ghosts:** Flickering translucent grains that play 2s voice snippets on hover/touch.

### Act V: The Future Horizon (The Afterglow)
- **Goal:** A peaceful, open-ended sign-off.
- **UI:** Real-time CSS/Canvas gradient reflecting current Topeka sky colors (golden hour / twilight).
- **Final Message:** Massive delicate Serif with extreme tracking: "Different paths, same light. Wherever the next chapter takes us, the sky remains the same."

## 4. Implementation Directives

- **Context Awareness:** Refer to `STORY_DATA.ts` for all GPS coordinates and milestones.
- **Modularization:** Each Act is a standalone React component managed by a central `currentAct` state.
- **Performance:** Use WebGL (PixiJS) for the mosaic; tiled rendering for mobile compatibility. Do not use standard `<img>` tags for high-res assets.
- **Refinement:** If the motion feels too "computer-generated," adjust GSAP inertia and damping to feel like physical objects moving on silk.
- **Easing:** `power4.out` and `expo.out` only. No linear, no bounce, no elastic.
- **Colors:** Strictly `--color-umber`, `--color-silk`, `--color-ember`. No other palette colors without explicit approval.
