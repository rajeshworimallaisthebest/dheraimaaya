/**
 * Biome Scenery SVGs — Multi-Layer Parallax Backdrops
 * ====================================================
 * Each biome exports 3 depth layers (far → mid → near)
 * for differential scroll-speed parallax.
 *
 * All use the Resonance palette at varying opacities
 * to create atmospheric depth without colour violations.
 *
 * Biomes:
 *   nepal    — Himalayan peaks, terraced hills, prayer-flag lines
 *   topeka   — Architectural blueprint outlines (Stoffer / Carnegie)
 *   colorado — Pine tree silhouettes, snow-capped peaks
 *   global   — Cloud layers, horizon line, subtle grid
 */

import type { CSSProperties } from 'react';

/** Layers are absolutely positioned and sized by the parent. */
const layerBase: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '300%',       // extra width for horizontal parallax sliding
  height: '100%',
  pointerEvents: 'none',
  userSelect: 'none',
};

// ════════════════════════════════════════════════
//  NEPAL — Himalayan Silhouettes
// ════════════════════════════════════════════════

export function NepalFar() {
  return (
    <svg viewBox="0 0 5760 1080" preserveAspectRatio="none" style={layerBase} aria-hidden>
      {/* Distant snow peaks — faint silk */}
      <path
        d="M0 850 L320 420 L580 650 L900 280 L1200 500 L1500 320 L1800 580 L2100 250 L2400 480 L2700 350 L3000 550 L3300 300 L3600 520 L3900 380 L4200 480 L4500 280 L4800 520 L5100 350 L5400 600 L5760 450 L5760 1080 L0 1080 Z"
        fill="var(--color-silk)"
        opacity="0.18"
      />
      {/* Snow caps — ember tint */}
      <path
        d="M900 280 L950 310 L860 310 Z M1500 320 L1550 345 L1460 345 Z M2100 250 L2155 280 L2055 280 Z M3300 300 L3350 330 L3260 330 Z M4500 280 L4555 310 L4455 310 Z"
        fill="var(--color-ember)"
        opacity="0.22"
      />
      {/* Ember-glow horizon band (Step 18) */}
      <rect x="0" y="820" width="5760" height="50" fill="var(--color-ember)" opacity="0.10" />
    </svg>
  );
}

export function NepalMid() {
  return (
    <svg viewBox="0 0 5760 1080" preserveAspectRatio="none" style={layerBase} aria-hidden>
      {/* Terraced mid-hills */}
      <path
        d="M0 780 L400 600 L800 720 L1200 550 L1600 680 L2000 520 L2400 650 L2800 580 L3200 700 L3600 560 L4000 680 L4400 600 L4800 720 L5200 580 L5760 660 L5760 1080 L0 1080 Z"
        fill="var(--color-silk)"
        opacity="0.25"
      />
      {/* Terrace lines */}
      {[640, 680, 720].map((y, i) => (
        <line
          key={i}
          x1="0" y1={y + i * 15}
          x2="5760" y2={y + i * 12}
          stroke="var(--color-silk)"
          strokeWidth="0.5"
          opacity="0.15"
        />
      ))}
      {/* Rhododendron tree clusters — foliage green (Step 15) */}
      {[
        { cx: 500, cy: 620, r: 40 },
        { cx: 560, cy: 630, r: 35 },
        { cx: 1100, cy: 570, r: 45 },
        { cx: 1160, cy: 580, r: 38 },
        { cx: 1900, cy: 540, r: 42 },
        { cx: 2700, cy: 600, r: 40 },
        { cx: 2760, cy: 610, r: 36 },
        { cx: 3500, cy: 580, r: 44 },
        { cx: 4300, cy: 620, r: 38 },
        { cx: 4360, cy: 630, r: 34 },
        { cx: 5100, cy: 600, r: 40 },
      ].map((t, i) => (
        <circle key={`rhodo-m-${i}`} cx={t.cx} cy={t.cy} r={t.r} fill="var(--color-foliage)" opacity="0.25" />
      ))}
    </svg>
  );
}

