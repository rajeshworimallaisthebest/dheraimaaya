/**
 * MemoryCard — Milestone Overlay Component
 * =========================================
 * Rendered when the journey "stops" at a milestone node.
 * Displays a grayscale photo, title, and body text from
 * the MemoryCard data in STORY_DATA.
 *
 * Animation is driven externally by the parent (JourneyStage)
 * using the `cardRef` — GSAP animates in the card, photo,
 * and prompt sequentially.
 */

import { forwardRef, useRef, useImperativeHandle } from 'react';
import { gsap } from '../lib/gsapSetup';
import type { MemoryCard as MemoryCardData } from '../data/STORY_DATA';
import styles from './MemoryCard.module.css';

// ──────────────────────────────────────────────
// Public imperative handle
// ──────────────────────────────────────────────

export interface MemoryCardHandle {
  /** Animate the card into view. Returns a GSAP timeline. */
  animateIn: () => gsap.core.Timeline;
  /** Animate the card out. Returns a GSAP timeline. */
  animateOut: () => gsap.core.Timeline;
}

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

interface Props {
  data: MemoryCardData;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

const MemoryCard = forwardRef<MemoryCardHandle, Props>(({ data }, ref) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLImageElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    animateIn() {
      // Kill any in-flight tweens on card elements to prevent races
      // when scrolling rapidly in/out of a milestone zone.
      const targets = [cardRef.current, photoRef.current, promptRef.current].filter(Boolean);
      targets.forEach((t) => gsap.killTweensOf(t));

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      // Card container — rise from bottom with scale
      tl.to(cardRef.current, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.9,
      });

      // Photo — fade in with slight scale (only if photo exists)
      if (photoRef.current) {
        tl.fromTo(
          photoRef.current,
          { opacity: 0, scale: 1.04 },
          { opacity: 1, scale: 1, duration: 0.8, ease: 'expo.out' },
          '-=0.4',
        );
      }

      // "Keep scrolling" prompt — delayed fade
      tl.to(
        promptRef.current,
        { opacity: 0.5, duration: 0.5 },
        '-=0.2',
      );

      return tl;
    },

    animateOut() {
      // Kill any in-flight tweens on card elements
      const targets = [cardRef.current, photoRef.current, promptRef.current].filter(Boolean);
      targets.forEach((t) => gsap.killTweensOf(t));

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      tl.to(promptRef.current, { opacity: 0, duration: 0.15 });
      if (photoRef.current) {
        tl.to(photoRef.current, { opacity: 0, duration: 0.2 }, '-=0.05');
      }
      tl.to(cardRef.current, { opacity: 0, y: 80, duration: 0.5 }, '-=0.1');

      // Reset transforms for next entrance
      tl.set(cardRef.current, { y: '100%', scale: 0.95 });

      return tl;
    },
  }));

  return (
    <div ref={cardRef} className={styles.card}>
      <div className={styles.photoFrame}>
        {data.photo ? (
          <img
            ref={photoRef}
            className={styles.photo}
            src={data.photo}
            alt={data.title}
            loading="lazy"
            draggable={false}
          />
        ) : (
          <svg
            className={styles.photoPlaceholder}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Simple mountain/landscape icon in ember */}
            <path
              d="M4 38L16 18L24 28L32 16L44 38H4Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="36" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        )}
      </div>
      <div className={styles.rule} />
      <h3 className={styles.title}>{data.title}</h3>
      <p className={styles.body}>{data.body}</p>
      <div ref={promptRef} className={styles.prompt}>
        keep scrolling
      </div>
    </div>
  );
});

MemoryCard.displayName = 'MemoryCard';

export default MemoryCard;
