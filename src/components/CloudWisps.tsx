/**
 * CloudWisps — Floating Atmospheric Clouds
 * =========================================
 * 3–5 small elliptical SVG clouds floating across the
 * top 30% of the viewport in all biomes.
 *
 * Coloured with `--color-sky-tint` at low opacity (0.10–0.18).
 * Slow horizontal drift (~20s repeating GSAP tween).
 * Plane mode speeds them up (~10s) for a heightened sense
 * of velocity.
 */

import { useRef, useEffect } from 'react';
import { gsap } from '../lib/gsapSetup';
import type { Transport } from '../data/STORY_DATA';
import styles from './CloudWisps.module.css';

// ──────────────────────────────────────────────
// Cloud definitions
// ──────────────────────────────────────────────

interface CloudDef {
  /** Starting x offset as % of container width */
  startX: number;
  /** Vertical position as % of container height (top 30%) */
  y: number;
  /** Horizontal radius of the main ellipse */
  rx: number;
  /** Vertical radius */
  ry: number;
  /** Opacity (0.10 – 0.18) */
  opacity: number;
}

const CLOUDS: CloudDef[] = [
  { startX: 5,  y: 6,  rx: 80, ry: 14, opacity: 0.12 },
  { startX: 25, y: 14, rx: 60, ry: 10, opacity: 0.16 },
  { startX: 50, y: 8,  rx: 90, ry: 16, opacity: 0.10 },
  { startX: 70, y: 20, rx: 70, ry: 12, opacity: 0.18 },
  { startX: 90, y: 12, rx: 65, ry: 11, opacity: 0.14 },
];

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

interface Props {
  transport?: Transport;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function CloudWisps({ transport }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tweenRefs = useRef<gsap.core.Tween[]>([]);

  useEffect(() => {
    if (!svgRef.current) return;
    const groups = svgRef.current.querySelectorAll<SVGGElement>('[data-cloud]');
    const isPlane = transport === 'plane';
    const duration = isPlane ? 10 : 20;

    // Kill any existing tweens
    tweenRefs.current.forEach((tw) => tw.kill());
    tweenRefs.current = [];

    groups.forEach((g, i) => {
      const cloud = CLOUDS[i];
      // Reset to start position
      gsap.set(g, { x: 0 });

      const tw = gsap.to(g, {
        x: `+=${cloud.rx * 8}`,   // drift rightward
        duration: duration + i * 2,  // slight variation per cloud
        ease: 'none',
        repeat: -1,
        yoyo: true,
      });

      tweenRefs.current.push(tw);
    });

    return () => {
      tweenRefs.current.forEach((tw) => tw.kill());
      tweenRefs.current = [];
    };
  }, [transport]);

  return (
    <div className={styles.container}>
      <svg
        ref={svgRef}
        viewBox="0 0 1000 300"
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '30%',
          pointerEvents: 'none',
        }}
        aria-hidden
      >
        {CLOUDS.map((c, i) => (
          <g key={i} data-cloud>
            {/* Main body */}
            <ellipse
              cx={c.startX * 10}
              cy={c.y * 10}
              rx={c.rx}
              ry={c.ry}
              fill="var(--color-sky-tint)"
              opacity={c.opacity}
            />
            {/* Secondary lobe for organic shape */}
            <ellipse
              cx={c.startX * 10 - c.rx * 0.35}
              cy={c.y * 10 + 4}
              rx={c.rx * 0.55}
              ry={c.ry * 0.7}
              fill="var(--color-sky-tint)"
              opacity={c.opacity * 0.8}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
