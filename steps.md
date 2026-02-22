# Act II Visual Overhaul — Step-by-Step Plan

> Reference document for continuing work across chat windows.
> Last updated: Feb 16, 2026.

---

## Phase 1 — Terrain Continuity (kill the snap) ✅ COMPLETE

**Step 1: Add `elevation` field to milestones** ✅
- Added `elevation: number` (0→1) to the `Milestone` interface in `STORY_DATA.ts`.
- Every milestone object now has an elevation value tuned to real-world geography.

**Step 2: Create `TerrainLine` component** ✅
- New component: `src/components/TerrainLine.tsx` + `TerrainLine.module.css`.
- Procedurally generates 3 SVG depth layers (far/mid/near) using Catmull-Rom → cubic bezier curves.
- Peak amplitude scales smoothly with the `elevation` prop.
- Snow caps auto-appear on far layer when elevation > 0.4.

**Step 3: Wire TerrainLine into ParallaxWorld** ✅
- `ParallaxWorld` now accepts `elevation: number` prop.
- `<TerrainLine>` renders as first child inside `.world`, behind all biome detail layers.
- `JourneyStage` passes `activeElevation` (later `smoothElevation`) to `ParallaxWorld`.

**Step 4: Add transition zones / smooth elevation interpolation** ✅
- Added `interpolateElevation(progress)` helper in `JourneyStage.tsx`.
- Uses smoothstep easing: terrain holds for first 30% of a node's scroll span, then morphs over the remaining 70%.
- `smoothElevation` state updates every scroll tick, passed to `ParallaxWorld → TerrainLine`.

---

## Phase 2 — Third-Person Vehicles (side-scrolling silhouettes)

**Step 5: Create `VehicleSilhouette` component**
- SVG silhouettes viewed from the side: a small airplane, a car, a walking figure.
- Positioned in the scene (not as a cockpit overlay) at a fixed vertical position relative to the terrain line.

**Step 6: Airplane — flies across the sky**
- When `transport === 'plane'`, render the plane silhouette in the upper third of the viewport.
- Animate with slow horizontal drift (GSAP `x` tween, `power4.out`) from one side to the other.
- Subtle bobbing (`y` oscillation, ±3px, 4s period) to simulate flight.
- Faint dashed trail line behind the plane using SVG `<line>` with `strokeDashoffset` animation.

**Step 7: Car — drives along the terrain line**
- When `transport === 'car'`, position car silhouette on the near-ground terrain line.
- Car stays horizontally centred; `y` tracks terrain elevation so it drives up/down hills.
- Wheels get subtle rotation animation (repeating GSAP `rotation`).
- Tiny dust particles trail behind using 2–3 `<circle>` elements that fade out.

**Step 8: Walking — figure walks along the ground**
- When `transport === 'walking'`, show walking figure silhouette on the terrain.
- Gentle bobbing animation (alternating `y` oscillation at walking cadence, ~2Hz).
- Keep existing camera-shake on cockpit but reduce intensity by 50%.

**Step 9: Vehicle transition animation**
- When transport changes, old vehicle fades out (0.6s), new one fades in.
- `plane → car`: plane descends to ground level before fading; car fades in at ground level.
- Remove current full-screen transport flash; replace with subtle ember-coloured horizontal line sweep.

---

## Phase 3 — MemoryCard Redesign (grounded cards)

**Step 10: Redesign MemoryCard CSS — bordered card with spatial presence**
- Add 1px `var(--color-ember)` border to `.card`.
- Add `background: rgba(26, 24, 22, 0.92)` for solidity.
- Add `border-radius: 4px`, faint `box-shadow: 0 8px 32px rgba(0,0,0,0.4)`.

**Step 11: "Rise from ground" entrance animation**
- Change `animateIn()`: card starts at `y: '100%'` (off bottom), slides up to centre with `power4.out` over 0.9s.
- Add slight scale: `scale: 0.95 → 1` during rise.
- Overlay background fades in 0.15s ahead of the card.