export function NepalNear() {
  return (
    <svg viewBox="0 0 5760 1080" preserveAspectRatio="none" style={layerBase} aria-hidden>
      {/* Foreground foothills */}
      <path
        d="M0 900 L300 780 L700 850 L1100 760 L1500 830 L1900 740 L2300 810 L2700 750 L3100 820 L3500 760 L3900 840 L4300 770 L4700 830 L5100 760 L5500 820 L5760 780 L5760 1080 L0 1080 Z"
        fill="var(--color-silk)"
        opacity="0.35"
      />
      {/* Rhododendron tree clusters — near layer (Step 15) */}
      {[
        { cx: 350, cy: 780, r: 50 },
        { cx: 420, cy: 790, r: 42 },
        { cx: 1000, cy: 770, r: 48 },
        { cx: 1070, cy: 780, r: 40 },
        { cx: 1800, cy: 750, r: 52 },
        { cx: 1870, cy: 760, r: 44 },
        { cx: 2600, cy: 760, r: 46 },
        { cx: 3400, cy: 770, r: 50 },
        { cx: 3470, cy: 780, r: 42 },
        { cx: 4200, cy: 780, r: 48 },
        { cx: 5000, cy: 770, r: 46 },
        { cx: 5070, cy: 780, r: 40 },
      ].map((t, i) => (
        <circle key={`rhodo-n-${i}`} cx={t.cx} cy={t.cy} r={t.r} fill="var(--color-foliage)" opacity="0.25" />
      ))}
      {/* Prayer-flag strings */}
      <path
        d="M600 750 Q750 720 900 740 Q1050 760 1200 730"
        fill="none"
        stroke="var(--color-ember)"
        strokeWidth="1"
        opacity="0.40"
      />
      <path
        d="M2800 720 Q2950 700 3100 715 Q3250 730 3400 705"
        fill="none"
        stroke="var(--color-ember)"
        strokeWidth="1"
        opacity="0.35"
      />
      {/* Tiny flag triangles along the strings */}
      {[630, 690, 750, 810, 870, 930, 1050, 1110, 1170].map((x, i) => (
        <polygon
          key={`f1-${i}`}
          points={`${x},${735 + (i % 3) * 4} ${x + 12},${735 + (i % 3) * 4} ${x + 6},${748 + (i % 3) * 4}`}
          fill="var(--color-ember)"
          opacity={0.28 + (i % 2) * 0.08}
        />
      ))}
    </svg>
  );
}

// ════════════════════════════════════════════════
//  TOPEKA — Architectural Blueprint Outlines
// ════════════════════════════════════════════════

export function TopekaFar() {
  return (
    <svg viewBox="0 0 5760 1080" preserveAspectRatio="none" style={layerBase} aria-hidden>
      {/* Distant campus treeline */}
      <path
        d="M0 700 Q400 660 800 680 Q1200 700 1600 670 Q2000 640 2400 660 Q2800 680 3200 650 Q3600 630 4000 660 Q4400 680 4800 660 Q5200 640 5760 670 L5760 1080 L0 1080 Z"
        fill="var(--color-silk)"
        opacity="0.15"
      />
      {/* Faint grid — blueprint baseline */}
      {Array.from({ length: 12 }, (_, i) => (
        <line
          key={`hg-${i}`}
          x1="0" y1={400 + i * 60}
          x2="5760" y2={400 + i * 60}
          stroke="var(--color-silk)"
          strokeWidth="0.3"
          opacity="0.12"
          strokeDasharray="8 16"
        />
      ))}
      {/* Ember-glow horizon band (Step 18) */}
      <rect x="0" y="670" width="5760" height="50" fill="var(--color-ember)" opacity="0.08" />
    </svg>
  );
}

