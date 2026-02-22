/**
 * TerrainLine — Continuous Elevation-Driven Ground Contour
 * =========================================================
 * Renders 3 SVG depth layers (far ridge, mid hill, near ground)
 * whose shape morphs continuously based on the `elevation` prop (0→1).
 *
 * This replaces the hard biome cross-fade with a smooth terrain
 * morph, so flat Topeka plains gradually slope into Colorado mountains
 * without any visual disconnect.
 *
 * Elevation guide:
 *   0.00 — Dead flat (Topeka / Kansas plains)
 *   0.05 — Near-flat with barely perceptible ripples
 *   0.30 — Gentle rolling hills (desert / coast)
 *   0.55 — Moderate foothills (Denver approach)
 *   0.70 — Mountain valley (Kathmandu basin)
 *   0.90 — High peaks (Sapphire Point / Rockies)
 *   1.00 — Maximum peak amplitude
 *
 * Each layer generates an SVG `<path>` from a procedural
 * peak array. Peak amplitude = baseRipple + elevation × range.
 * Cubic bezier curves connect the peaks so the ground contour
 * feels organic, not jagged.
 */

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import styles from './TerrainLine.module.css';

// ──────────────────────────────────────────────
// SVG constants (match BiomeScenery viewBox)
// ──────────────────────────────────────────────

const VB_W = 5760;
const VB_H = 1080;

/** Shared style for SVG elements — matches BiomeScenery's layerBase. */
const svgStyle: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '300%',      // extra width for horizontal parallax sliding
  height: '100%',
  pointerEvents: 'none',
  userSelect: 'none',
};

// ──────────────────────────────────────────────
// Layer configuration
// ──────────────────────────────────────────────

interface LayerConfig {
  /** Number of peak points across the width. */
  peakCount: number;
  /** Y position of the ground when elevation = 0 (flat). */
  baselineY: number;
  /** Maximum upward displacement from baseline at elevation = 1. */
  maxAmplitude: number;
  /** Tiny ripple even at elevation 0, so it's never a ruler line. */
  baseRipple: number;
  /** SVG fill opacity. */
  opacity: number;
  /** Seed offset for pseudo-random variation between layers. */
  seed: number;
}

const FAR_LAYER: LayerConfig = {
  peakCount: 14,
  baselineY: 680,
  maxAmplitude: 420,   // peaks can reach y ≈ 260 at full elevation
  baseRipple: 15,
  opacity: 0.18,
  seed: 0,
};

const MID_LAYER: LayerConfig = {
  peakCount: 18,
  baselineY: 780,
  maxAmplitude: 300,
  baseRipple: 12,
  opacity: 0.25,
  seed: 37,
};

const NEAR_LAYER: LayerConfig = {
  peakCount: 22,
  baselineY: 900,
  maxAmplitude: 180,
  baseRipple: 8,
  opacity: 0.35,
  seed: 71,
};

// ──────────────────────────────────────────────
// Path generation
// ──────────────────────────────────────────────

/**
 * Simple deterministic hash for consistent "random" variation.
 * Returns 0→1 for a given index + seed.
 */
function pseudoRandom(index: number, seed: number): number {
  const x = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Build an SVG path `d` string for a terrain contour at a given elevation.
 *
 * The path is a smooth curve across peakCount control points, then drops
 * straight down to fill to the bottom of the viewBox.
 */
function buildTerrainPath(elevation: number, config: LayerConfig): string {
  const { peakCount, baselineY, maxAmplitude, baseRipple, seed } = config;
  const step = VB_W / (peakCount - 1);

  // Generate peak Y values
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i < peakCount; i++) {
    const x = i * step;
    // Per-peak variation: 0.5→1.0 range so no peak is completely absent
    const variation = 0.5 + 0.5 * pseudoRandom(i, seed);
    const amplitude = baseRipple + elevation * maxAmplitude * variation;
    const y = baselineY - amplitude;
    points.push({ x, y });
  }

  // Build smooth cubic bezier path through the points
  // Using Catmull-Rom → cubic bezier conversion for smooth curves
  let d = `M0 ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Catmull-Rom to cubic bezier control points
    const tension = 0.35;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  // Close the shape: drop to bottom-right, then bottom-left
  d += ` L${VB_W} ${VB_H} L0 ${VB_H} Z`;

  return d;
}

/**
 * Build a snow-cap path for the far layer peaks.
 * Small triangles at each peak when elevation > 0.4.
 */
function buildSnowCaps(elevation: number, config: LayerConfig): string | null {
  if (elevation < 0.4) return null;

  const { peakCount, baselineY, maxAmplitude, baseRipple, seed } = config;
  const step = VB_W / (peakCount - 1);
  let d = '';

  for (let i = 0; i < peakCount; i++) {
    const variation = 0.5 + 0.5 * pseudoRandom(i, seed);
    const amplitude = baseRipple + elevation * maxAmplitude * variation;
    const peakY = baselineY - amplitude;

    // Only draw caps on peaks that are high enough
    if (amplitude < maxAmplitude * 0.35) continue;

    const x = i * step;
    const capH = 20 + elevation * 25;
    const capW = 30 + elevation * 20;

    d += `M${x} ${peakY} L${x + capW / 2} ${peakY + capH} L${x - capW / 2} ${peakY + capH} Z `;
  }

  return d.trim() || null;
}

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

interface Props {
  /**
   * Current terrain elevation (0→1).
   * Interpolated between the current and next node's elevation
   * values by the parent based on scroll progress.
   */
  elevation: number;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function TerrainLine({ elevation }: Props) {
  // Clamp to 0→1
  const elev = Math.max(0, Math.min(1, elevation));

  // Memoize path strings — only recompute when elevation changes
  const farPath = useMemo(() => buildTerrainPath(elev, FAR_LAYER), [elev]);
  const midPath = useMemo(() => buildTerrainPath(elev, MID_LAYER), [elev]);
  const nearPath = useMemo(() => buildTerrainPath(elev, NEAR_LAYER), [elev]);
  const snowCaps = useMemo(() => buildSnowCaps(elev, FAR_LAYER), [elev]);

  return (
    <div className={styles.terrain} aria-hidden>
      {/* Far ridge */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        style={svgStyle}
        className={styles.layerFar}
      >
        <path
          d={farPath}
          fill="var(--color-silk)"
          opacity={FAR_LAYER.opacity}
        />
        {snowCaps && (
          <path
            d={snowCaps}
            fill="var(--color-silk)"
            opacity={0.30 + elev * 0.10}
          />
        )}
      </svg>

      {/* Mid hill */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        style={svgStyle}
        className={styles.layerMid}
      >
        <path
          d={midPath}
          fill="var(--color-silk)"
          opacity={MID_LAYER.opacity}
        />
      </svg>

      {/* Near ground */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        style={svgStyle}
        className={styles.layerNear}
      >
        <path
          d={nearPath}
          fill="var(--color-silk)"
          opacity={NEAR_LAYER.opacity}
        />
      </svg>
    </div>
  );
}
