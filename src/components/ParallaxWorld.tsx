/**
 * ParallaxWorld — Scroll-Driven Biome Background
 * ===============================================
 * Renders layered scenery behind the cockpit that slides
 * horizontally at differential speeds as the user scrolls,
 * creating a parallax depth effect.
 *
 * Architecture (Phase 1 terrain-morph):
 *   1. TerrainLine — continuous ground contour that morphs
 *      smoothly with the elevation prop. Always visible.
 *   2. Biome detail layers — Nepal prayer-flags, Topeka
 *      buildings, Colorado pines, Global clouds. These still
 *      cross-fade on biome change, but the ground line itself
 *      is never cut.
 *
 * Parallax math:
 *   Each biome has 3 layers (far / mid / near).
 *   Layer translateX = -progress × maxShift × speedMultiplier
 *   Far moves slowest, Near moves fastest.
 *   TerrainLine layers receive the same parallax shift.
 */

import { useRef, useEffect } from 'react';
import { gsap } from '../lib/gsapSetup';
import type { Biome, Transport } from '../data/STORY_DATA';
import {
  NepalFar, NepalMid, NepalNear,
  TopekaFar, TopekaMid, TopekaNear,
  ColoradoFar, ColoradoMid, ColoradoNear,
  GlobalFar, GlobalMid, GlobalNear,
} from './BiomeScenery';
import TerrainLine from './TerrainLine';
import VehicleSilhouette from './VehicleSilhouette';
import SkyGradient from './SkyGradient';
import CloudWisps from './CloudWisps';
import EnvironmentParticles from './EnvironmentParticles';

import styles from './ParallaxWorld.module.css';

// ──────────────────────────────────────────────
// Speed multipliers per depth layer
// ──────────────────────────────────────────────

/** Maximum horizontal shift (% of container width) at progress = 1. */
const MAX_SHIFT = 66;   // the SVGs are 300% wide, so 66% = full travel

const SPEED = {
  far:  0.3,           // barely drifts
  mid:  0.6,           // moderate
  near: 1.0,           // matches scroll feel
} as const;

// ──────────────────────────────────────────────
// Biome ordering (for iteration)
// ──────────────────────────────────────────────

const BIOMES: Biome[] = ['nepal', 'topeka', 'colorado', 'global'];

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

