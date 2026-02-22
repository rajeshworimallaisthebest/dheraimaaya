/**
 * JourneyStage — Act II Vehicle-POV Cockpit
 * ==========================================
 * A scroll-driven "first-person travel" experience.
 *
 * Chunk 1 delivers:
 *   ✓ GSAP ScrollTrigger wired to all journey nodes
 *   ✓ Active-node tracking (index, progress, transport, biome)
 *   ✓ HUD labels (node name + description) with fade transitions
 *   ✓ Bottom progress bar
 *   ✓ Slot architecture for vehicle foreground, parallax BG, and MemoryCard overlay
 *
 * Chunk 2 delivers:
 *   ✓ VehicleSwitcher — dynamic foreground frame cross-fade
 *   ✓ PlaneFrame / CarFrame SVG overlays
 *   ✓ Walking mode camera-shake + radial vignette
 *
 * Chunk 3 delivers:
 *   ✓ ParallaxWorld — 4-biome, 3-depth-layer parallax background
 *   ✓ BiomeScenery SVGs (Nepal, Topeka, Colorado, Global)
 *   ✓ Horizontal scroll-driven layer shifting at differential speeds
 *   ✓ GSAP cross-fade on biome transitions
 *
 * Chunk 4 delivers:
 *   ✓ MemoryCard — grayscale photo + text overlay at milestone stops
 *   ✓ Scroll-pinning at milestone nodes via per-stop ScrollTriggers
 *   ✓ Animated in/out via imperative handle (power4.out / expo.out)
 */

import { useRef, useState, useCallback } from 'react';
import {
  gsap,
  ScrollTrigger,
  useGSAP,
} from '../lib/gsapSetup';
import {
  milestones,
  segments,
  scrollMap,
  type Milestone,
  type Transport,
  type Biome,
} from '../data/STORY_DATA';

import VehicleSwitcher from './VehicleSwitcher';
import ParallaxWorld from './ParallaxWorld';
import styles from './JourneyStage.module.css';

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

/** Total scroll height accounting for milestone pin durations (Fix E). */
const STAGE_HEIGHT = `${scrollMap.totalVh}vh`;

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Map scroll progress (0→1) to a milestone node index (Fix D). */
function progressToNodeIndex(progress: number): number {
  const scrollVh = progress * scrollMap.totalVh;
  const { nodeStartVh } = scrollMap;

  for (let i = nodeStartVh.length - 1; i >= 0; i--) {
    if (scrollVh >= nodeStartVh[i]) return i;
  }
  return 0;
}

/**
 * Interpolate terrain elevation between the current and next node
 * based on fractional scroll progress within the current node's span.
 *
 * This produces a smooth 0→1 elevation value that changes continuously
 * as the user scrolls, eliminating the snap that occurred when elevation
 * was derived directly from the discrete activeIndex.
 *
 * The interpolation starts early (last 20% of the previous node's span)
 * and finishes early (first 20% of the next node's span), creating a
 * "foreshadowing" effect where the terrain begins changing before you
 * arrive at the next location.
 */
function interpolateElevation(progress: number): number {
  const scrollVh = progress * scrollMap.totalVh;
  const { nodeStartVh } = scrollMap;
  const nodeCount = milestones.length;

  // Find current node index
  let idx = 0;
  for (let i = nodeStartVh.length - 1; i >= 0; i--) {
    if (scrollVh >= nodeStartVh[i]) { idx = i; break; }
  }

  const currElev = milestones[idx].elevation;
  const nextIdx = Math.min(idx + 1, nodeCount - 1);
  const nextElev = milestones[nextIdx].elevation;

  // If same elevation or last node, no interpolation needed
  if (idx === nextIdx || currElev === nextElev) return currElev;

  // Compute fractional progress within this node's scroll span
  const nodeStart = nodeStartVh[idx];
  const nodeEnd = nextIdx < nodeStartVh.length ? nodeStartVh[nextIdx] : scrollMap.totalVh;
  const span = nodeEnd - nodeStart;
  if (span <= 0) return currElev;

  const fraction = (scrollVh - nodeStart) / span;

  // Continuous interpolation across the full node span (0→1).
  // Uses a quintic smootherstep for ultra-organic feel —
  // no dead zones, no snapping, one single stroke.
  const t = fraction * fraction * fraction * (fraction * (fraction * 6 - 15) + 10);

  return currElev + (nextElev - currElev) * t;
}

/**
 * Returns the node's left-edge position as a fraction of the viewport width.
 *
 *   1.0  → right edge of the viewport  (just entering from the right)
 *   0.0  → left edge of the viewport   (node fills 100 % of the screen)
 *  -0.2  → 20 % off-screen to the left (80 % still visible)
 *
 * Memory cards are shown while this value is in the range [−0.2, 0].
 */
function nodeScreenLeftFraction(nodeIdx: number, progress: number): number {
  const scrollVh = progress * scrollMap.totalVh;
  const { nodeStartVh } = scrollMap;

  // Find the active node index
  let idx = 0;
  for (let i = nodeStartVh.length - 1; i >= 0; i--) {
    if (scrollVh >= nodeStartVh[i]) { idx = i; break; }
  }

  const nodeStart = nodeStartVh[idx];
  const nodeEnd =
    idx + 1 < nodeStartVh.length ? nodeStartVh[idx + 1] : scrollMap.totalVh;
  const span = nodeEnd - nodeStart;
  const fraction = span > 0 ? Math.min(1, (scrollVh - nodeStart) / span) : 0;

  // Each node is 100 vw wide; the track shifts left by 1 vw per node.
  // nodeLeft = 1 (entering right edge) when nodeIdx === idx && fraction === 0
  // nodeLeft = 0 (fully on screen)     when nodeIdx === idx && fraction === 1
  // nodeLeft < 0 (exiting left)        when nodeIdx < idx or prev node after switch
  return 1 + nodeIdx - idx - fraction;
}

