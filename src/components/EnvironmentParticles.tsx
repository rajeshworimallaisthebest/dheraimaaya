/**
 * EnvironmentParticles — Atmospheric Biome Particles
 * ===================================================
 * Subtle particle effects per biome for environmental mood:
 *   - Nepal: faint snow/dust drifting down (4–6 circles)
 *   - Topeka: occasional leaf particles drifting horizontally
 *   - Colorado: slow snowflakes
 *   - Global: nothing (clean sky)
 *
 * Animated on repeating GSAP timelines, culled when biome
 * is inactive. Each particle is a small SVG <circle> or
 * <ellipse>.
 */

import { useRef, useEffect } from 'react';
import { gsap } from '../lib/gsapSetup';
import type { Biome } from '../data/STORY_DATA';
import styles from './EnvironmentParticles.module.css';

// ──────────────────────────────────────────────
// Particle definitions per biome
// ──────────────────────────────────────────────

interface ParticleDef {
  /** Starting x as % of viewport width */
  x: number;
  /** Starting y as % of viewport height */
  y: number;
  /** Radius in px */
  r: number;
  /** CSS colour */
  fill: string;
  /** Base opacity */
  opacity: number;
  /** Drift direction: 'down' | 'horizontal' */
  drift: 'down' | 'horizontal';
  /** Duration of one cycle in seconds */
  duration: number;
}

const BIOME_PARTICLES: Record<Biome, ParticleDef[]> = {
  nepal: [
    { x: 12, y: 5,  r: 2,   fill: 'var(--color-snow)',  opacity: 0.20, drift: 'down', duration: 8 },
    { x: 28, y: 10, r: 1.5, fill: 'var(--color-snow)',  opacity: 0.15, drift: 'down', duration: 10 },
    { x: 45, y: 3,  r: 2.5, fill: 'var(--color-snow)',  opacity: 0.18, drift: 'down', duration: 9 },
    { x: 62, y: 8,  r: 1.8, fill: 'var(--color-snow)',  opacity: 0.22, drift: 'down', duration: 11 },
    { x: 78, y: 2,  r: 2,   fill: 'var(--color-snow)',  opacity: 0.16, drift: 'down', duration: 7 },
    { x: 90, y: 12, r: 1.5, fill: 'var(--color-snow)',  opacity: 0.14, drift: 'down', duration: 12 },
  ],
  topeka: [
    { x: 20, y: 30, r: 3, fill: 'var(--color-ember)', opacity: 0.18, drift: 'horizontal', duration: 14 },
    { x: 50, y: 45, r: 2, fill: 'var(--color-ember)', opacity: 0.14, drift: 'horizontal', duration: 18 },
    { x: 75, y: 35, r: 2.5, fill: 'var(--color-ember)', opacity: 0.16, drift: 'horizontal', duration: 16 },
  ],
  colorado: [
    { x: 10, y: 5,  r: 2.5, fill: 'var(--color-snow)', opacity: 0.22, drift: 'down', duration: 12 },
    { x: 30, y: 8,  r: 2,   fill: 'var(--color-snow)', opacity: 0.18, drift: 'down', duration: 14 },
    { x: 55, y: 3,  r: 3,   fill: 'var(--color-snow)', opacity: 0.20, drift: 'down', duration: 10 },
    { x: 72, y: 10, r: 2,   fill: 'var(--color-snow)', opacity: 0.16, drift: 'down', duration: 16 },
    { x: 88, y: 6,  r: 2.5, fill: 'var(--color-snow)', opacity: 0.19, drift: 'down', duration: 13 },
  ],
  global: [],   // clean sky — no particles
};

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

interface Props {
  biome: Biome;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function EnvironmentParticles({ biome }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tweensRef = useRef<gsap.core.Tween[]>([]);

  useEffect(() => {
    // Kill previous tweens
    tweensRef.current.forEach((tw) => tw.kill());
    tweensRef.current = [];

    if (!containerRef.current) return;

    const particles = containerRef.current.querySelectorAll<SVGCircleElement>('[data-particle]');
    const defs = BIOME_PARTICLES[biome];

    particles.forEach((el, i) => {
      if (i >= defs.length) return;
      const def = defs[i];

      // Reset position
      gsap.set(el, { x: 0, y: 0, opacity: def.opacity });

      if (def.drift === 'down') {
        // Drift downward + slight horizontal sway
        const tw = gsap.to(el, {
          y: '+=80vh',
          x: `+=${15 * (i % 2 === 0 ? 1 : -1)}vw`,
          opacity: 0,
          duration: def.duration,
          ease: 'none',
          repeat: -1,
          delay: i * 1.5,   // stagger start
        });
        tweensRef.current.push(tw);
      } else {
        // Drift horizontally (leaves)
        const tw = gsap.to(el, {
          x: '+=30vw',
          y: `+=${8 + i * 3}vh`,
          rotation: 360,
          opacity: 0,
          duration: def.duration,
          ease: 'none',
          repeat: -1,
          delay: i * 3,
        });
        tweensRef.current.push(tw);
      }
    });

    return () => {
      tweensRef.current.forEach((tw) => tw.kill());
      tweensRef.current = [];
    };
  }, [biome]);

  const defs = BIOME_PARTICLES[biome];

  // Don't render anything for global (clean sky)
  if (defs.length === 0) return null;

  return (
    <div ref={containerRef} className={styles.container}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
        }}
        aria-hidden
      >
        {defs.map((def, i) => (
          <circle
            key={`${biome}-p-${i}`}
            data-particle
            cx={def.x}
            cy={def.y}
            r={def.r}
            fill={def.fill}
            opacity={def.opacity}
          />
        ))}
      </svg>
    </div>
  );
}