interface Props {
  /** Currently active biome from the journey node. */
  biome: Biome;
  /** 0→1 scroll progress through the Act II stage. */
  progress: number;
  /** Active transport — affects depth-of-field and altitude cues (Fix G). */
  transport?: Transport;
  /**
   * Interpolated terrain elevation (0→1) for the continuous ground contour.
   * Driven by the current + next node's elevation values.
   */
  elevation: number;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function ParallaxWorld({ biome, progress, transport, elevation }: Props) {
  // Refs for each biome container (for opacity cross-fade)
  const biomeRefs = useRef<Record<Biome, HTMLDivElement | null>>({
    nepal: null,
    topeka: null,
    colorado: null,
    global: null,
  });

  // Refs for each layer (for translateX)
  const layerRefs = useRef<Record<Biome, { far: HTMLDivElement | null; mid: HTMLDivElement | null; near: HTMLDivElement | null }>>({
    nepal:    { far: null, mid: null, near: null },
    topeka:   { far: null, mid: null, near: null },
    colorado: { far: null, mid: null, near: null },
    global:   { far: null, mid: null, near: null },
  });

  // ── Cross-fade biomes on change (long, cinematic dissolve) ──
  useEffect(() => {
    const fadeInDur = 2.4;    // slow, cinematic fade-in for new biome
    const fadeOutDur = 2.8;   // even slower fade-out for old biome (lingers)
    const easeIn = 'power4.out';
    const easeOut = 'expo.out';

    BIOMES.forEach((b) => {
      const el = biomeRefs.current[b];
      if (!el) return;
      // Kill any in-flight opacity tween on this element before
      // starting a new one — prevents races during fast scrolling
      // where multiple tweens could leave all biomes at opacity ≈ 0.
      gsap.killTweensOf(el, 'opacity');

      if (b === biome) {
        // Incoming biome — fade in with a slight delay so the
        // outgoing biome starts dissolving first (overlap dissolve).
        gsap.to(el, {
          opacity: 1,
          duration: fadeInDur,
          delay: 0.3,
          ease: easeIn,
        });
      } else {
        // Outgoing biome — longer, gentler fade keeps the visual
        // field occupied and prevents "void" flashes.
        gsap.to(el, {
          opacity: 0,
          duration: fadeOutDur,
          ease: easeOut,
        });
      }
    });
  }, [biome]);

  // ── Parallax horizontal shift on progress change ──
  // Active biome layers get horizontal parallax. Inactive biomes
  // are reset to origin.
  //
  // Far layers also receive an elevation-based vertical offset so
  // that mountains rise organically from behind the terrain instead
  // of popping in at full height when the biome cross-fades. At
  // low elevation the far layer is pushed down (hidden behind the
  // mid/near terrain); as elevation increases it slides up to reveal
  // the peaks.
  useEffect(() => {
    // Maximum downward push (% of container height) when elevation = 0.
    // At 40% down the far-layer peaks are completely behind the terrain.
    const FAR_MAX_PUSH = 40;

    BIOMES.forEach((b) => {
      const layers = layerRefs.current[b];

      (['far', 'mid', 'near'] as const).forEach((depth) => {
        const el = layers[depth];
        if (!el) return;

        if (b === biome) {
          const shiftX = -(progress * MAX_SHIFT * SPEED[depth]);

          if (depth === 'far') {
            // Vertical offset: push down when elevation is low,
            // fully revealed at elevation ≈ 0.7+
            const revealFraction = Math.min(1, elevation / 0.7);
            // Smoothstep for organic feel
            const t = revealFraction * revealFraction * (3 - 2 * revealFraction);
            const pushY = FAR_MAX_PUSH * (1 - t);
            el.style.transform = `translate3d(${shiftX}%, ${pushY}%, 0)`;
          } else {
            el.style.transform = `translate3d(${shiftX}%, 0, 0)`;
          }
        } else {
          // Park inactive biomes at origin so they're centred when they fade in
          // (including the vertical push for far layers)
          if (depth === 'far') {
            const revealFraction = Math.min(1, elevation / 0.7);
            const t = revealFraction * revealFraction * (3 - 2 * revealFraction);
            const pushY = FAR_MAX_PUSH * (1 - t);
            el.style.transform = `translate3d(0, ${pushY}%, 0)`;
          } else {
            el.style.transform = 'translate3d(0, 0, 0)';
          }
        }
      });
    });
  }, [progress, biome, elevation]);

  // ── Transport-aware depth cues (Fix G) ──
  // Step 21: far layers always have a base blur(1.5px) via CSS.
  //          Walking and plane modes add extra filter effects on top.
  useEffect(() => {
    BIOMES.forEach((b) => {
      const farEl = layerRefs.current[b].far;
      const nearEl = layerRefs.current[b].near;

      if (farEl) {
        const farFilter =
          transport === 'walking'
            ? 'blur(2.5px)'
            : transport === 'plane'
              ? 'blur(1.5px) brightness(1.1)'
              : 'blur(1.5px)';   // base depth blur for all transports
        gsap.to(farEl, { filter: farFilter, duration: 0.6, ease: 'expo.out' });
      }

      if (nearEl) {
        const nearScale = transport === 'plane' ? 1.05 : 1;
        gsap.to(nearEl, { scale: nearScale, duration: 0.6, ease: 'expo.out' });
      }
    });
  }, [transport]);

  return (
    <div className={styles.world}>
      {/* ── Sky gradient tint (behind everything) ── */}
      <SkyGradient transport={transport} />

      {/* ── Floating cloud wisps (across top 30%) ── */}
      <CloudWisps transport={transport} />

      {/* ── Ground line visual anchor (Step 20) ── */}
      <div className={styles.groundLine} />

      {/* ── Environmental atmosphere particles (Step 22) ── */}
      <EnvironmentParticles biome={biome} />

      {/* ── Continuous terrain ground contour (always visible) ── */}
      <TerrainLine elevation={elevation} />

      {/* ── Third-person vehicle silhouettes (above terrain, below biome detail) ── */}
      <VehicleSilhouette transport={transport ?? 'walking'} elevation={elevation} />

      {/* Nepal */}
      <div
        ref={(el) => { biomeRefs.current.nepal = el; }}
        className={styles.biome}
        style={{ opacity: biome === 'nepal' ? 1 : 0 }}
      >
        <div ref={(el) => { layerRefs.current.nepal.far = el; }} className={styles.layerFar}><NepalFar /></div>
        <div ref={(el) => { layerRefs.current.nepal.mid = el; }} className={styles.layerMid}><NepalMid /></div>
        <div ref={(el) => { layerRefs.current.nepal.near = el; }} className={styles.layerNear}><NepalNear /></div>
      </div>

      {/* Topeka */}
      <div
        ref={(el) => { biomeRefs.current.topeka = el; }}
        className={styles.biome}
        style={{ opacity: biome === 'topeka' ? 1 : 0 }}
      >
        <div ref={(el) => { layerRefs.current.topeka.far = el; }} className={styles.layerFar}><TopekaFar /></div>
        <div ref={(el) => { layerRefs.current.topeka.mid = el; }} className={styles.layerMid}><TopekaMid /></div>
        <div ref={(el) => { layerRefs.current.topeka.near = el; }} className={styles.layerNear}><TopekaNear /></div>
      </div>

      {/* Colorado */}
      <div
        ref={(el) => { biomeRefs.current.colorado = el; }}
        className={styles.biome}
        style={{ opacity: biome === 'colorado' ? 1 : 0 }}
      >
        <div ref={(el) => { layerRefs.current.colorado.far = el; }} className={styles.layerFar}><ColoradoFar /></div>
        <div ref={(el) => { layerRefs.current.colorado.mid = el; }} className={styles.layerMid}><ColoradoMid /></div>
        <div ref={(el) => { layerRefs.current.colorado.near = el; }} className={styles.layerNear}><ColoradoNear /></div>
      </div>

      {/* Global */}
      <div
        ref={(el) => { biomeRefs.current.global = el; }}
        className={styles.biome}
        style={{ opacity: biome === 'global' ? 1 : 0 }}
      >
        <div ref={(el) => { layerRefs.current.global.far = el; }} className={styles.layerFar}><GlobalFar /></div>
        <div ref={(el) => { layerRefs.current.global.mid = el; }} className={styles.layerMid}><GlobalMid /></div>
        <div ref={(el) => { layerRefs.current.global.near = el; }} className={styles.layerNear}><GlobalNear /></div>
      </div>
    </div>
  );
}
