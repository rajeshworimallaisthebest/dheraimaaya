/**
 * HorizonStage — Act V: The Future Horizon
 * ==========================================
 * Full afterglow composition. Layers (bottom → top):
 *   1. HorizonSky        — live Topeka time-of-day gradient       (Step 6)
 *   2. GlobalFar + Mid   — static BiomeScenery horizon silhouettes (Step 7)
 *   3. CloudWisps        — slow atmospheric drift                  (Step 7)
 *   4. Final serif message — staggered entrance + breathing weight  (Steps 8–9)
 *
 * Audio (Step 10): optional ambient track fades in when isActive becomes
 * true for the first time. Leave `ambientSrc` undefined until an audio
 * file is placed in src/assets/audio and forwarded from ActV_Horizon.
 */

import { useRef, useEffect } from 'react';
import { gsap, useGSAP } from '../lib/gsapSetup';
import { useAudio } from '../hooks/useAudio';
import HorizonSky from './HorizonSky';
import CloudWisps from './CloudWisps';
import { GlobalFar, GlobalMid } from './BiomeScenery';
import styles from './HorizonStage.module.css';

// ── Props ────────────────────────────────────────────────────────────────────────────
interface Props {
  /** True when Act V is the primary viewport section. */
  isActive: boolean;
  /**
   * True once App’s ScrollSmoother has been created.
   * Horizon ScrollTrigger creation is gated on this flag.
   */
  smootherReady: boolean;
  /**
   * Optional: path to an ambient audio file for the afterglow.
   * No audio plays if omitted (safe default — folder is currently empty).
   * Example: '/audio/horizon_ambient.m4a'
   */
  ambientSrc?: string;
}

// ── Component ────────────────────────────────────────────────────────────────────────────
export default function HorizonStage({ isActive, smootherReady: _smootherReady, ambientSrc }: Props) {
  // Scope ref for useGSAP — limits selector queries & auto-cleanup
  const stageRef = useRef<HTMLDivElement>(null);

  // Per-line message refs for staggered entrance
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const line3Ref = useRef<HTMLSpanElement>(null);

  // Guard: entrance animation fires exactly once even if isActive toggles
  const hasEnteredRef = useRef(false);

  // Ref to the slow breathing tween — created outside the useGSAP scope
  // after the entrance completes, so it must be killed manually.
  const breathingTweenRef = useRef<gsap.core.Tween | null>(null);

  // ── Optional ambient audio (Step 10) ─────────────────────────────────────
  // Hook is always called unconditionally (React rules) but play() is gated
  // on ambientSrc being truthy, so no audio initialises when the prop is absent.
  const audio = useAudio({
    src: ambientSrc ?? '',
    targetVolume: 0.35,
    filterFrequency: 550, // low-pass warmth for an afterglow ambience
    loop: true,
  });

  // ── Entrance + breathing (Steps 8–9) ──────────────────────────────────────
  useGSAP(
    () => {
      if (!isActive || hasEnteredRef.current) return;
      hasEnteredRef.current = true;

      const lines = [line1Ref.current, line2Ref.current, line3Ref.current];

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      // Lines lift and unblur with an editorial stagger
      tl.fromTo(
        lines,
        { opacity: 0, filter: 'blur(5px)', y: 10 },
        {
          opacity: 1,
          filter: 'blur(0px)',
          y: 0,
          duration: 1.6,
          ease: 'expo.out',
          stagger: 0.22, // each line enters ~0.22 s after the previous
        },
        '-=0.4',
      );

      // Slow weight-breathing on the Newsreader variable axis.
      //    `fontWeight` maps directly to the 'wght' axis on variable fonts
      //    and is safely GSAP-interpolatable as a plain numeric CSS property.
      //    Each line shifts phase (stagger from center) for an organic pulse.
      //    Skipped entirely under prefers-reduced-motion.
      const prefersReducedMotion =
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!prefersReducedMotion) {
        tl.add(() => {
          breathingTweenRef.current = gsap.to(lines, {
            fontWeight: 480,
            duration: 55,
            ease: 'power4.out',
            yoyo: true,
            repeat: -1,
            repeatDelay: 10,
            stagger: { each: 4, from: 'center' },
          });
        }, '+=0.6');
      }

      // Start ambient audio on entry (no-op if ambientSrc is absent)
      if (ambientSrc) {
        tl.add(() => { audio.play(); }, 0.3);
      }
    },
    { scope: stageRef, dependencies: [isActive] },
  );

  // ── Kill breathing tween when Act V leaves view or on unmount ─────────────
  // useGSAP's scope auto-kills tweens created inside it, but the breathing
  // tween is created in a tl.add() callback after the scope has settled.
  // This explicit cleanup ensures no ghost animation runs in the background.
  useEffect(() => {
    if (!isActive) {
      breathingTweenRef.current?.pause();
    } else {
      breathingTweenRef.current?.resume();
    }
  }, [isActive]);

  useEffect(() => {
    return () => {
      breathingTweenRef.current?.kill();
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────────────────
  return (
    <div ref={stageRef} className={styles.stage} aria-label="Act V — The Future Horizon">

      {/* Layer 1: Live sky gradient — Topeka time-of-day, GSAP-interpolated */}
      <HorizonSky />

      {/* Layer 2: Static Global biome horizon silhouettes
           The SVGs are 300% wide (parallax origin). Act V keeps them
           stationary — the sceneryContainer clips to the viewport and
           a gentle opacity pull-back stops them competing with the sky. */}
      <div className={styles.sceneryContainer} aria-hidden="true">
        <GlobalFar />
        <GlobalMid />
      </div>

      {/* Layer 3: Slow atmospheric cloud drift
           No `transport` prop → defaults to car/walking mode → 20 s drift,
           long and imperceptible — exactly right for an afterglow. */}
      <div className={styles.atmosphereLayer} aria-hidden="true">
        <CloudWisps />
      </div>

       {/* Layer 4: Final closing message — three separately animatable lines.
           role="heading" aria-level="2" provides a landmark heading for
           screen readers without introducing unstyled heading markup. */}
      <p
        className={styles.message}
        role="heading"
        aria-level={2}
        aria-label="Closing message"
      >
        <span ref={line1Ref} className={styles.messageLine}>
          Different paths, same light.
        </span>
        <span ref={line2Ref} className={styles.messageLine}>
          Wherever the next chapter takes us,
        </span>
        <span ref={line3Ref} className={styles.messageLine}>
          the sky remains the same.
        </span>
      </p>

    </div>
  );
}
