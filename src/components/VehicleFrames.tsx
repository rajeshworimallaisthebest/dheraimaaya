/**
 * Vehicle Frame SVGs — Inline, Minimalist, Editorial
 * ===================================================
 * Resolution-independent vector frames for the cockpit foreground.
 * Uses the Resonance palette exclusively.
 *
 * - PlaneFrame  : Airplane window oval + seat headrest silhouette
 * - CarFrame    : Dashboard outline + rearview mirror + steering column
 * - (walking has no frame — handled via camera-shake in VehicleSwitcher)
 */

import type { CSSProperties } from 'react';

const svgStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  userSelect: 'none',
};

// ──────────────────────────────────────────────
// Airplane Window / Seat Frame
// ──────────────────────────────────────────────

export function PlaneFrame() {
  return (
    <svg
      viewBox="0 0 1920 1080"
      preserveAspectRatio="xMidYMid slice"
      style={svgStyle}
      aria-hidden="true"
    >
      {/* Cabin wall — solid dark panels left & right */}
      <rect x="0" y="0" width="560" height="1080" fill="var(--color-umber)" />
      <rect x="1360" y="0" width="560" height="1080" fill="var(--color-umber)" />

      {/* Window aperture — rounded rectangle cut-out */}
      <rect
        x="600"
        y="120"
        width="720"
        height="840"
        rx="180"
        ry="180"
        fill="none"
        stroke="var(--color-silk)"
        strokeWidth="2"
        opacity="0.25"
      />

      {/* Inner window bevel */}
      <rect
        x="620"
        y="140"
        width="680"
        height="800"
        rx="170"
        ry="170"
        fill="none"
        stroke="var(--color-ember)"
        strokeWidth="1"
        opacity="0.15"
      />

      {/* Window shade rail — thin horizontal line at top */}
      <line
        x1="640" y1="155"
        x2="1280" y2="155"
        stroke="var(--color-silk)"
        strokeWidth="1"
        opacity="0.12"
      />

      {/* Seat headrest silhouette — bottom */}
      <path
        d="M 720 1080 Q 720 920 820 880 L 1100 880 Q 1200 920 1200 1080 Z"
        fill="var(--color-umber)"
        opacity="0.9"
      />

      {/* Headrest top edge highlight */}
      <path
        d="M 820 880 Q 860 860 960 855 Q 1060 860 1100 880"
        fill="none"
        stroke="var(--color-silk)"
        strokeWidth="1"
        opacity="0.1"
      />

      {/* Subtle cabin texture — vertical rivet lines */}
      {[540, 555, 1365, 1380].map((x) => (
        <line
          key={x}
          x1={x} y1="0"
          x2={x} y2="1080"
          stroke="var(--color-silk)"
          strokeWidth="0.5"
          opacity="0.06"
        />
      ))}
    </svg>
  );
}

// ──────────────────────────────────────────────
// Car Dashboard / Interior Frame
// ──────────────────────────────────────────────

export function CarFrame() {
  return (
    <svg
      viewBox="0 0 1920 1080"
      preserveAspectRatio="xMidYMid slice"
      style={svgStyle}
      aria-hidden="true"
    >
      {/* Dashboard body — bottom panel */}
      <path
        d="M 0 780 Q 200 740 960 730 Q 1720 740 1920 780 L 1920 1080 L 0 1080 Z"
        fill="var(--color-umber)"
        opacity="0.95"
      />

      {/* Dashboard top edge highlight */}
      <path
        d="M 0 780 Q 200 740 960 730 Q 1720 740 1920 780"
        fill="none"
        stroke="var(--color-silk)"
        strokeWidth="1.5"
        opacity="0.15"
      />

      {/* Windshield pillars — A-pillars left & right */}
      <path
        d="M 0 0 L 180 0 L 120 780 L 0 780 Z"
        fill="var(--color-umber)"
        opacity="0.9"
      />
      <path
        d="M 1740 0 L 1920 0 L 1920 780 L 1800 780 Z"
        fill="var(--color-umber)"
        opacity="0.9"
      />

      {/* A-pillar inner edges */}
      <line
        x1="180" y1="0" x2="120" y2="780"
        stroke="var(--color-silk)"
        strokeWidth="1"
        opacity="0.1"
      />
      <line
        x1="1740" y1="0" x2="1800" y2="780"
        stroke="var(--color-silk)"
        strokeWidth="1"
        opacity="0.1"
      />

      {/* Rearview mirror */}
      <ellipse
        cx="960" cy="60"
        rx="100" ry="40"
        fill="var(--color-umber)"
        opacity="0.85"
      />
      <ellipse
        cx="960" cy="60"
        rx="100" ry="40"
        fill="none"
        stroke="var(--color-silk)"
        strokeWidth="1"
        opacity="0.12"
      />
      {/* Mirror stem */}
      <line
        x1="960" y1="100"
        x2="960" y2="0"
        stroke="var(--color-silk)"
        strokeWidth="1.5"
        opacity="0.1"
      />

      {/* Steering column — bottom center */}
      <ellipse
        cx="520" cy="920"
        rx="140" ry="130"
        fill="none"
        stroke="var(--color-silk)"
        strokeWidth="2"
        opacity="0.12"
      />
      {/* Steering wheel cross */}
      <line
        x1="380" y1="920" x2="660" y2="920"
        stroke="var(--color-silk)"
        strokeWidth="1.5"
        opacity="0.1"
      />
      <line
        x1="520" y1="790" x2="520" y2="1050"
        stroke="var(--color-silk)"
        strokeWidth="1.5"
        opacity="0.1"
      />

      {/* Instrument cluster glow — subtle ember */}
      <ellipse
        cx="520" cy="850"
        rx="60" ry="20"
        fill="var(--color-ember)"
        opacity="0.06"
      />

      {/* Dashboard texture — horizontal seam */}
      <line
        x1="0" y1="820" x2="1920" y2="818"
        stroke="var(--color-silk)"
        strokeWidth="0.5"
        opacity="0.06"
      />
    </svg>
  );
}
