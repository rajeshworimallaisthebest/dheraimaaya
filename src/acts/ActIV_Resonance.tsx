/**
 * Act IV — The Resonance (Letter)
 * ================================
 * Ink-in text reveal with focus-scroll blur and haptic heartbeat.
 * The most intimate act — a direct heart-to-heart rendered as a
 * scrolling letter.
 *
 * Ink-in:  GSAP SplitText splits each line into chars.
 *          A per-line ScrollTrigger staggers chars from 0→1 opacity
 *          as the line approaches viewport centre.
 *
 * Focus:   A single scroll-driven update loop sets opacity + blur
 *          based on each line's distance from the viewport midpoint.
 *          Centre = full clarity, edges = dim + blurred.
 */

import { useRef, useEffect, useCallback } from 'react';
import {
  gsap,
  ScrollTrigger,
  SplitText,
  useGSAP,
} from '../lib/gsapSetup';
import { letterFragments } from '../data/STORY_DATA';
import styles from './ActIV_Resonance.module.css';

interface Props {
  isActive: boolean;
  smootherReady: boolean;
}

export default function ActIVResonance({ isActive, smootherReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const splitsRef = useRef<InstanceType<typeof SplitText>[]>([]);

  /** Store a ref callback for each letter line */
  const setLineRef = useCallback(
    (el: HTMLParagraphElement | null, i: number) => {
      lineRefs.current[i] = el;
    },
    [],
  );

  // ── Ink-in + Focus-scroll (Steps 3 & 4) ──
  useGSAP(
    () => {
      if (!smootherReady || !containerRef.current) return;

      const lines = lineRefs.current.filter(Boolean) as HTMLParagraphElement[];
      if (lines.length === 0) return;

      // ── Step 3: SplitText + per-line scrubbed ink-in ──
      // Use 'words,chars' so word-wrappers keep characters together
      // and prevent mid-word line breaks.
      splitsRef.current = lines.map((line) =>
        SplitText.create(line, { type: 'words,chars' }),
      );

      // Each line gets its own scrubbed ScrollTrigger that reveals
      // chars as the line scrolls from the bottom of the viewport
      // toward the centre. With the line spacing (~18 vh each),
      // roughly 3-4 lines sit in the active reveal zone at once.
      splitsRef.current.forEach((split, i) => {
        const line = lines[i];

        // Set chars to invisible (CSS also does this, but GSAP
        // needs the starting value in its own data model).
        gsap.set(split.chars, { opacity: 0 });

        gsap.to(split.chars, {
          opacity: 1,
          stagger: { each: 0.03 },
          ease: 'power4.out',
          scrollTrigger: {
            trigger: line,
            start: 'top 88%',   // line enters bottom of viewport
            end: 'top 50%',     // line reaches centre — fully revealed
            scrub: 0.6,         // tight scrub for responsive feel
          },
        });
      });

      // ── Step 4: Focus-scroll — continuous opacity + blur ──
      // One master ScrollTrigger on the container drives per-frame
      // updates for every line based on distance from viewport centre.
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        onUpdate: () => {
          const viewMid = window.innerHeight / 2;

          lines.forEach((line) => {
            const rect = line.getBoundingClientRect();
            const lineMid = rect.top + rect.height / 2;
            // Normalised distance: 0 = dead centre, 1 = edge of viewport
            const dist = Math.min(Math.abs(lineMid - viewMid) / viewMid, 1);

            // Remap: centre → full brightness, edge → dim
            const opacity = gsap.utils.interpolate(1, 0.15, dist);
            const blur = gsap.utils.interpolate(0, 3, dist);

            line.style.opacity = String(opacity);
            line.style.filter = `blur(${blur}px)`;
          });
        },
      });
    },
    { dependencies: [smootherReady] },
  );

  // Clean up SplitText instances on unmount
  useEffect(() => {
    return () => {
      splitsRef.current.forEach((s) => s.revert());
      splitsRef.current = [];
    };
  }, []);

  return (
    <div
      className="act"
      style={{
        opacity: isActive ? 1 : 0.3,
        transition: 'opacity var(--duration-slow) ease',
      }}
      aria-label="Act IV — The Resonance"
    >
      <div ref={containerRef} className={styles.resonanceContainer}>
        <p className={`sans ${styles.actLabel}`}>[ Act IV — The Resonance ]</p>

        {letterFragments.map((frag, i) => (
          <p
            key={frag.id}
            ref={(el) => setLineRef(el, i)}
            className={styles.letterLine}
          >
            {frag.text}
          </p>
        ))}
      </div>
    </div>
  );
}