export function TopekaMid() {
  return (
    <svg viewBox="0 0 5760 1080" preserveAspectRatio="none" style={layerBase} aria-hidden>
      {/* Stoffer Science Hall — blueprint outline */}
      <g opacity="0.35" stroke="var(--color-silk)" fill="none" strokeWidth="1.5">
        {/* Main block */}
        <rect x="400" y="480" width="360" height="280" />
        {/* Entrance portico */}
        <rect x="520" y="460" width="120" height="20" />
        <line x1="520" y1="460" x2="520" y2="480" />
        <line x1="640" y1="460" x2="640" y2="480" />
        {/* Windows (row of 5) */}
        {Array.from({ length: 5 }, (_, i) => (
          <rect key={`sw-${i}`} x={420 + i * 66} y="520" width="30" height="50" rx="2" />
        ))}
        {/* Label */}
        <text x="580" y="800" fill="var(--color-silk)" fontSize="14" fontFamily="var(--font-sans)" letterSpacing="0.08em" textAnchor="middle" opacity="0.8">
          STOFFER
        </text>
      </g>

      {/* Carnegie Hall — blueprint outline */}
      <g opacity="0.35" stroke="var(--color-silk)" fill="none" strokeWidth="1.5" transform="translate(2600, 0)">
        {/* Main block with pitched roof hint */}
        <rect x="0" y="440" width="420" height="320" />
        <polyline points="0,440 210,360 420,440" />
        {/* Tower element */}
        <rect x="180" y="320" width="60" height="120" />
        <polyline points="180,320 210,290 240,320" />
        {/* Windows (row of 6) */}
        {Array.from({ length: 6 }, (_, i) => (
          <rect key={`cw-${i}`} x={20 + i * 65} y="510" width="28" height="55" rx="2" />
        ))}
        {/* Label */}
        <text x="210" y="800" fill="var(--color-silk)" fontSize="14" fontFamily="var(--font-sans)" letterSpacing="0.08em" textAnchor="middle" opacity="0.8">
          CARNEGIE
        </text>
      </g>

      {/* Blueprint dimension lines */}
      <line x1="400" y1="780" x2="760" y2="780" stroke="var(--color-ember)" strokeWidth="0.5" opacity="0.28" strokeDasharray="4 4" />
      <line x1="2600" y1="780" x2="3020" y2="780" stroke="var(--color-ember)" strokeWidth="0.5" opacity="0.28" strokeDasharray="4 4" />
    </svg>
  );
}

export function TopekaNear() {
  return (
    <svg viewBox="0 0 5760 1080" preserveAspectRatio="none" style={layerBase} aria-hidden>
      {/* Rolling grassland ground (Step 19) */}
      <path
        d="M0 880 Q300 860 600 870 Q900 880 1200 865 Q1500 850 1800 862 Q2100 875 2400 858 Q2700 845 3000 860 Q3300 875 3600 855 Q3900 840 4200 858 Q4500 875 4800 860 Q5100 845 5400 862 L5760 855 L5760 1080 L0 1080 Z"
        fill="var(--color-foliage)"
        opacity="0.15"
      />

      {/* Short grass ticks across the grassland (Step 19) */}
      {Array.from({ length: 80 }, (_, i) => {
        const x = 30 + i * 72;
        const baseY = 870 + Math.sin(i * 0.7) * 10;
        return (
          <line
            key={`grass-${i}`}
            x1={x} y1={baseY}
            x2={x + (i % 2 === 0 ? 2 : -2)} y2={baseY - 8 - (i % 3) * 4}
            stroke="var(--color-foliage)"
            strokeWidth="1"
            opacity={0.18 + (i % 3) * 0.06}
          />
        );
      })}

      {/* Foreground sidewalk / path lines */}
      <line x1="0" y1="920" x2="5760" y2="920" stroke="var(--color-silk)" strokeWidth="1" opacity="0.28" />
      <line x1="0" y1="940" x2="5760" y2="940" stroke="var(--color-silk)" strokeWidth="0.5" opacity="0.18" />

      {/* Street lamp silhouettes */}
      {[800, 2200, 3600, 5000].map((x) => (
        <g key={x} opacity="0.35" stroke="var(--color-silk)" fill="none" strokeWidth="1.2">
          <line x1={x} y1="920" x2={x} y2="700" />
          <ellipse cx={x} cy="695" rx="18" ry="8" />
          {/* Lamp glow */}
          <circle cx={x} cy="695" r="4" fill="var(--color-ember)" opacity="0.40" />
        </g>
      ))}

      {/* Scattered leaf shapes */}
      {[500, 1400, 2900, 4100, 5300].map((x, i) => (
        <ellipse
          key={`leaf-${i}`}
          cx={x} cy={930 + (i % 2) * 8}
          rx="5" ry="3"
          fill="var(--color-ember)"
          opacity="0.22"
          transform={`rotate(${30 + i * 20} ${x} ${930 + (i % 2) * 8})`}
        />
      ))}
    </svg>
  );
}

