/**
 * VehicleSwitcher — Dynamic Foreground Layer
 * ===========================================
 * Renders the correct vehicle frame (or walking vignette)
 * based on the active transport type and cross-fades
 * between them with GSAP.
 *
 * Transport → Visual:
 *   plane   → PlaneFrame SVG overlay
 *   car     → CarFrame SVG overlay
 *   walking → No frame; subtle camera-shake + radial vignette
 */

import { useRef, useEffect, useCallback } from 'react';
import { gsap } from '../lib/gsapSetup';
import type { Transport } from '../data/STORY_DATA';
import styles from './VehicleSwitcher.module.css';

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

interface Props {
  /** Current transport mode from the active journey node. */
  transport: Transport;
  /** Ref to the cockpit container — used for walking camera-shake. */
  cockpitRef: React.RefObject<HTMLDivElement | null>;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function VehicleSwitcher({ transport, cockpitRef }: Props) {
  const vignetteRef = useRef<HTMLDivElement>(null);
  const shakeTlRef = useRef<gsap.core.Timeline | null>(null);

  /**
   * Start a looping, organic camera-shake timeline.
   * Uses randomised x/y translation + tiny rotation
   * to simulate hand-held walking footage.
   */
  const startShake = useCallback(() => {
    if (!cockpitRef.current || shakeTlRef.current) return;

    const tl = gsap.timeline({ repeat: -1, yoyo: true });

    // 4-keyframe loop — irregular so it doesn't feel mechanical.
    // Intensity halved (Step 8) so the silhouette figure stays readable.
    tl.to(cockpitRef.current, {
      x: 0.75,
      y: -0.5,
      rotation: 0.075,
      duration: 0.9,
      ease: 'power4.out',
    })
      .to(cockpitRef.current, {
        x: -0.5,
        y: 0.75,
        rotation: -0.05,
        duration: 1.1,
        ease: 'power4.out',
      })
      .to(cockpitRef.current, {
        x: 0.4,
        y: -0.25,
        rotation: 0.04,
        duration: 0.8,
        ease: 'expo.out',
      })
      .to(cockpitRef.current, {
        x: -0.25,
        y: 0.4,
        rotation: -0.06,
        duration: 1.0,
        ease: 'power4.out',
      });

    shakeTlRef.current = tl;
  }, [cockpitRef]);

  /** Stop and clean up the shake timeline. */
  const stopShake = useCallback(() => {
    if (shakeTlRef.current) {
      shakeTlRef.current.kill();
      shakeTlRef.current = null;
    }
    if (cockpitRef.current) {
      gsap.to(cockpitRef.current, {
        x: 0,
        y: 0,
        rotation: 0,
        duration: 0.4,
        ease: 'power4.out',
      });
    }
  }, [cockpitRef]);

  // ── Cross-fade logic on transport change ──
  useEffect(() => {
    const dur = 0.5;
    const ease = 'expo.out';

    // Fade out vignette by default
    if (vignetteRef.current) {
      gsap.to(vignetteRef.current, { opacity: 0, duration: dur, ease });
    }

    // Stop motion effects before switching
    stopShake();

    // Walking mode — show vignette + start shake
    if (transport === 'walking') {
      if (vignetteRef.current) {
        gsap.to(vignetteRef.current, { opacity: 1, duration: dur, ease, delay: 0.1 });
      }
      startShake();
    }

    return () => {
      stopShake();
    };
  }, [transport, startShake, stopShake]);

  return (
    <div className={styles.switcher}>
      {/* Walking — radial vignette (no vehicle) */}
      <div ref={vignetteRef} className={styles.walkingVignette} />
    </div>
  );
}