**Step 12: "Sink back" exit animation**
- `animateOut()`: card slides down (`y: 0 → 80px`) while fading to 0.
- Slightly faster than entrance (0.5s).

**Step 13: Add photo placeholder frame**
- Inside `.photo`, add a dashed ember border frame always visible.
- Add subtle landscape/mountain SVG icon in ember for missing photos.

---

## Phase 4 — Environmental Colour & Detail

**Step 14: Add biome-specific accent colours to `tokens.css`**
- `--color-foliage: #4A6741` — muted forest green.
- `--color-sky-tint: #5B7B8A` — dusty blue.
- `--color-snow: #D4D0C8` — warm off-white.
- `--color-earth: #8B7355` — warm brown.

**Step 15: Add green-tinted tree canopies to Nepal and Colorado biomes**
- Nepal mid/near: rhododendron-shaped tree clusters, `fill="var(--color-foliage)"` at `opacity="0.25"`.
- Colorado mid/near: tint pine trees with `var(--color-foliage)` instead of `var(--color-silk)`.

**Step 16: Add sky gradient layer**
- `SkyGradient` component: full-viewport `<div>` behind all biome layers.
- CSS linear-gradient from `var(--color-sky-tint)` at top (opacity 0.12) to transparent at 40%.
- Plane mode: increase opacity to 0.20, extend to 60% height.

**Step 17: Add cloud wisps to all biomes**
- 3–5 small elliptical SVG clouds floating across top 30% in all biomes.
- `var(--color-sky-tint)` at `opacity: 0.10–0.18`.
- Slow horizontal drift (GSAP `x` tween, 20s, repeating). Plane mode speeds them up.

**Step 18: Add ember-glow horizon line**
- In every biome's far layer, horizontal band at terrain/sky boundary.
- `var(--color-ember)` at `opacity: 0.08–0.12`.

---

## Phase 5 — Polish & Detail

**Step 19: Topeka biome — add grass/field texture**
- Replace blueprint-only near layer with rolling grassland.
- Short vertical ticks in `var(--color-foliage)` at low opacity simulating grass.
- Keep Stoffer/Carnegie building outlines in mid layer above grassy horizon.

**Step 20: Add "ground line" visual anchor across all biomes**
- Persistent 1px horizontal line at ~85% viewport height in `var(--color-silk)` at opacity 0.15.
- Visual "floor" for car/walking figure to sit on.

**Step 21: Add parallax depth-of-field blur**
- Far layers: constant `filter: blur(1.5px)` (extend existing walking blur to all transports at lower intensity).
- Near layers stay crisp.

**Step 22: Add subtle particle system for environmental atmosphere**
- Nepal: faint snow/dust particles drifting down (4–6 `<circle>` elements).
- Topeka: occasional leaf particles drifting horizontally.
- Colorado: slow snowflakes.
- Global: nothing (clean sky).
- Particles animated on repeating GSAP timeline, culled when biome inactive.

**Step 23: Smooth HUD label transitions**
- Cross-fade old label out (0.3s) while new one morphs in.
- Thin ember underline slides to match new label width.

---

## Phase 6 — Integration & QA

**Step 24: Wire `TerrainLine` elevation to scroll progress** ✅ (done in Step 4)
- Computed interpolated elevation via `interpolateElevation()`.
- `smoothElevation` state drives TerrainLine.

**Step 25: Wire `VehicleSilhouette` position to terrain**
- Vehicle's `y` position = terrain line `y` at its fixed `x` position, updated every frame.
- Ensure vehicle and terrain share SVG coordinate space.

**Step 26: Performance audit**
- All new SVG elements use `will-change: transform` where animated.
- Confirm 60fps at 4x CPU slowdown in Chrome DevTools.
- Reduce particles to 2–3 per biome if janky.

**Step 27: Kill all remaining CSS `transition` on GSAP-controlled elements**
- Audit every `.module.css` for `transition` on properties GSAP also controls.
- Remove them per CONTEXT.md lesson.
