# Project Pyari — Development Context

> Living document tracking architectural decisions, bugs encountered, and fixes applied.
> Last updated: Feb 16, 2026.

---

## Architecture Overview

- **Framework:** React + TypeScript + Vite
- **Scroll engine:** GSAP ScrollSmoother (wraps `#smooth-wrapper` / `#smooth-content`)
- **Animation:** GSAP (ScrollTrigger, DrawSVG, SplitText)
- **Structure:** 5 Narrative Acts, each a React component managed by `currentAct` state in `App.tsx`
- **Act I:** Gatekeeper (identity/password gate) — always rendered
- **Acts II–V:** Conditionally rendered after authentication

### ScrollSmoother Mechanics

ScrollSmoother sets `#smooth-wrapper` to `position: fixed; overflow: hidden; height: 100%` and translates `#smooth-content` via `transform: translate3d(0, -scrollY, 0)`. This has major implications for any child that needs to stay viewport-locked:

- **`position: fixed` is broken** inside `#smooth-content` — CSS spec says fixed positioning is relative to the nearest ancestor with a transform, not the viewport.
- **`position: sticky` is broken** — the fixed wrapper has no scroll context, so sticky has nothing to stick against.
- **ScrollTrigger's `pin` option** sets `position: fixed` internally. Even when it detects a ScrollSmoother and tries to compensate, it's unreliable.

---

## Act II — JourneyStage Scroll Fix (The Big One)

### The Problem

After scrolling past Prabhu Bank (the first milestone stop), the screen went completely blank (deep umber). Content would reappear intermittently at later nodes. MemoryCard pop-ups appeared inconsistently.

### Root Cause (final diagnosis)

The cockpit div (100vh viewport containing parallax background, HUD, vehicle frames, and memory cards) was supposed to stay locked to the viewport while the user scrolled through the 2800vh stage. It was using ScrollTrigger's `pin` option, which sets `position: fixed` — broken inside ScrollSmoother's transform container.

### What Did NOT Work

1. **`smootherReady` prop + deferred ScrollTrigger creation (Attempt 1)**
   - Theory: The pin was created before ScrollSmoother existed, so it used the wrong pin strategy. If we delay creation until after the smoother, it would use the correct strategy.
   - Reality: Even when created after the smoother, ScrollTrigger's pin mechanism inside ScrollSmoother is unreliable. The counter-transform math is fragile and breaks under the 2800vh scroll range with milestone pin durations.
   - Files changed: `App.tsx` (added `smootherReady` state), `ActII_Meridian.tsx` (threaded prop), `JourneyStage.tsx` (gated `useGSAP` on `smootherReady`).
   - **Kept:** The `smootherReady` gating is still in place as a safety measure.

2. **CSS `position: sticky` (Attempt 2)**
   - Theory: Pure CSS sticky would avoid ScrollTrigger's pin entirely.
   - Reality: ScrollSmoother's `#smooth-wrapper` is `position: fixed` with no overflow scroll — there's no scroll context for sticky to bind to.
   - **Reverted immediately.**

### What WORKED — Manual Counter-Scroll Transform (Attempt 3)

**Approach:** Wrap the cockpit in a `.cockpitWrap` div (`position: absolute; top: 0`). In the ScrollTrigger `onUpdate` callback, calculate how far the stage has scrolled and apply an equal `translateY` to push the wrapper back down:

```js
if (cockpitWrapRef.current) {
  const offset = progress * (self.end - self.start);
  gsap.set(cockpitWrapRef.current, { y: offset });
}
```

**Why two divs (wrap + cockpit):**
- `.cockpitWrap` — receives the counter-scroll `translateY` (GSAP `y`)
- `.cockpit` (inner) — receives VehicleSwitcher's camera-shake transforms (`x`, `y`, `rotation`)
- Separate elements prevent the two transform sources from conflicting.

**Files changed:**
- `JourneyStage.module.css` — Replaced `.cockpit` styles with `.cockpitWrap` (absolute + will-change:transform) and `.cockpit` (relative, overflow:hidden)
- `JourneyStage.tsx` — Added `cockpitWrapRef`, removed `pin`/`pinSpacing` from ScrollTrigger config, added `gsap.set(cockpitWrapRef, { y: offset })` in `onUpdate`, wrapped cockpit in `cockpitWrap` div in JSX