// ════════════════════════════════════════════════
//  COLORADO — Pine Trees & Snow Peaks
// ════════════════════════════════════════════════

export function ColoradoFar() {
  return (
    <svg viewBox="0 0 5760 1080" preserveAspectRatio="none" style={layerBase} aria-hidden>
      {/* Distant snow-capped ridgeline */}
      <path
        d="M0 600 L480 320 L960 500 L1440 260 L1920 420 L2400 300 L2880 480 L3360 240 L3840 400 L4320 320 L4800 460 L5280 280 L5760 420 L5760 1080 L0 1080 Z"
        fill="var(--color-silk)"
        opacity="0.20"
      />
      {/* Snow caps */}
      <path
        d="M480 320 L530 360 L440 360 Z M1440 260 L1500 300 L1390 300 Z M2400 300 L2455 340 L2350 340 Z M3360 240 L3420 280 L3310 280 Z M5280 280 L5335 320 L5230 320 Z"
        fill="var(--color-silk)"
        opacity="0.35"
      />
      {/* Ember-glow horizon band (Step 18) */}
      <rect x="0" y="570" width="5760" height="50" fill="var(--color-ember)" opacity="0.12" />
    </svg>
  );
}

export function ColoradoMid() {
  return (
    <svg viewBox="0 0 5760 1080" preserveAspectRatio="none" style={layerBase} aria-hidden>
      {/* Mid-ground pine forest — triangular tree silhouettes (Step 15: foliage green) */}
      {Array.from({ length: 40 }, (_, i) => {
        const x = 70 + i * 142;
        const h = 100 + (i % 5) * 30;
        const baseY = 680 - (i % 3) * 15;
        return (
          <polygon
            key={`pine-m-${i}`}
            points={`${x},${baseY} ${x + 20},${baseY - h} ${x + 40},${baseY}`}
            fill="var(--color-foliage)"
            opacity={0.22 + (i % 3) * 0.04}
          />
        );
      })}
    </svg>
  );
}

export function ColoradoNear() {
  return (
    <svg viewBox="0 0 5760 1080" preserveAspectRatio="none" style={layerBase} aria-hidden>
      {/* Foreground larger pines (Step 15: foliage green canopies) */}
      {Array.from({ length: 20 }, (_, i) => {
        const x = 50 + i * 290;
        const h = 200 + (i % 4) * 50;
        const baseY = 880 - (i % 2) * 20;
        return (
          <g key={`pine-n-${i}`} opacity={0.35 + (i % 3) * 0.05}>
            {/* Trunk */}
            <line
              x1={x + 30} y1={baseY}
              x2={x + 30} y2={baseY + 80}
              stroke="var(--color-silk)"
              strokeWidth="3"
              opacity="0.28"
            />
            {/* Canopy — 3 stacked triangles (foliage green) */}
            <polygon
              points={`${x},${baseY} ${x + 30},${baseY - h} ${x + 60},${baseY}`}
              fill="var(--color-foliage)"
            />
            <polygon
              points={`${x + 8},${baseY - h * 0.35} ${x + 30},${baseY - h - 30} ${x + 52},${baseY - h * 0.35}`}
              fill="var(--color-foliage)"
              opacity="0.8"
            />
          </g>
        );
      })}

      {/* Ground snow drift */}
      <path
        d="M0 950 Q300 920 600 940 Q900 960 1200 935 Q1500 910 1800 930 Q2100 950 2400 925 Q2700 905 3000 925 Q3300 945 3600 920 Q3900 900 4200 920 Q4500 940 4800 915 Q5100 895 5400 920 L5760 910 L5760 1080 L0 1080 Z"
        fill="var(--color-silk)"
        opacity="0.22"
      />
    </svg>
  );
}