/** Find which segment a node index belongs to (Fix F). */
function nodeToSegmentIndex(nodeIndex: number): number {
  for (let i = 0; i < segments.length; i++) {
    if (nodeIndex >= segments[i].startIndex && nodeIndex < segments[i].endIndex) {
      return i;
    }
  }
  return 0;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

interface JourneyStageProps {
  /** Must be true before we create any pinned ScrollTriggers. */
  smootherReady: boolean;
}

export default function JourneyStage({ smootherReady }: JourneyStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cockpitWrapRef = useRef<HTMLDivElement>(null);
  const cockpitRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const transportFlashRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const journeyTitleRef = useRef<HTMLDivElement>(null);
  const journeyTitleShownRef = useRef(false);

  // Currently active node (index into milestones[])
  const [activeIndex, setActiveIndex] = useState(0);

  // Global scroll progress 0→1 (used by ParallaxWorld)
  const [scrollProgress, setScrollProgress] = useState(0);
  // Fine-grained progress ref — updated every tick for GSAP,
  // but state is only synced when delta exceeds threshold to
  // avoid re-rendering the 1300-line JSX tree every frame.
  const scrollProgressRef = useRef(0);
  const lastSyncedProgressRef = useRef(0);

  // Smoothly interpolated elevation (updated every scroll tick)
  const [smoothElevation, setSmoothElevation] = useState(
    () => milestones[0].elevation,
  );
  const lastSyncedElevationRef = useRef(milestones[0].elevation);

  // Display-lagged biome index — only updates after the new label is
  // centered on screen (50 % into its scroll span). This prevents the
  // background (e.g. Colorado pines) from appearing while the previous
  // label (e.g. "Washburn South") is still visible.
  const [displayIndex, setDisplayIndex] = useState(0);

  // Track current segment to detect transport transitions (Fix F)
  const currentSegRef = useRef(0);

  // Derived from the active node
  const activeNode: Milestone = milestones[activeIndex];
  const activeTransport: Transport = activeNode.transport;
  // Biome + elevation come from the lagged displayIndex so the
  // background only changes once the matching label is centered.
  const activeBiome: Biome = milestones[displayIndex].biome;

  /** Sweep a thin ember horizontal line across the viewport on transport change (Step 9). */
  const flashTransportTransition = useCallback(() => {
    if (!transportFlashRef.current) return;

    gsap.timeline()
      .set(transportFlashRef.current, {
        opacity: 1,
        scaleX: 0,
        transformOrigin: 'left center',
      })
      .to(transportFlashRef.current, {
        scaleX: 1,
        duration: 0.4,
        ease: 'power4.out',
      })
      .to(transportFlashRef.current, {
        opacity: 0,
        duration: 0.35,
        ease: 'expo.out',
      });
  }, []);

  // ── "Our Journey" title fade-in / fade-out ──
  // Plays once when the smoother is ready (Act II just appeared).
  useGSAP(
    () => {
      if (!smootherReady || journeyTitleShownRef.current) return;
      if (!journeyTitleRef.current) return;

      journeyTitleShownRef.current = true;

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      // Fade in
      tl.fromTo(
        journeyTitleRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 1.6, delay: 0.3 },
      );

      // Hold for a beat, then fade out
      tl.to(
        journeyTitleRef.current,
        { opacity: 0, y: -8, duration: 1.2, ease: 'expo.out', delay: 1.8 },
      );

      // Remove from DOM flow after animation
      tl.set(journeyTitleRef.current, { display: 'none' });
    },
    { scope: stageRef, dependencies: [smootherReady] },
  );

  // ── ScrollTrigger wiring ──
  // CRITICAL: must wait for ScrollSmoother to exist before creating
  // pinned ScrollTriggers. Pin mode is decided at creation time —
  // if created before the smoother, position:fixed is used, which
  // is broken inside the smoother's transform container (blank screen).
  useGSAP(
    () => {
      if (!smootherReady) return;
      if (!stageRef.current || !trackRef.current) return;

      const track = trackRef.current;

      // ── Right-to-left conveyor track positioning ──
      // Each node occupies 100vw on the track strip, meaning only
      // one location is on-screen at a time. Nodes enter from the
      // right edge and exit fully to the left before the next one
      // appears.
      //
      // At progress=0 the entire track is off-screen to the right
      // (user sees just the background + silhouettes — no labels).
      //
      // trackX = viewportWidth − (idx + fraction) × nodeWidth
      //
      // Each node's scroll range slides the track left by exactly
      // one nodeWidth (100vw). The formula is continuous across
      // node boundaries.

      /** Width of one track node in pixels (each is 100vw). */
      const nodeWidthPx = () => window.innerWidth;

      function computeTrackX(progress: number): number {
        const scrollVh = progress * scrollMap.totalVh;
        const { nodeStartVh } = scrollMap;
        const nw = nodeWidthPx();
        const vw = window.innerWidth;

        // Find active node index
        let idx = 0;
        for (let i = nodeStartVh.length - 1; i >= 0; i--) {
          if (scrollVh >= nodeStartVh[i]) { idx = i; break; }
        }

        // Fractional progress within this node's scroll range
        const nodeStart = nodeStartVh[idx];
        const nodeEnd = idx + 1 < nodeStartVh.length
          ? nodeStartVh[idx + 1]
          : scrollMap.totalVh;
        const span = nodeEnd - nodeStart;
        const fraction = span > 0 ? Math.min(1, (scrollVh - nodeStart) / span) : 0;

        // Conveyor position: viewport-width offset minus cumulative travel
        return vw - (idx + fraction) * nw;
      }

      // ScrollTrigger drives everything: track position, cockpit
      // viewport-lock, node tracking, progress, and elevation.
      ScrollTrigger.create({
        trigger: stageRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const progress = self.progress;

          // ── Position the horizontal track (node-centered) ──
          gsap.set(track, { x: computeTrackX(progress) });

          // ── Keep cockpit viewport-locked ──
          if (cockpitWrapRef.current) {
            const offset = progress * (self.end - self.start);
            gsap.set(cockpitWrapRef.current, { y: offset });
          }

          // Store fine-grained progress for GSAP-driven updates
          scrollProgressRef.current = progress;

          // Only sync to React state when delta is significant.
          // This prevents 60fps re-renders of the huge SVG tree.
          const PROGRESS_THRESHOLD = 0.004;
          if (Math.abs(progress - lastSyncedProgressRef.current) > PROGRESS_THRESHOLD) {
            lastSyncedProgressRef.current = progress;
            setScrollProgress(progress);
          }

          if (progressRef.current) {
            progressRef.current.style.width = `${(progress * 100).toFixed(2)}%`;
          }

          // Map progress → node via scroll map (Fix D/E)
          const nodeIdx = progressToNodeIndex(progress);

          // ── Display-lagged biome/elevation ──
          // Lag the biome by half a node scroll span so it only
          // transitions once the NEW label is centered on screen.
          const lagVh = 50; // half a default 100vh node
          const laggedScrollVh = Math.max(0, progress * scrollMap.totalVh - lagVh);
          const laggedProgress = laggedScrollVh / scrollMap.totalVh;
          const laggedIdx = progressToNodeIndex(laggedProgress);
          setDisplayIndex(laggedIdx);

          // Elevation uses the lagged index for consistency
          const newElev = interpolateElevation(laggedProgress);
          const ELEV_THRESHOLD = 0.02;
          if (Math.abs(newElev - lastSyncedElevationRef.current) > ELEV_THRESHOLD) {
            lastSyncedElevationRef.current = newElev;
            setSmoothElevation(newElev);
          }

          setActiveIndex((prev) => {
            if (prev !== nodeIdx) {
              // Detect segment (transport) transitions (Fix F)
              const segIdx = nodeToSegmentIndex(nodeIdx);
              if (segIdx !== currentSegRef.current) {
                currentSegRef.current = segIdx;
                flashTransportTransition();
              }
            }
            return nodeIdx;
          });
        },
      });

      // Now that all ScrollTriggers are created with the smoother
      // active, force a global recalculation so positions are correct.
      ScrollTrigger.refresh();
    },
    { scope: stageRef, dependencies: [smootherReady] },
  );

  return (
    <div
      ref={stageRef}
      className={styles.stage}
      style={{ height: STAGE_HEIGHT }}
      data-active-transport={activeTransport}
      data-active-biome={activeBiome}
    >
      {/* ── "Our Journey" title overlay ── */}
      <div ref={journeyTitleRef} className={styles.journeyTitle} aria-hidden="true">
        <span className={styles.journeyTitleText}>Our Journey</span>
      </div>

      {/* ── Cockpit (counter-scrolled wrapper + inner for shake) ── */}
      <div ref={cockpitWrapRef} className={styles.cockpitWrap}>
      <div ref={cockpitRef} className={styles.cockpit}>

        {/* Background — parallax scenery */}
        <ParallaxWorld
          biome={activeBiome}
          progress={scrollProgress}
          transport={activeTransport}
          elevation={smoothElevation}
        />

        {/* Horizontal journey strip — scrolls left as user progresses */}
        <div
          ref={trackRef}
          className={styles.horizontalTrack}
          style={{ transform: 'translateX(100vw)' }}
        >
          <div className={styles.trackLine} />
          {milestones.map((m, nodeIdx) => {
            // Compute this node's left-edge position as a fraction of vw.
            // = 1  → entering from right edge (not yet visible)
            // = 0  → left edge at viewport left (100 % filled the screen)
            // = −0.2 → 20 % off-screen to the left (80 % still visible)
            const nodeLeft = nodeScreenLeftFraction(nodeIdx, scrollProgress);
            // Memory card drops down once the node fills the screen and
            // retracts before 80 % of it has slid off to the left.
            const isMemoryVisible = nodeLeft <= 0.4 && nodeLeft >= -0.2;
            return (
            <div
              key={m.id}
              className={`${styles.trackNode}${m.isMilestoneStop ? ` ${styles.trackNodeMilestone}` : ''}`}
            >
              {/* Location-specific landmark SVGs */}

              {/* ── ISTL Nepal — institutional building with Nepali roof ── */}
              {m.id === 'istl-nepal' && (
                <svg className={styles.landmark} viewBox="0 0 280 260" aria-hidden style={{ width: '14vw', maxWidth: '200px' }}>
                  {/* Main building block */}
                  <rect x="60" y="100" width="160" height="140" fill="var(--color-silk)" opacity="0.15" />
                  {/* Tiered pagoda-style roof */}
                  <polygon points="40,100 140,40 240,100" fill="var(--color-silk)" opacity="0.22" />
                  <polygon points="55,100 140,55 225,100" fill="var(--color-silk)" opacity="0.12" />
                  {/* Roof finial */}
                  <line x1="140" y1="40" x2="140" y2="22" stroke="var(--color-ember)" strokeWidth="1.5" opacity="0.4" />
                  <circle cx="140" cy="18" r="4" fill="var(--color-ember)" opacity="0.3" />
                  {/* Windows — 2 rows of 3 */}
                  {[0, 1, 2].map((col) => [0, 1].map((row) => (
                    <rect key={`iw-${col}-${row}`} x={85 + col * 45} y={120 + row * 45} width="20" height="28" rx="2" fill="none" stroke="var(--color-silk)" strokeWidth="0.8" opacity="0.25" />
                  )))}
                  {/* Entrance door */}
                  <rect x="120" y="195" width="40" height="45" rx="2" fill="var(--color-silk)" opacity="0.12" />
                  <path d="M120,195 L140,180 L160,195" fill="none" stroke="var(--color-ember)" strokeWidth="0.8" opacity="0.3" />
                  {/* Base / ground */}
                  <rect x="45" y="238" width="190" height="4" rx="2" fill="var(--color-silk)" opacity="0.12" />
                </svg>
              )}

              {/* ── Prabhu Bank — columned bank facade ── */}
              {m.id === 'prabhu-bank' && (
                <svg className={styles.landmark} viewBox="0 0 300 240" aria-hidden style={{ width: '15vw', maxWidth: '220px' }}>
                  {/* Pediment / triangular top */}
                  <polygon points="30,80 150,20 270,80" fill="var(--color-silk)" opacity="0.18" />
                  {/* Frieze band */}
                  <rect x="35" y="78" width="230" height="12" fill="var(--color-silk)" opacity="0.15" />
                  {/* Main building */}
                  <rect x="40" y="90" width="220" height="130" fill="var(--color-silk)" opacity="0.12" />
                  {/* Columns — 5 evenly spaced */}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <g key={`col-${i}`}>
                      <rect x={60 + i * 42} y="90" width="8" height="130" fill="var(--color-silk)" opacity="0.25" />
                      <ellipse cx={64 + i * 42} cy="88" rx="6" ry="3" fill="var(--color-silk)" opacity="0.2" />
                    </g>
                  ))}
                  {/* Central doorway */}
                  <rect x="125" y="155" width="50" height="65" rx="2" fill="var(--color-umber, #1A1816)" opacity="0.4" />
                  <path d="M125,155 Q150,138 175,155" fill="none" stroke="var(--color-ember)" strokeWidth="1" opacity="0.35" />
                  {/* Steps */}
                  <rect x="50" y="220" width="200" height="5" rx="1" fill="var(--color-silk)" opacity="0.15" />
                  <rect x="60" y="225" width="180" height="4" rx="1" fill="var(--color-silk)" opacity="0.10" />
                </svg>
              )}

              {/* ── Doha — mosque silhouette with minaret ── */}
              {m.id === 'doha-transit' && (
                <svg className={styles.landmark} viewBox="0 0 300 280" aria-hidden style={{ width: '14vw', maxWidth: '200px' }}>
                  {/* Central dome */}
                  <ellipse cx="150" cy="130" rx="70" ry="50" fill="var(--color-silk)" opacity="0.15" />
                  {/* Dome crescent */}
                  <path d="M148,82 Q155,72 162,82" fill="none" stroke="var(--color-ember)" strokeWidth="1" opacity="0.4" />
                  <line x1="155" y1="72" x2="155" y2="62" stroke="var(--color-ember)" strokeWidth="0.8" opacity="0.35" />
                  {/* Main body */}
                  <rect x="80" y="130" width="140" height="120" fill="var(--color-silk)" opacity="0.12" />
                  {/* Arched windows */}
                  {[0, 1, 2].map((i) => (
                    <path key={`dw-${i}`} d={`M${105 + i * 40},210 L${105 + i * 40},170 Q${120 + i * 40},155 ${135 + i * 40},170 L${135 + i * 40},210`} fill="none" stroke="var(--color-silk)" strokeWidth="0.8" opacity="0.22" />
                  ))}
                  {/* Left minaret */}
                  <rect x="48" y="80" width="16" height="170" fill="var(--color-silk)" opacity="0.18" />
                  <polygon points="48,80 56,55 64,80" fill="var(--color-silk)" opacity="0.22" />
                  <circle cx="56" cy="52" r="3" fill="var(--color-ember)" opacity="0.35" />
                  {/* Right minaret */}
                  <rect x="236" y="80" width="16" height="170" fill="var(--color-silk)" opacity="0.18" />
                  <polygon points="236,80 244,55 252,80" fill="var(--color-silk)" opacity="0.22" />
                  <circle cx="244" cy="52" r="3" fill="var(--color-ember)" opacity="0.35" />
                  {/* Base */}
                  <rect x="40" y="248" width="220" height="4" rx="2" fill="var(--color-silk)" opacity="0.12" />
                </svg>
              )}

              {/* ── Miami — palm trees ── */}
              {m.id === 'miami-transit' && (
                <svg className={styles.landmark} viewBox="0 0 280 300" aria-hidden style={{ width: '13vw', maxWidth: '190px' }}>
                  {/* Palm tree 1 — left */}
                  <path d="M90,290 Q85,200 95,120" fill="none" stroke="var(--color-silk)" strokeWidth="3" opacity="0.22" />
                  {/* Fronds */}
                  <path d="M95,120 Q60,80 20,90" fill="none" stroke="var(--color-silk)" strokeWidth="1.5" opacity="0.25" />
                  <path d="M95,120 Q70,70 40,50" fill="none" stroke="var(--color-silk)" strokeWidth="1.5" opacity="0.22" />
                  <path d="M95,120 Q110,60 130,40" fill="none" stroke="var(--color-silk)" strokeWidth="1.5" opacity="0.22" />
                  <path d="M95,120 Q120,80 160,85" fill="none" stroke="var(--color-silk)" strokeWidth="1.5" opacity="0.20" />
                  <path d="M95,120 Q75,100 30,125" fill="none" stroke="var(--color-silk)" strokeWidth="1.2" opacity="0.18" />
                  {/* Palm tree 2 — right, taller */}
                  <path d="M195,290 Q200,180 190,80" fill="none" stroke="var(--color-silk)" strokeWidth="3" opacity="0.20" />
                  <path d="M190,80 Q155,45 120,55" fill="none" stroke="var(--color-silk)" strokeWidth="1.5" opacity="0.22" />
                  <path d="M190,80 Q170,30 145,10" fill="none" stroke="var(--color-silk)" strokeWidth="1.5" opacity="0.20" />
                  <path d="M190,80 Q210,25 240,15" fill="none" stroke="var(--color-silk)" strokeWidth="1.5" opacity="0.20" />
                  <path d="M190,80 Q220,50 260,55" fill="none" stroke="var(--color-silk)" strokeWidth="1.5" opacity="0.18" />
                  <path d="M190,80 Q225,70 265,90" fill="none" stroke="var(--color-silk)" strokeWidth="1.2" opacity="0.16" />
                  {/* Coconuts */}
                  <circle cx="92" cy="122" r="4" fill="var(--color-ember)" opacity="0.25" />
                  <circle cx="100" cy="118" r="3.5" fill="var(--color-ember)" opacity="0.22" />
                  <circle cx="188" cy="82" r="4" fill="var(--color-ember)" opacity="0.25" />
                  <circle cx="196" cy="78" r="3.5" fill="var(--color-ember)" opacity="0.22" />
                </svg>
              )}

              {/* ── Stoffer Science Hall — lab flask & building ── */}
              {m.id === 'stoffer' && (
                <svg className={styles.landmark} viewBox="0 0 260 240" aria-hidden style={{ width: '13vw', maxWidth: '190px' }}>
                  {/* Building body */}
                  <rect x="40" y="80" width="180" height="140" fill="var(--color-silk)" opacity="0.12" />
                  {/* Flat modern roof with slight overhang */}
                  <rect x="30" y="74" width="200" height="8" fill="var(--color-silk)" opacity="0.18" />
                  {/* Windows — grid of labs */}
                  {[0, 1, 2, 3].map((col) => [0, 1].map((row) => (
                    <rect key={`sf-${col}-${row}`} x={55 + col * 42} y={100 + row * 50} width="28" height="35" rx="1" fill="none" stroke="var(--color-silk)" strokeWidth="0.7" opacity="0.22" />
                  )))}
                  {/* Ember-lit lab window */}
                  <rect x="97" y="100" width="28" height="35" rx="1" fill="var(--color-ember)" opacity="0.10" />
                  {/* Entrance */}
                  <rect x="110" y="180" width="40" height="40" rx="1" fill="var(--color-silk)" opacity="0.10" />
                  {/* Small flask icon above entrance */}
                  <path d="M125,65 L125,48 L122,48 L122,38 L138,38 L138,48 L135,48 L135,65 L142,74 L118,74 Z" fill="none" stroke="var(--color-ember)" strokeWidth="0.8" opacity="0.35" />
                  {/* Base */}
                  <rect x="35" y="220" width="190" height="4" rx="2" fill="var(--color-silk)" opacity="0.10" />
                </svg>
              )}

              {/* ── Carnegie Hall — clock tower facade ── */}
              {m.id === 'carnegie' && (
                <svg className={styles.landmark} viewBox="0 0 300 300" aria-hidden style={{ width: '15vw', maxWidth: '220px' }}>
                  {/* Main hall body */}
                  <rect x="50" y="120" width="200" height="160" fill="var(--color-silk)" opacity="0.14" />
                  {/* Pitched roof */}
                  <polygon points="40,120 150,60 260,120" fill="var(--color-silk)" opacity="0.18" />
                  {/* Central clock tower */}
                  <rect x="125" y="30" width="50" height="90" fill="var(--color-silk)" opacity="0.18" />
                  <polygon points="125,30 150,8 175,30" fill="var(--color-silk)" opacity="0.22" />
                  {/* Clock face */}
                  <circle cx="150" cy="60" r="14" fill="none" stroke="var(--color-silk)" strokeWidth="0.8" opacity="0.3" />
                  <line x1="150" y1="60" x2="150" y2="50" stroke="var(--color-ember)" strokeWidth="1" opacity="0.45" />
                  <line x1="150" y1="60" x2="158" y2="62" stroke="var(--color-ember)" strokeWidth="0.8" opacity="0.4" />
                  {/* Windows — row of 6 */}
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <rect key={`cw-${i}`} x={63 + i * 32} y="150" width="18" height="35" rx="1.5" fill="none" stroke="var(--color-silk)" strokeWidth="0.7" opacity="0.22" />
                  ))}
                  {/* Second row windows */}
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <rect key={`cw2-${i}`} x={63 + i * 32} y="200" width="18" height="30" rx="1.5" fill="none" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.18" />
                  ))}
                  {/* Grand entrance */}
                  <rect x="130" y="235" width="40" height="45" rx="2" fill="var(--color-silk)" opacity="0.10" />
                  <path d="M130,235 Q150,218 170,235" fill="none" stroke="var(--color-ember)" strokeWidth="0.8" opacity="0.3" />
                  {/* Base */}
                  <rect x="40" y="278" width="220" height="4" rx="2" fill="var(--color-silk)" opacity="0.12" />
                </svg>
              )}

              {/* ── Capitol dome ── */}
              {m.id === 'capitol-downtown' && (
                <svg className={styles.landmark} viewBox="0 0 320 320" aria-hidden style={{ width: '16vw', maxWidth: '240px' }}>
                  {/* Main body — wide government building */}
                  <rect x="30" y="180" width="260" height="120" fill="var(--color-silk)" opacity="0.14" />
                  {/* Central portico */}
                  <rect x="100" y="160" width="120" height="140" fill="var(--color-silk)" opacity="0.10" />
                  {/* Dome drum */}
                  <rect x="120" y="100" width="80" height="60" fill="var(--color-silk)" opacity="0.16" />
                  {/* Dome */}
                  <ellipse cx="160" cy="100" rx="55" ry="40" fill="var(--color-silk)" opacity="0.18" />
                  {/* Lantern on dome */}
                  <rect x="148" y="55" width="24" height="20" fill="var(--color-silk)" opacity="0.20" />
                  <ellipse cx="160" cy="55" rx="16" ry="10" fill="var(--color-silk)" opacity="0.15" />
                  {/* Spire */}
                  <line x1="160" y1="45" x2="160" y2="15" stroke="var(--color-ember)" strokeWidth="1.2" opacity="0.4" />
                  <circle cx="160" cy="12" r="3" fill="var(--color-ember)" opacity="0.35" />
                  {/* Portico columns */}
                  {[0, 1, 2, 3].map((i) => (
                    <rect key={`cp-${i}`} x={115 + i * 28} y="160" width="6" height="60" fill="var(--color-silk)" opacity="0.22" />
                  ))}
                  {/* Wing windows */}
                  {[0, 1, 2].map((i) => (
                    <g key={`ww-${i}`}>
                      <rect x={45 + i * 22} y="200" width="14" height="22" rx="1" fill="none" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.18" />
                      <rect x={240 + i * 22} y="200" width="14" height="22" rx="1" fill="none" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.18" />
                    </g>
                  ))}
                  {/* Steps */}
                  <rect x="80" y="298" width="160" height="5" rx="1" fill="var(--color-silk)" opacity="0.12" />
                  <rect x="90" y="303" width="140" height="4" rx="1" fill="var(--color-silk)" opacity="0.08" />
                </svg>
              )}

              {/* ── Papa Johns — pizza shop with pizza slice ── */}
              {m.id === 'papa-johns' && (
                <svg className={styles.landmark} viewBox="0 0 260 240" aria-hidden style={{ width: '13vw', maxWidth: '190px' }}>
                  {/* Shop building */}
                  <rect x="40" y="100" width="180" height="120" fill="var(--color-silk)" opacity="0.14" />
                  {/* Awning */}
                  <path d="M35,100 L40,80 L220,80 L225,100" fill="var(--color-ember)" opacity="0.15" />
                  <path d="M35,100 Q67,110 100,100 Q132,90 165,100 Q197,110 225,100" fill="var(--color-ember)" opacity="0.12" />
                  {/* Shop window — large */}
                  <rect x="55" y="115" width="65" height="60" rx="2" fill="none" stroke="var(--color-silk)" strokeWidth="0.8" opacity="0.22" />
                  {/* Warm glow in window */}
                  <rect x="57" y="117" width="61" height="56" rx="1" fill="var(--color-ember)" opacity="0.06" />
                  {/* Door */}
                  <rect x="145" y="130" width="45" height="90" rx="2" fill="var(--color-silk)" opacity="0.10" />
                  <circle cx="183" cy="178" r="2.5" fill="var(--color-ember)" opacity="0.35" />
                  {/* Pizza slice icon above shop */}
                  <path d="M115,65 L140,20 L165,65 Z" fill="none" stroke="var(--color-ember)" strokeWidth="1" opacity="0.35" />
                  <circle cx="130" cy="48" r="3" fill="var(--color-ember)" opacity="0.25" />
                  <circle cx="142" cy="55" r="2.5" fill="var(--color-ember)" opacity="0.22" />
                  <circle cx="152" cy="45" r="2" fill="var(--color-ember)" opacity="0.20" />
                  {/* Base */}
                  <rect x="35" y="220" width="190" height="4" rx="2" fill="var(--color-silk)" opacity="0.10" />
                </svg>
              )}

              {/* ── University Heights — residential buildings ── */}
              {m.id === 'university-heights' && (
                <svg className={styles.landmark} viewBox="0 0 300 240" aria-hidden style={{ width: '14vw', maxWidth: '200px' }}>
                  {/* House 1 — left */}
                  <rect x="30" y="120" width="80" height="100" fill="var(--color-silk)" opacity="0.14" />
                  <polygon points="25,120 70,70 115,120" fill="var(--color-silk)" opacity="0.18" />
                  <rect x="50" y="135" width="16" height="20" rx="1" fill="none" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.22" />
                  <rect x="76" y="135" width="16" height="20" rx="1" fill="none" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.22" />
                  <rect x="58" y="180" width="24" height="40" rx="1" fill="var(--color-silk)" opacity="0.10" />
                  {/* House 2 — center, taller */}
                  <rect x="120" y="90" width="70" height="130" fill="var(--color-silk)" opacity="0.12" />
                  <rect x="115" y="85" width="80" height="8" fill="var(--color-silk)" opacity="0.16" />
                  {[0, 1, 2].map((row) => [0, 1].map((col) => (
                    <rect key={`uh-${row}-${col}`} x={130 + col * 32} y={100 + row * 35} width="14" height="20" rx="1" fill="none" stroke="var(--color-silk)" strokeWidth="0.5" opacity="0.20" />
                  )))}
                  {/* Window with warm light */}
                  <rect x="130" y="100" width="14" height="20" rx="1" fill="var(--color-ember)" opacity="0.08" />
                  {/* House 3 — right */}
                  <rect x="200" y="110" width="72" height="110" fill="var(--color-silk)" opacity="0.13" />
                  <polygon points="195,110 236,65 277,110" fill="var(--color-silk)" opacity="0.17" />
                  <rect x="215" y="130" width="14" height="18" rx="1" fill="none" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.20" />
                  <rect x="245" y="130" width="14" height="18" rx="1" fill="none" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.20" />
                  {/* Tree between houses */}
                  <line x1="113" y1="220" x2="113" y2="170" stroke="var(--color-silk)" strokeWidth="2" opacity="0.15" />
                  <circle cx="113" cy="160" r="18" fill="var(--color-silk)" opacity="0.12" />
                  {/* Base */}
                  <rect x="20" y="220" width="260" height="4" rx="2" fill="var(--color-silk)" opacity="0.10" />
                </svg>
              )}

              {/* ── Morgan Hall — dormitory building ── */}
              {m.id === 'morgan-hall' && (
                <svg className={styles.landmark} viewBox="0 0 280 260" aria-hidden style={{ width: '14vw', maxWidth: '200px' }}>
                  {/* Main dorm block */}
                  <rect x="40" y="70" width="200" height="170" fill="var(--color-silk)" opacity="0.14" />
                  {/* Flat roof with slight edge */}
                  <rect x="35" y="65" width="210" height="8" fill="var(--color-silk)" opacity="0.18" />
                  {/* Windows — 4 floors of 5 */}
                  {[0, 1, 2, 3].map((row) => [0, 1, 2, 3, 4].map((col) => (
                    <rect key={`mh-${row}-${col}`} x={54 + col * 38} y={85 + row * 38} width="18" height="24" rx="1" fill="none" stroke="var(--color-silk)" strokeWidth="0.5" opacity="0.18" />
                  )))}
                  {/* A few warm-lit windows scattered */}
                  <rect x="92" y="85" width="18" height="24" rx="1" fill="var(--color-ember)" opacity="0.08" />
                  <rect x="168" y="123" width="18" height="24" rx="1" fill="var(--color-ember)" opacity="0.06" />
                  <rect x="54" y="161" width="18" height="24" rx="1" fill="var(--color-ember)" opacity="0.07" />
                  {/* Entrance canopy */}
                  <rect x="110" y="200" width="60" height="8" fill="var(--color-silk)" opacity="0.15" />
                  <rect x="120" y="208" width="40" height="32" fill="var(--color-silk)" opacity="0.10" />
                  {/* Base */}
                  <rect x="35" y="240" width="210" height="4" rx="2" fill="var(--color-silk)" opacity="0.10" />
                </svg>
              )}

              {/* ── Omaha Zoo — animal silhouettes ── */}
              {m.id === 'omaha-zoo' && (
                <svg className={styles.landmark} viewBox="0 0 340 260" aria-hidden style={{ width: '16vw', maxWidth: '240px' }}>
                  {/* Giraffe silhouette — left */}
                  <g opacity="0.22" fill="var(--color-silk)">
                    {/* Neck + head */}
                    <rect x="60" y="20" width="12" height="140" rx="4" />
                    <ellipse cx="66" cy="18" rx="14" ry="10" />
                    {/* Horns */}
                    <line x1="60" y1="10" x2="58" y2="2" stroke="var(--color-silk)" strokeWidth="1.5" />
                    <line x1="72" y1="10" x2="74" y2="2" stroke="var(--color-silk)" strokeWidth="1.5" />
                    {/* Body */}
                    <ellipse cx="80" cy="170" rx="35" ry="22" />
                    {/* Legs */}
                    <rect x="52" y="185" width="6" height="55" rx="2" />
                    <rect x="62" y="185" width="6" height="52" rx="2" />
                    <rect x="92" y="185" width="6" height="55" rx="2" />
                    <rect x="102" y="185" width="6" height="52" rx="2" />
                    {/* Spots */}
                    <circle cx="62" cy="60" r="4" opacity="0.15" fill="var(--color-ember)" />
                    <circle cx="68" cy="90" r="3.5" opacity="0.12" fill="var(--color-ember)" />
                    <circle cx="60" cy="120" r="3" opacity="0.12" fill="var(--color-ember)" />
                  </g>
                  {/* Elephant silhouette — right */}
                  <g opacity="0.20" fill="var(--color-silk)">
                    {/* Body */}
                    <ellipse cx="240" cy="160" rx="55" ry="40" />
                    {/* Head */}
                    <ellipse cx="195" cy="140" rx="28" ry="25" />
                    {/* Trunk */}
                    <path d="M172,152 Q160,175 155,200 Q153,210 158,215" fill="none" stroke="var(--color-silk)" strokeWidth="6" strokeLinecap="round" />
                    {/* Ear */}
                    <ellipse cx="200" cy="130" rx="18" ry="22" opacity="0.12" />
                    {/* Eye */}
                    <circle cx="188" cy="135" r="2.5" fill="var(--color-ember)" opacity="0.35" />
                    {/* Legs */}
                    <rect x="210" y="192" width="14" height="48" rx="5" />
                    <rect x="230" y="192" width="14" height="46" rx="5" />
                    <rect x="255" y="192" width="14" height="48" rx="5" />
                    <rect x="275" y="192" width="14" height="46" rx="5" />
                    {/* Tusk */}
                    <path d="M180,155 Q172,170 178,180" fill="none" stroke="var(--color-silk)" strokeWidth="2" opacity="0.25" />
                  </g>
                  {/* Ground */}
                  <rect x="30" y="240" width="280" height="4" rx="2" fill="var(--color-silk)" opacity="0.10" />
                </svg>
              )}

              {/* ── Downtown Omaha — bridge over Missouri ── */}
              {m.id === 'downtown-omaha' && (
                <svg className={styles.landmark} viewBox="0 0 320 220" aria-hidden style={{ width: '15vw', maxWidth: '220px' }}>
                  {/* Bridge deck */}
                  <rect x="10" y="140" width="300" height="8" fill="var(--color-silk)" opacity="0.18" />
                  {/* Bridge towers / pylons */}
                  <rect x="70" y="80" width="10" height="68" fill="var(--color-silk)" opacity="0.22" />
                  <rect x="240" y="80" width="10" height="68" fill="var(--color-silk)" opacity="0.22" />
                  {/* Cables */}
                  <path d="M75,80 Q160,120 245,80" fill="none" stroke="var(--color-silk)" strokeWidth="0.8" opacity="0.20" />
                  <path d="M75,85 Q160,125 245,85" fill="none" stroke="var(--color-silk)" strokeWidth="0.5" opacity="0.15" />
                  {/* Vertical cable lines */}
                  {[100, 130, 160, 190, 220].map((x, i) => (
                    <line key={`cab-${i}`} x1={x} y1={95 + Math.abs(i - 2) * 5} x2={x} y2="140" stroke="var(--color-silk)" strokeWidth="0.5" opacity="0.15" />
                  ))}
                  {/* Water reflections */}
                  <path d="M0,170 Q80,160 160,170 Q240,180 320,168" fill="none" stroke="var(--color-silk)" strokeWidth="0.5" opacity="0.12" />
                  <path d="M0,185 Q80,178 160,185 Q240,192 320,183" fill="none" stroke="var(--color-silk)" strokeWidth="0.5" opacity="0.08" />
                  {/* Distant city glow */}
                  <rect x="85" y="60" width="8" height="20" fill="var(--color-silk)" opacity="0.12" />
                  <rect x="100" y="50" width="10" height="30" fill="var(--color-silk)" opacity="0.10" />
                  <rect x="120" y="55" width="7" height="25" fill="var(--color-silk)" opacity="0.08" />
                  {/* City light dots */}
                  <circle cx="89" cy="65" r="1.5" fill="var(--color-ember)" opacity="0.25" />
                  <circle cx="105" cy="55" r="1.5" fill="var(--color-ember)" opacity="0.20" />
                </svg>
              )}

              {/* ── Chicago — Ferris wheel ── */}
              {m.id === 'chicago-navy-pier' && (
                <svg
                  className={styles.landmark}
                  viewBox="0 0 260 320"
                  aria-hidden
                  style={{ width: '14vw', maxWidth: '220px' }}
                >
                  {/* Ferris wheel — centered spoke structure */}
                  <circle cx="130" cy="130" r="100" fill="none" stroke="var(--color-silk)" strokeWidth="1.5" opacity="0.35" />
                  <circle cx="130" cy="130" r="96" fill="none" stroke="var(--color-silk)" strokeWidth="0.5" opacity="0.15" />
                  {/* Hub */}
                  <circle cx="130" cy="130" r="6" fill="var(--color-ember)" opacity="0.5" />
                  {/* Spokes */}
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i * 30 * Math.PI) / 180;
                    return (
                      <line
                        key={i}
                        x1={130 + Math.cos(angle) * 6}
                        y1={130 + Math.sin(angle) * 6}
                        x2={130 + Math.cos(angle) * 100}
                        y2={130 + Math.sin(angle) * 100}
                        stroke="var(--color-silk)"
                        strokeWidth="0.6"
                        opacity="0.2"
                      />
                    );
                  })}
                  {/* Gondolas */}
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i * 30 * Math.PI) / 180;
                    return (
                      <rect
                        key={i}
                        x={130 + Math.cos(angle) * 96 - 4}
                        y={130 + Math.sin(angle) * 96 - 5}
                        width="8"
                        height="10"
                        rx="1.5"
                        fill="var(--color-silk)"
                        opacity="0.25"
                      />
                    );
                  })}
                  {/* Support legs */}
                  <line x1="130" y1="230" x2="90" y2="310" stroke="var(--color-silk)" strokeWidth="2" opacity="0.3" />
                  <line x1="130" y1="230" x2="170" y2="310" stroke="var(--color-silk)" strokeWidth="2" opacity="0.3" />
                  {/* Base */}
                  <rect x="70" y="305" width="120" height="5" rx="2" fill="var(--color-silk)" opacity="0.2" />
                </svg>
              )}

              {/* ── Hong Kong — skyscraper cluster ── */}
              {(m.id === 'hong-kong-hyatt' || m.id === 'hong-kong-ferry') && (
                <svg
                  className={styles.landmark}
                  viewBox="0 0 400 350"
                  aria-hidden
                  style={{ width: '22vw', maxWidth: '320px' }}
                >
                  {/* Skyscraper cluster — glass towers at varying heights */}
                  <rect x="80" y="30" width="40" height="320" fill="var(--color-silk)" opacity="0.2" />
                  <rect x="82" y="35" width="8" height="14" rx="1" fill="var(--color-silk)" opacity="0.12" />
                  <rect x="94" y="35" width="8" height="14" rx="1" fill="var(--color-silk)" opacity="0.12" />
                  <rect x="106" y="35" width="8" height="14" rx="1" fill="var(--color-silk)" opacity="0.12" />
                  {Array.from({ length: 18 }).map((_, i) => (
                    <g key={`t1-${i}`}>
                      <rect x="84" y={55 + i * 16} width="6" height="10" rx="0.5" fill="var(--color-ember)" opacity="0.12" />
                      <rect x="94" y={55 + i * 16} width="6" height="10" rx="0.5" fill="var(--color-silk)" opacity="0.08" />
                      <rect x="104" y={55 + i * 16} width="6" height="10" rx="0.5" fill="var(--color-ember)" opacity="0.10" />
                    </g>
                  ))}
                  <line x1="100" y1="30" x2="100" y2="8" stroke="var(--color-silk)" strokeWidth="1" opacity="0.3" />
                  <rect x="140" y="80" width="55" height="270" fill="var(--color-silk)" opacity="0.18" />
                  {Array.from({ length: 14 }).map((_, i) => (
                    <g key={`t2-${i}`}>
                      <rect x="145" y={90 + i * 18} width="9" height="12" rx="0.5" fill="var(--color-silk)" opacity="0.10" />
                      <rect x="158" y={90 + i * 18} width="9" height="12" rx="0.5" fill="var(--color-ember)" opacity="0.08" />
                      <rect x="171" y={90 + i * 18} width="9" height="12" rx="0.5" fill="var(--color-silk)" opacity="0.10" />
                      <rect x="184" y={90 + i * 18} width="9" height="12" rx="0.5" fill="var(--color-ember)" opacity="0.06" />
                    </g>
                  ))}
                  <rect x="210" y="55" width="32" height="295" fill="var(--color-silk)" opacity="0.15" />
                  {Array.from({ length: 16 }).map((_, i) => (
                    <g key={`t3-${i}`}>
                      <rect x="214" y={65 + i * 17} width="5" height="11" rx="0.5" fill="var(--color-ember)" opacity="0.10" />
                      <rect x="224" y={65 + i * 17} width="5" height="11" rx="0.5" fill="var(--color-silk)" opacity="0.08" />
                      <rect x="234" y={65 + i * 17} width="5" height="11" rx="0.5" fill="var(--color-silk)" opacity="0.06" />
                    </g>
                  ))}
                  <rect x="255" y="140" width="38" height="210" fill="var(--color-silk)" opacity="0.12" />
                  {Array.from({ length: 10 }).map((_, i) => (
                    <g key={`t4-${i}`}>
                      <rect x="260" y={150 + i * 19} width="7" height="12" rx="0.5" fill="var(--color-silk)" opacity="0.08" />
                      <rect x="272" y={150 + i * 19} width="7" height="12" rx="0.5" fill="var(--color-ember)" opacity="0.06" />
                      <rect x="284" y={150 + i * 19} width="7" height="12" rx="0.5" fill="var(--color-silk)" opacity="0.08" />
                    </g>
                  ))}
                  <rect x="40" y="100" width="30" height="250" fill="var(--color-silk)" opacity="0.10" />
                  {Array.from({ length: 12 }).map((_, i) => (
                    <g key={`t5-${i}`}>
                      <rect x="44" y={110 + i * 18} width="5" height="10" rx="0.5" fill="var(--color-silk)" opacity="0.07" />
                      <rect x="54" y={110 + i * 18} width="5" height="10" rx="0.5" fill="var(--color-silk)" opacity="0.05" />
                    </g>
                  ))}
                </svg>
              )}

              {/* ── Star Ferry — ferry boat on water ── */}
              {m.id === 'hong-kong-ferry' && (
                <svg className={styles.landmark} viewBox="0 0 300 180" aria-hidden style={{ width: '14vw', maxWidth: '200px', bottom: '22vh' }}>
                  {/* Hull */}
                  <path d="M40,110 Q50,140 150,145 Q250,140 260,110 Z" fill="var(--color-silk)" opacity="0.18" />
                  {/* Deck */}
                  <rect x="65" y="85" width="170" height="28" rx="2" fill="var(--color-silk)" opacity="0.14" />
                  {/* Cabin windows */}
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <rect key={`fw-${i}`} x={78 + i * 25} y="92" width="14" height="12" rx="1" fill="var(--color-ember)" opacity="0.15" />
                  ))}
                  {/* Smokestack */}
                  <rect x="140" y="60" width="20" height="28" fill="var(--color-silk)" opacity="0.20" />
                  <ellipse cx="150" cy="58" rx="12" ry="4" fill="var(--color-silk)" opacity="0.15" />
                  {/* Water line ripples */}
                  <path d="M20,150 Q70,143 120,150 Q170,157 220,150 Q270,143 300,150" fill="none" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.12" />
                  <path d="M10,162 Q60,155 110,162 Q160,169 210,162 Q260,155 300,162" fill="none" stroke="var(--color-silk)" strokeWidth="0.5" opacity="0.08" />
                </svg>
              )}

              {/* ── Fun Park Kathmandu — swing ride ── */}
              {m.id === 'kathmandu' && (
                <svg className={styles.landmark} viewBox="0 0 260 280" aria-hidden style={{ width: '13vw', maxWidth: '190px' }}>
                  {/* Central pole */}
                  <line x1="130" y1="280" x2="130" y2="40" stroke="var(--color-silk)" strokeWidth="3" opacity="0.55" />
                  {/* Top canopy / disc */}
                  <ellipse cx="130" cy="45" rx="80" ry="15" fill="var(--color-silk)" opacity="0.42" />
                  <ellipse cx="130" cy="40" rx="75" ry="12" fill="var(--color-ember)" opacity="0.28" />
                  {/* Finial */}
                  <polygon points="125,28 130,12 135,28" fill="var(--color-ember)" opacity="0.60" />
                  {/* Swing chains + seats */}
                  {[-55, -30, -5, 20, 45].map((offset, i) => {
                    const seatX = 130 + offset * 1.6;
                    const seatY = 140 + Math.abs(offset) * 0.6;
                    return (
                      <g key={`sw-${i}`} opacity={0.48 + (i % 2) * 0.08}>
                        <line x1={130 + offset * 0.4} y1="50" x2={seatX} y2={seatY} stroke="var(--color-silk)" strokeWidth="1" />
                        <rect x={seatX - 5} y={seatY} width="10" height="6" rx="1" fill="var(--color-silk)" />
                        {/* Tiny rider silhouette */}
                        <circle cx={seatX} cy={seatY - 6} r="3" fill="var(--color-silk)" opacity="0.9" />
                        <line x1={seatX} y1={seatY - 3} x2={seatX} y2={seatY} stroke="var(--color-silk)" strokeWidth="1.2" opacity="0.8" />
                      </g>
                    );
                  })}
                  {/* Base platform */}
                  <ellipse cx="130" cy="275" rx="40" ry="8" fill="var(--color-silk)" opacity="0.30" />
                </svg>
              )}

              {/* ── Boudha Stupa — stupa with prayer flags ── */}
              {m.id === 'boudha-stupa' && (
                <svg className={styles.landmark} viewBox="0 0 280 320" aria-hidden style={{ width: '14vw', maxWidth: '210px' }}>
                  {/* Base platform — tiered */}
                  <rect x="30" y="260" width="220" height="15" fill="var(--color-silk)" opacity="0.15" />
                  <rect x="50" y="245" width="180" height="18" fill="var(--color-silk)" opacity="0.14" />
                  <rect x="65" y="230" width="150" height="18" fill="var(--color-silk)" opacity="0.13" />
                  {/* Dome (hemisphere) */}
                  <ellipse cx="140" cy="200" rx="75" ry="45" fill="var(--color-silk)" opacity="0.20" />
                  {/* Harmika (square base for eyes) */}
                  <rect x="115" y="155" width="50" height="35" fill="var(--color-silk)" opacity="0.22" />
                  {/* Buddha eyes — simplified */}
                  <g opacity="0.35" fill="var(--color-ember)">
                    <ellipse cx="128" cy="168" rx="5" ry="3.5" />
                    <ellipse cx="152" cy="168" rx="5" ry="3.5" />
                    {/* Third eye / nose — question mark shape */}
                    <path d="M140,175 Q140,180 140,183" fill="none" stroke="var(--color-ember)" strokeWidth="1.5" />
                  </g>
                  {/* Spire — 13 tiers */}
                  <polygon points="130,155 140,60 150,155" fill="var(--color-silk)" opacity="0.20" />
                  {/* Tier rings */}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <line key={`sp-${i}`} x1={133 + i * 0.4} y1={140 - i * 16} x2={147 - i * 0.4} y2={140 - i * 16} stroke="var(--color-silk)" strokeWidth="0.8" opacity="0.18" />
                  ))}
                  {/* Crown / parasol */}
                  <ellipse cx="140" cy="58" rx="12" ry="4" fill="var(--color-ember)" opacity="0.30" />
                  {/* Prayer flag strings radiating from spire */}
                  <path d="M140,80 Q90,100 30,130" fill="none" stroke="var(--color-ember)" strokeWidth="0.6" opacity="0.25" />
                  <path d="M140,80 Q190,100 250,130" fill="none" stroke="var(--color-ember)" strokeWidth="0.6" opacity="0.25" />
                  <path d="M140,90 Q80,120 20,170" fill="none" stroke="var(--color-ember)" strokeWidth="0.5" opacity="0.20" />
                  <path d="M140,90 Q200,120 260,170" fill="none" stroke="var(--color-ember)" strokeWidth="0.5" opacity="0.20" />
                  {/* Tiny flag triangles */}
                  {[60, 80, 100, 120].map((x, i) => (
                    <polygon key={`fl-${i}`} points={`${x},${105 + i * 5} ${x + 8},${105 + i * 5} ${x + 4},${112 + i * 5}`} fill="var(--color-ember)" opacity={0.18 + i * 0.03} />
                  ))}
                  {[160, 180, 200, 220].map((x, i) => (
                    <polygon key={`fr-${i}`} points={`${x},${105 + i * 5} ${x + 8},${105 + i * 5} ${x + 4},${112 + i * 5}`} fill="var(--color-ember)" opacity={0.18 + i * 0.03} />
                  ))}
                  {/* Base ground */}
                  <rect x="20" y="275" width="240" height="4" rx="2" fill="var(--color-silk)" opacity="0.10" />
                </svg>
              )}

              {/* ── HKG Return — departure terminal ── */}
              {m.id === 'hkg-return' && (
                <svg className={styles.landmark} viewBox="0 0 340 220" aria-hidden style={{ width: '17vw', maxWidth: '250px' }}>
                  {/* Long terminal canopy */}
                  <rect x="10" y="60" width="320" height="130" fill="var(--color-silk)" opacity="0.12" />
                  {/* Roof overhang */}
                  <rect x="0" y="52" width="340" height="10" fill="var(--color-silk)" opacity="0.30" />
                  {/* Floor-to-ceiling gate windows */}
                  {[0,1,2,3,4,5,6].map((i) => (
                    <rect key={`hkr-w-${i}`} x={20 + i * 44} y="70" width="28" height="80" rx="2" fill="none" stroke="var(--color-silk)" strokeWidth="1" opacity="0.35" />
                  ))}
                  {/* Departures board */}
                  <rect x="108" y="78" width="124" height="20" rx="1" fill="var(--color-ember)" opacity="0.18" />
                  {[0,1,2,3,4].map((i) => (
                    <rect key={`hkr-d-${i}`} x={115 + i * 22} y="83" width="14" height="4" rx="0.5" fill="var(--color-silk)" opacity="0.28" />
                  ))}
                  {/* Gate number badges */}
                  {[0,1,2].map((i) => (
                    <rect key={`hkr-g-${i}`} x={28 + i * 44} y="73" width="20" height="7" rx="1" fill="var(--color-ember)" opacity="0.30" />
                  ))}
                  {/* Jetway arms */}
                  {[28, 116, 204].map((x, i) => (
                    <g key={`hkr-j-${i}`} opacity="0.30">
                      <rect x={x} y="108" width="38" height="5" fill="var(--color-silk)" />
                      <rect x={x + 34} y="102" width="10" height="17" rx="1" fill="var(--color-silk)" />
                    </g>
                  ))}
                  {/* Tarmac stripe */}
                  <rect x="0" y="192" width="340" height="3" fill="var(--color-silk)" opacity="0.22" />
                  {[0,1,2,3,4,5].map((i) => (
                    <rect key={`hkr-r-${i}`} x={15 + i * 55} y="200" width="30" height="2" fill="var(--color-ember)" opacity="0.18" />
                  ))}
                </svg>
              )}

              {/* ── O'Hare — terminal with control tower ── */}
              {m.id === 'ord-return' && (
                <svg className={styles.landmark} viewBox="0 0 340 260" aria-hidden style={{ width: '17vw', maxWidth: '250px' }}>
                  {/* Terminal main body */}
                  <rect x="20" y="110" width="280" height="130" fill="var(--color-silk)" opacity="0.13" />
                  {/* Terminal roof — angled */}
                  <polygon points="20,110 160,78 300,110" fill="var(--color-silk)" opacity="0.22" />
                  {/* Control tower */}
                  <rect x="148" y="28" width="24" height="84" fill="var(--color-silk)" opacity="0.30" />
                  {/* Tower cab */}
                  <rect x="136" y="16" width="48" height="16" rx="2" fill="var(--color-silk)" opacity="0.35" />
                  {/* Cab windows */}
                  {[0,1,2,3].map((i) => (
                    <rect key={`ord-c-${i}`} x={140 + i * 11} y="19" width="8" height="10" rx="1" fill="var(--color-ember)" opacity="0.38" />
                  ))}
                  {/* Beacon */}
                  <line x1="160" y1="16" x2="160" y2="6" stroke="var(--color-ember)" strokeWidth="1.5" opacity="0.50" />
                  <circle cx="160" cy="4" r="3" fill="var(--color-ember)" opacity="0.55" />
                  {/* Terminal windows — row of 8 */}
                  {[0,1,2,3,4,5,6,7].map((i) => (
                    <rect key={`ord-w-${i}`} x={30 + i * 33} y="126" width="20" height="50" rx="1.5" fill="none" stroke="var(--color-silk)" strokeWidth="0.8" opacity="0.32" />
                  ))}
                  {/* Lower gate strip */}
                  {[0,1,2,3,4,5].map((i) => (
                    <rect key={`ord-g-${i}`} x={36 + i * 44} y="184" width="26" height="28" rx="1" fill="none" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.22" />
                  ))}
                  {/* Tarmac */}
                  <line x1="0" y1="244" x2="340" y2="244" stroke="var(--color-silk)" strokeWidth="1.2" opacity="0.22" />
                  {[0,1,2,3,4,5].map((i) => (
                    <rect key={`ord-r-${i}`} x={18 + i * 55} y="250" width="30" height="2" fill="var(--color-silk)" opacity="0.15" />
                  ))}
                </svg>
              )}

              {/* ── MCI Arrival — circular hub terminal ── */}
              {m.id === 'mci-arrival' && (
                <svg className={styles.landmark} viewBox="0 0 300 250" aria-hidden style={{ width: '15vw', maxWidth: '220px' }}>
                  {/* Outer ring */}
                  <circle cx="150" cy="115" r="90" fill="none" stroke="var(--color-silk)" strokeWidth="1.8" opacity="0.30" />
                  <circle cx="150" cy="115" r="75" fill="none" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.20" />
                  {/* Hub fill */}
                  <circle cx="150" cy="115" r="60" fill="var(--color-silk)" opacity="0.08" />
                  {/* Centre beacon ring */}
                  <circle cx="150" cy="115" r="18" fill="none" stroke="var(--color-ember)" strokeWidth="1.2" opacity="0.45" />
                  <circle cx="150" cy="115" r="8" fill="var(--color-ember)" opacity="0.28" />
                  {/* Radial spokes — gates */}
                  {Array.from({ length: 8 }, (_, i) => {
                    const angle = (i * 45 * Math.PI) / 180;
                    return (
                      <line
                        key={`mci-s-${i}`}
                        x1={150 + Math.cos(angle) * 18}
                        y1={115 + Math.sin(angle) * 18}
                        x2={150 + Math.cos(angle) * 60}
                        y2={115 + Math.sin(angle) * 60}
                        stroke="var(--color-silk)"
                        strokeWidth="0.8"
                        opacity="0.28"
                      />
                    );
                  })}
                  {/* Gate pods at perimeter */}
                  {Array.from({ length: 8 }, (_, i) => {
                    const angle = (i * 45 * Math.PI) / 180;
                    return (
                      <rect
                        key={`mci-g-${i}`}
                        x={150 + Math.cos(angle) * 82 - 8}
                        y={115 + Math.sin(angle) * 82 - 6}
                        width="16"
                        height="12"
                        rx="2"
                        fill="var(--color-silk)"
                        opacity="0.28"
                      />
                    );
                  })}
                  {/* ARRIVALS label */}
                  <text x="150" y="119" fill="var(--color-ember)" fontSize="7" fontFamily="var(--font-sans)" letterSpacing="0.1em" textAnchor="middle" opacity="0.55">ARRIVALS</text>
                  {/* Ground shadow ring */}
                  <ellipse cx="150" cy="225" rx="88" ry="8" fill="var(--color-silk)" opacity="0.10" />
                  {/* Centre column to ground */}
                  <rect x="145" y="175" width="10" height="50" fill="var(--color-silk)" opacity="0.14" />
                </svg>
              )}

              {/* ── Washburn North — modern apartment complex ── */}
              {m.id === 'washburn-north' && (
                <svg className={styles.landmark} viewBox="0 0 300 280" aria-hidden style={{ width: '15vw', maxWidth: '220px' }}>
                  {/* Main tower block — taller, modern */}
                  <rect x="80" y="40" width="140" height="220" fill="var(--color-silk)" opacity="0.14" />
                  {/* Flat roof with edge cap */}
                  <rect x="74" y="34" width="152" height="8" fill="var(--color-silk)" opacity="0.28" />
                  {/* Rooftop details — HVAC boxes */}
                  <rect x="90" y="24" width="20" height="12" rx="1" fill="var(--color-silk)" opacity="0.20" />
                  <rect x="118" y="26" width="14" height="10" rx="1" fill="var(--color-silk)" opacity="0.16" />
                  <rect x="190" y="24" width="18" height="12" rx="1" fill="var(--color-silk)" opacity="0.20" />
                  {/* Windows — 5 floors × 3 columns */}
                  {[0,1,2,3,4].map((row) => [0,1,2].map((col) => (
                    <rect key={`wn-w-${row}-${col}`} x={100 + col * 42} y={56 + row * 40} width="24" height="28" rx="1" fill="none" stroke="var(--color-silk)" strokeWidth="0.8" opacity="0.28" />
                  )))}                  
                  {/* Warm-lit windows — lived-in feel */}
                  <rect x="100" y="56" width="24" height="28" rx="1" fill="var(--color-ember)" opacity="0.12" />
                  <rect x="184" y="136" width="24" height="28" rx="1" fill="var(--color-ember)" opacity="0.09" />
                  <rect x="142" y="96" width="24" height="28" rx="1" fill="var(--color-ember)" opacity="0.10" />
                  {/* Balconies — every other unit on 3rd & 4th floor */}
                  {[2,3].map((row) => [0,2].map((col) => (
                    <g key={`wn-bal-${row}-${col}`}>
                      <rect x={98 + col * 42} y={52 + row * 40 + 28} width="28" height="5" rx="0.5" fill="var(--color-silk)" opacity="0.22" />
                      <line x1={99 + col * 42} y1={52 + row * 40 + 28} x2={125 + col * 42} y2={52 + row * 40 + 28} stroke="var(--color-ember)" strokeWidth="0.7" opacity="0.28" />
                    </g>
                  )))}                  
                  {/* Low wing / lobby extension — left */}
                  <rect x="30" y="160" width="52" height="100" fill="var(--color-silk)" opacity="0.11" />
                  <rect x="26" y="154" width="60" height="8" fill="var(--color-silk)" opacity="0.18" />
                  {[0,1].map((row) => [0,1].map((col) => (
                    <rect key={`wn-wl-${row}-${col}`} x={40 + col * 22} y={172 + row * 34} width="14" height="20" rx="1" fill="none" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.20" />
                  )))}                  
                  {/* Low wing — right */}
                  <rect x="218" y="160" width="52" height="100" fill="var(--color-silk)" opacity="0.11" />
                  <rect x="214" y="154" width="60" height="8" fill="var(--color-silk)" opacity="0.18" />
                  {[0,1].map((row) => [0,1].map((col) => (
                    <rect key={`wn-wr-${row}-${col}`} x={228 + col * 22} y={172 + row * 34} width="14" height="20" rx="1" fill="none" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.20" />
                  )))}                  
                  {/* Ground-floor entrance */}
                  <rect x="125" y="220" width="50" height="40" rx="1" fill="var(--color-silk)" opacity="0.10" />
                  <line x1="150" y1="220" x2="150" y2="260" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.18" />
                  {/* 'N' compass mark — subtle nod to "North" */}
                  <text x="148" y="215" fill="var(--color-ember)" fontSize="7" fontFamily="var(--font-sans)" letterSpacing="0.08em" textAnchor="middle" opacity="0.45">N</text>
                  {/* Sidewalk */}
                  <rect x="20" y="260" width="260" height="4" rx="2" fill="var(--color-silk)" opacity="0.18" />
                </svg>
              )}

              {/* ── Washburn South — apartment building ── */}
              {m.id === 'washburn-south' && (
                <svg className={styles.landmark} viewBox="0 0 280 280" aria-hidden style={{ width: '14vw', maxWidth: '200px' }}>
                  {/* Main apartment block */}
                  <rect x="40" y="60" width="200" height="200" fill="var(--color-silk)" opacity="0.14" />
                  {/* Flat roof */}
                  <rect x="34" y="54" width="212" height="8" fill="var(--color-silk)" opacity="0.30" />
                  {/* Rooftop AC units */}
                  <rect x="55" y="44" width="24" height="12" rx="1" fill="var(--color-silk)" opacity="0.22" />
                  <rect x="92" y="46" width="16" height="10" rx="1" fill="var(--color-silk)" opacity="0.18" />
                  <rect x="172" y="44" width="24" height="12" rx="1" fill="var(--color-silk)" opacity="0.22" />
                  {/* Windows — 4 floors × 4 columns */}
                  {[0,1,2,3].map((row) => [0,1,2,3].map((col) => (
                    <rect key={`ws-w-${row}-${col}`} x={56 + col * 46} y={76 + row * 46} width="22" height="28" rx="1" fill="none" stroke="var(--color-silk)" strokeWidth="0.8" opacity="0.30" />
                  )))}
                  {/* Balconies — 2nd floor */}
                  {[0,1,2,3].map((col) => (
                    <g key={`ws-bal-${col}`}>
                      <rect x={54 + col * 46} y="168" width="26" height="5" rx="0.5" fill="var(--color-silk)" opacity="0.25" />
                      <line x1={55 + col * 46} y1="168" x2={79 + col * 46} y2="168" stroke="var(--color-ember)" strokeWidth="0.8" opacity="0.30" />
                    </g>
                  ))}
                  {/* Ground-floor entrance lobby */}
                  <rect x="110" y="212" width="60" height="48" rx="1" fill="var(--color-silk)" opacity="0.12" />
                  <line x1="140" y1="212" x2="140" y2="260" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.20" />
                  {/* Warm-lit windows */}
                  <rect x="56" y="122" width="22" height="28" rx="1" fill="var(--color-ember)" opacity="0.14" />
                  <rect x="148" y="76" width="22" height="28" rx="1" fill="var(--color-ember)" opacity="0.10" />
                  {/* Base / sidewalk */}
                  <rect x="28" y="258" width="224" height="4" rx="2" fill="var(--color-silk)" opacity="0.22" />
                  {/* Mailboxes */}
                  <rect x="186" y="238" width="14" height="14" rx="1" fill="var(--color-silk)" opacity="0.18" />
                  <line x1="186" y1="245" x2="200" y2="245" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.22" />
                </svg>
              )}

              {/* ── Denver — mountain city skyline ── */}
              {m.id === 'denver' && (
                <svg className={styles.landmark} viewBox="0 0 360 280" aria-hidden style={{ width: '18vw', maxWidth: '260px' }}>
                  {/* Distant mountains behind city */}
                  <path d="M0,160 L60,80 L120,130 L180,50 L240,110 L300,70 L360,140 L360,280 L0,280 Z" fill="var(--color-silk)" opacity="0.08" />
                  {/* Snow caps */}
                  <path d="M180,50 L195,75 L165,75 Z" fill="var(--color-silk)" opacity="0.15" />
                  <path d="M300,70 L315,95 L285,95 Z" fill="var(--color-silk)" opacity="0.15" />
                  {/* City buildings — varied heights */}
                  <rect x="40" y="140" width="25" height="120" fill="var(--color-silk)" opacity="0.18" />
                  <rect x="72" y="110" width="30" height="150" fill="var(--color-silk)" opacity="0.16" />
                  <rect x="110" y="125" width="22" height="135" fill="var(--color-silk)" opacity="0.14" />
                  <rect x="140" y="90" width="35" height="170" fill="var(--color-silk)" opacity="0.18" />
                  <rect x="182" y="105" width="28" height="155" fill="var(--color-silk)" opacity="0.15" />
                  <rect x="218" y="130" width="25" height="130" fill="var(--color-silk)" opacity="0.14" />
                  <rect x="250" y="115" width="32" height="145" fill="var(--color-silk)" opacity="0.16" />
                  <rect x="290" y="140" width="28" height="120" fill="var(--color-silk)" opacity="0.13" />
                  {/* Window dots for tallest buildings */}
                  {[0, 1, 2, 3, 4].map((row) => (
                    <g key={`dw-${row}`}>
                      <rect x="144" y={100 + row * 28} width="5" height="8" rx="0.5" fill="var(--color-ember)" opacity="0.12" />
                      <rect x="155" y={100 + row * 28} width="5" height="8" rx="0.5" fill="var(--color-silk)" opacity="0.08" />
                      <rect x="166" y={100 + row * 28} width="5" height="8" rx="0.5" fill="var(--color-ember)" opacity="0.10" />
                    </g>
                  ))}
                  {/* Base */}
                  <rect x="20" y="260" width="320" height="4" rx="2" fill="var(--color-silk)" opacity="0.10" />
                </svg>
              )}

              {/* ── Sapphire Point — mountain overlook with railing ── */}
              {m.id === 'sapphire-point' && (
                <svg className={styles.landmark} viewBox="0 0 340 300" aria-hidden style={{ width: '17vw', maxWidth: '250px' }}>
                  {/* Distant mountain range */}
                  <path d="M0,180 L50,100 L100,150 L170,40 L240,120 L290,80 L340,160 L340,300 L0,300 Z" fill="var(--color-silk)" opacity="0.10" />
                  {/* Snow on main peak */}
                  <path d="M170,40 L190,70 L150,70 Z" fill="var(--color-silk)" opacity="0.20" />
                  <path d="M290,80 L305,105 L275,105 Z" fill="var(--color-silk)" opacity="0.18" />
                  {/* Overlook platform / cliff edge */}
                  <path d="M60,240 L280,240 L300,260 L40,260 Z" fill="var(--color-silk)" opacity="0.15" />
                  {/* Railing */}
                  <line x1="70" y1="240" x2="70" y2="215" stroke="var(--color-silk)" strokeWidth="1.5" opacity="0.25" />
                  <line x1="270" y1="240" x2="270" y2="215" stroke="var(--color-silk)" strokeWidth="1.5" opacity="0.25" />
                  <line x1="70" y1="218" x2="270" y2="218" stroke="var(--color-silk)" strokeWidth="1" opacity="0.22" />
                  <line x1="70" y1="230" x2="270" y2="230" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.15" />
                  {/* Railing posts */}
                  {[110, 150, 190, 230].map((x) => (
                    <line key={`rail-${x}`} x1={x} y1="240" x2={x} y2="215" stroke="var(--color-silk)" strokeWidth="0.8" opacity="0.18" />
                  ))}
                  {/* Two silhouette figures at overlook */}
                  <g opacity="0.22" fill="var(--color-silk)">
                    {/* Figure 1 */}
                    <circle cx="150" cy="200" r="6" />
                    <path d="M150,206 L150,228 M142,215 L158,215 M147,228 L143,240 M153,228 L157,240" fill="none" stroke="var(--color-silk)" strokeWidth="1.5" strokeLinecap="round" />
                    {/* Figure 2 */}
                    <circle cx="175" cy="198" r="6" />
                    <path d="M175,204 L175,228 M167,213 L183,213 M172,228 L168,240 M178,228 L182,240" fill="none" stroke="var(--color-silk)" strokeWidth="1.5" strokeLinecap="round" />
                  </g>
                  {/* Ember warm glow on horizon */}
                  <rect x="0" y="155" width="340" height="30" fill="var(--color-ember)" opacity="0.08" />
                  {/* Ground below overlook / cliff face */}
                  <path d="M40,260 L20,300 L320,300 L300,260 Z" fill="var(--color-silk)" opacity="0.08" />
                </svg>
              )}

              {/* Kite card — always visible, tethered memory snippet */}
              <div className={`${styles.kiteCard}${m.memoryCard?.photo ? ` ${styles.kiteCardPhoto}` : ''}`}>
                <div className={styles.kiteTextCol}>
                  <p className={styles.kiteBody}>{m.description}</p>
                  {m.memoryCard && (
                    <p
                      className={styles.kiteMemory}
                      style={{
                        opacity: isMemoryVisible ? 0.85 : 0,
                        maxHeight: isMemoryVisible ? '6rem' : '0',
                        marginTop: isMemoryVisible ? '0.6rem' : '0',
                        paddingTop: isMemoryVisible ? '0.5rem' : '0',
                        overflow: 'hidden',
                        transition:
                          'opacity 0.6s ease, max-height 0.6s ease, margin-top 0.45s ease, padding-top 0.45s ease',
                      }}
                    >
                      {m.memoryCard.body}
                    </p>
                  )}
                </div>
                {m.memoryCard?.photo && (
                  <div
                    className={styles.kitePhotoFrame}
                    style={{
                      opacity: isMemoryVisible ? 1 : 0,
                      transition: 'opacity 0.7s ease',
                    }}
                  >
                    <img
                      className={styles.kitePhoto}
                      src={m.memoryCard.photo}
                      alt={m.memoryCard.title}
                      loading="lazy"
                      draggable={false}
                    />
                  </div>
                )}
              </div>
              <div className={styles.kiteTether} />
              <span className={styles.trackLabel}>{m.label}</span>
              <div className={styles.trackDot} />
            </div>
            );
          })}
        </div>

        {/* Foreground — vehicle frame overlay */}
        <VehicleSwitcher transport={activeTransport} cockpitRef={cockpitRef} />

        {/* Transport transition flash (Fix F) */}
        <div ref={transportFlashRef} className={styles.transportFlash} />

        {/* Progress bar */}
        <div className={styles.progressTrack}>
          <div ref={progressRef} className={styles.progressFill} />
        </div>


        </div>
      </div>
    </div>
  );
}