---

## MemoryCard Pop-Up Fixes

### Problem

Memory cards (milestone overlays) appeared inconsistently — sometimes showing, sometimes not.

### Root Causes & Fixes

1. **`display: none` ↔ React state race condition**
   - Card wrappers used `display: activeStop === idx ? 'flex' : 'none'` driven by React state.
   - `setActiveStop(stopIdx)` and `animateIn()` were called in the same synchronous block, but React hadn't re-rendered yet — the card was still `display: none` when GSAP tried to animate it.
   - **Fix:** Replaced `display` toggle with `visibility: hidden; position: absolute` (always in DOM). Card visibility is toggled via direct DOM manipulation in `showMilestoneCard()` / `hideMilestoneCard()` helper functions. `animateIn()` is called via `requestAnimationFrame` to ensure DOM changes are committed first. The `activeStop` state was removed entirely.

2. **CSS `transition` fighting GSAP on overlay**
   - `.memoryOverlay` had `transition: opacity 0.5s` AND GSAP `gsap.to(opacity)` — two systems competing.
   - **Fix:** Removed the CSS `transition` from `.memoryOverlay`. GSAP is the sole opacity controller.

3. **MemoryCard tween buildup**
   - `animateIn()` and `animateOut()` didn't kill previous tweens. Rapid scroll in/out left overlapping tweens.
   - **Fix:** Both methods now call `gsap.killTweensOf()` on all sub-elements before starting.

4. **Overlay opacity race**
   - Multiple overlay opacity tweens could stack during fast scrolling.
   - **Fix:** `showMilestoneCard()` and `hideMilestoneCard()` call `gsap.killTweensOf(memoryOverlayRef, 'opacity')` before starting new tweens.

---

## HUD Label Fix

### Problem

Rapid scrolling through nodes caused label text to get stuck at `opacity: 0` — contributing to the "blank screen" feel.

### Root Cause

Each node change created a new GSAP timeline for the label swap animation. During fast scrolling, multiple timelines competed on the same elements, and a fade-out tween could fire after the fade-in, leaving labels invisible.

### Fix

Added `labelTlRef` to store the active label timeline. Before starting a new animation, the previous timeline is `.kill()`-ed.

---

## File Change Summary

| File | Key Changes |
|---|---|
| `App.tsx` | Added `smootherReady` state, set after `ScrollSmoother.create()`, passed to `ActIIMeridian` |
| `ActII_Meridian.tsx` | Accepts + forwards `smootherReady` prop to `JourneyStage` |
| `JourneyStage.tsx` | `smootherReady` prop gates `useGSAP`; manual counter-scroll via `cockpitWrapRef`; removed ScrollTrigger `pin`; `showMilestoneCard`/`hideMilestoneCard` helpers with DOM-direct visibility; `labelTlRef` for label animation kill; `ScrollTrigger.refresh()` after setup |
| `JourneyStage.module.css` | `.cockpitWrap` (position:absolute, will-change:transform) + `.cockpit` (relative, overflow:hidden); removed CSS transition from `.memoryOverlay` |
| `MemoryCard.tsx` | `gsap.killTweensOf()` in both `animateIn()` and `animateOut()` |

---

## Key Lessons

1. **Never use `position: fixed` or ScrollTrigger `pin` inside ScrollSmoother.** The transform on `#smooth-content` breaks fixed positioning by CSS spec. Manual counter-scroll via `gsap.set(el, { y: offset })` in `onUpdate` is the reliable approach.
2. **Never mix CSS `transition` and GSAP tweens on the same property.** They fight. Pick one controller.
3. **Always `killTweensOf()` before starting competing animations** on the same element, especially during scroll-driven interactions where callbacks fire rapidly.
4. **React state updates are async — don't rely on them for immediate DOM changes** when GSAP needs to animate in the same tick. Use direct DOM manipulation or `requestAnimationFrame`.
5. **Separate transform concerns onto separate DOM elements.** Counter-scroll `y` and camera-shake `x/y/rotation` on the same element would conflict.