// ════════════════════════════════════════════════
//  GLOBAL — Clouds & Horizon
// ════════════════════════════════════════════════

export function GlobalFar() {
  return (
    <svg viewBox="0 0 5760 1080" preserveAspectRatio="none" style={layerBase} aria-hidden>
      {/* High wispy clouds */}
      {[
        { cx: 600, cy: 180, rx: 240, ry: 30 },
        { cx: 1500, cy: 140, rx: 300, ry: 25 },
        { cx: 2800, cy: 200, rx: 200, ry: 35 },
        { cx: 4000, cy: 160, rx: 280, ry: 28 },
        { cx: 5200, cy: 190, rx: 220, ry: 32 },
      ].map((c, i) => (
        <ellipse
          key={`cf-${i}`}
          cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry}
          fill="var(--color-silk)"
          opacity={0.15 + (i % 2) * 0.04}
        />
      ))}

      {/* Horizon line */}
      <line
        x1="0" y1="720"
        x2="5760" y2="720"
        stroke="var(--color-silk)"
        strokeWidth="0.5"
        opacity="0.22"
      />
      {/* Ember-glow horizon band (Step 18) */}
      <rect x="0" y="695" width="5760" height="50" fill="var(--color-ember)" opacity="0.10" />
    </svg>
  );
}

export function GlobalMid() {
  return (
    <svg viewBox="0 0 5760 1080" preserveAspectRatio="none" style={layerBase} aria-hidden>
      {/* Mid-altitude cumulus */}
      {[
        { cx: 400, cy: 350, rx: 180, ry: 50 },
        { cx: 1200, cy: 400, rx: 220, ry: 45 },
        { cx: 2200, cy: 320, rx: 200, ry: 55 },
        { cx: 3400, cy: 380, rx: 250, ry: 48 },
        { cx: 4600, cy: 340, rx: 190, ry: 52 },
      ].map((c, i) => (
        <g key={`cm-${i}`}>
          <ellipse cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry} fill="var(--color-silk)" opacity="0.18" />
          <ellipse cx={c.cx - c.rx * 0.4} cy={c.cy + 10} rx={c.rx * 0.6} ry={c.ry * 0.7} fill="var(--color-silk)" opacity="0.15" />
        </g>
      ))}
    </svg>
  );
}

export function GlobalNear() {
  return (
    <svg viewBox="0 0 5760 1080" preserveAspectRatio="none" style={layerBase} aria-hidden>
      {/* Low cloud / fog bank */}
      <path
        d="M0 820 Q400 780 800 810 Q1200 840 1600 800 Q2000 760 2400 790 Q2800 820 3200 785 Q3600 750 4000 780 Q4400 810 4800 775 Q5200 740 5760 770 L5760 900 Q5200 860 4800 880 Q4400 900 4000 870 Q3600 840 3200 870 Q2800 900 2400 875 Q2000 850 1600 880 Q1200 910 800 890 Q400 870 0 900 Z"
        fill="var(--color-silk)"
        opacity="0.20"
      />

      {/* Subtle ember glow on horizon */}
      <rect x="0" y="700" width="5760" height="60" fill="var(--color-ember)" opacity="0.15" />
    </svg>
  );
}
