/**
 * VehicleSilhouette — Third-Person Scene Vehicles
 * =================================================
 * Renders small, editorial side-view SVG silhouettes positioned
 * inside the parallax world:
 *
 *   plane   → small aircraft in the upper third of the viewport,
 *             with slow horizontal drift, subtle vertical bobbing,
 *             and a faint dashed trail line.
 *   car     → sedan on the ground line, horizontally centred
 *   walking → human figure on the ground line
 *
 * Palette: var(--color-silk) silhouettes on the umber backdrop.
 */

import { useRef, useEffect, useCallback } from 'react';
import { gsap } from '../lib/gsapSetup';
import type { Transport } from '../data/STORY_DATA';
import styles from './VehicleSilhouette.module.css';

// ──────────────────────────────────────────────
// SVG Silhouettes (side-view, minimalist)
// ──────────────────────────────────────────────

/**
 * Small aircraft — viewed from the side.
 * ~120×40 intrinsic size, rendered in --color-silk.
 */
function PlaneSVG() {
  return (
    <svg
      width="120"
      height="40"
      viewBox="0 0 120 40"
      fill="none"
      aria-hidden="true"
    >
      {/* Fuselage */}
      <path
        d="M4 20 Q4 14 14 13 L90 11 Q100 10 108 14 L116 18 Q118 20 116 22 L108 26 Q100 30 90 29 L14 27 Q4 26 4 20 Z"
        fill="var(--color-silk)"
        opacity="0.55"
      />
      {/* Wing */}
      <path
        d="M42 13 L58 2 Q60 1 62 2 L62 13"
        fill="var(--color-silk)"
        opacity="0.40"
      />
      {/* Tail fin */}
      <path
        d="M12 13 L6 4 Q5 2 7 2 L16 8 L16 13"
        fill="var(--color-silk)"
        opacity="0.40"
      />
      {/* Tail horizontal stabilizer */}
      <path
        d="M10 18 L4 15 Q2 14 4 13 L18 16"
        fill="var(--color-silk)"
        opacity="0.30"
      />
      {/* Engine nacelle */}
      <ellipse
        cx="56"
        cy="29"
        rx="7"
        ry="4"
        fill="var(--color-silk)"
        opacity="0.35"
      />
      {/* Cockpit window — ember accent */}
      <ellipse
        cx="100"
        cy="19"
        rx="5"
        ry="3.5"
        fill="var(--color-ember)"
        opacity="0.25"
      />
    </svg>
  );
}

/**
 * Sedan / small car — viewed from the side.
 * ~90×36 intrinsic size.
 *
 * Wheel hub circles have class names so GSAP can target them
 * for rotation animation (Step 7).
 */
function CarSVG() {
  return (
    <svg
      width="90"
      height="36"
      viewBox="0 0 90 36"
      fill="none"
      aria-hidden="true"
    >
      {/* Body */}
      <path
        d="M8 24 Q4 24 4 20 L4 18 Q4 16 8 16 L24 16 L30 8 Q32 6 36 6 L60 6 Q64 6 66 8 L72 16 L82 16 Q86 16 86 20 L86 24 Q86 26 82 26 L8 26 Q4 26 4 24 Z"
        fill="var(--color-silk)"
        opacity="0.55"
      />
      {/* Windshield */}
      <path
        d="M32 16 L36 8 Q37 7 40 7 L56 7 Q59 7 60 8 L64 16 Z"
        fill="var(--color-ember)"
        opacity="0.15"
      />
      {/* Window divider */}
      <line
        x1="48" y1="7"
        x2="48" y2="16"
        stroke="var(--color-silk)"
        strokeWidth="0.8"
        opacity="0.25"
      />
      {/* Front wheel */}
      <circle cx="22" cy="28" r="6" fill="var(--color-umber)" opacity="0.9" />
      <circle cx="22" cy="28" r="6" fill="none" stroke="var(--color-silk)" strokeWidth="1" opacity="0.4" />
      <g className="car-wheel-front" style={{ transformOrigin: '22px 28px' }}>
        <line x1="22" y1="23" x2="22" y2="33" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.25" />
        <line x1="17" y1="28" x2="27" y2="28" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.25" />
      </g>
      {/* Rear wheel */}
      <circle cx="68" cy="28" r="6" fill="var(--color-umber)" opacity="0.9" />
      <circle cx="68" cy="28" r="6" fill="none" stroke="var(--color-silk)" strokeWidth="1" opacity="0.4" />
      <g className="car-wheel-rear" style={{ transformOrigin: '68px 28px' }}>
        <line x1="68" y1="23" x2="68" y2="33" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.25" />
        <line x1="63" y1="28" x2="73" y2="28" stroke="var(--color-silk)" strokeWidth="0.6" opacity="0.25" />
      </g>
      {/* Headlight accent */}
      <circle cx="84" cy="20" r="1.5" fill="var(--color-ember)" opacity="0.30" />
    </svg>
  );
}

/**
 * Dust particles — 3 small circles that trail behind the car.
 * Each particle drifts left and fades out on a repeating GSAP timeline.
 */
function DustParticles() {
  return (
    <svg
      width="40"
      height="20"
      viewBox="0 0 40 20"
      fill="none"
      aria-hidden="true"
      className="car-dust-svg"
    >
      <circle className="car-dust-0" cx="8" cy="10" r="2" fill="var(--color-silk)" opacity="0" />
      <circle className="car-dust-1" cx="18" cy="14" r="1.5" fill="var(--color-silk)" opacity="0" />
      <circle className="car-dust-2" cx="30" cy="8" r="1.8" fill="var(--color-silk)" opacity="0" />
    </svg>
  );
}

/**
 * Walking figure — viewed from the side, mid-stride.
 * ~28×56 intrinsic size.
 */
function WalkerSVG() {
  return (
    <svg
      width="28"
      height="56"
      viewBox="0 0 28 56"
      fill="none"
      aria-hidden="true"
    >
      {/* Head */}
      <circle cx="14" cy="6" r="4.5" fill="var(--color-silk)" opacity="0.50" />
      {/* Torso */}
      <line
        x1="14" y1="10"
        x2="14" y2="30"
        stroke="var(--color-silk)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.50"
      />
      {/* Left arm (swinging back) */}
      <line
        x1="14" y1="14"
        x2="8" y2="26"
        stroke="var(--color-silk)"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.40"
      />
      {/* Right arm (swinging forward) */}
      <line
        x1="14" y1="14"
        x2="20" y2="24"
        stroke="var(--color-silk)"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.40"
      />
      {/* Left leg (forward stride) */}
      <line
        x1="14" y1="30"
        x2="8" y2="48"
        stroke="var(--color-silk)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.50"
      />
      {/* Left foot */}
      <line
        x1="8" y1="48"
        x2="5" y2="52"
        stroke="var(--color-silk)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.40"
      />
      {/* Right leg (back stride) */}
      <line
        x1="14" y1="30"
        x2="20" y2="46"
        stroke="var(--color-silk)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.50"
      />
      {/* Right foot */}
      <line
        x1="20" y1="46"
        x2="24" y2="50"
        stroke="var(--color-silk)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.40"
      />
      {/* Subtle shadow — ember ground dot */}
      <ellipse
        cx="14"
        cy="54"
        rx="8"
        ry="2"
        fill="var(--color-ember)"
        opacity="0.10"
      />
    </svg>
  );
}

// ──────────────────────────────────────────────
// Plane Trail — dashed line behind the aircraft
// ──────────────────────────────────────────────

/**
 * Faint dashed trail that streams behind the plane.
 * Animated via GSAP strokeDashoffset to create a
 * flowing motion effect.
 */
function PlaneTrail() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 800 40"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
      className={styles.trailSvg}
    >
      <line
        x1="0" y1="20"
        x2="800" y2="20"
        stroke="var(--color-silk)"
        strokeWidth="0.8"
        strokeDasharray="6 12"
        opacity="0.18"
        className={styles.trailDash}
      />
    </svg>
  );
}

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

interface Props {
  /** Active transport mode — determines which silhouette to show. */
  transport: Transport;
  /**
   * Interpolated terrain elevation (0→1).
   * Used to position ground-level vehicles relative to terrain.
   */
  elevation: number;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

/**
 * Map elevation (0→1) to a CSS bottom offset for ground-level vehicles.
 * At elevation 0 (flat plains) the car sits at ~18% from bottom.
 * At elevation 1 (mountain peaks) the near-ground terrain rises,
 * so the car sits higher — up to ~30% from bottom.
 */
function elevationToBottom(elevation: number): number {
  const BASE_BOTTOM = 18;    // % at elevation 0
  const MAX_LIFT    = 12;    // extra % at elevation 1
  return BASE_BOTTOM + elevation * MAX_LIFT;
}

export default function VehicleSilhouette({ transport, elevation }: Props) {
  const planeRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<HTMLDivElement>(null);
  const walkerRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const dustRef = useRef<HTMLDivElement>(null);

  // Persistent GSAP timelines for plane animation
  const driftTlRef = useRef<gsap.core.Timeline | null>(null);
  const bobTlRef = useRef<gsap.core.Timeline | null>(null);
  const trailTlRef = useRef<gsap.core.Tween | null>(null);

  // Persistent GSAP timelines for car animation
  const wheelTlRef = useRef<gsap.core.Timeline | null>(null);
  const dustTlRef = useRef<gsap.core.Timeline | null>(null);

  // Persistent GSAP timeline for walker animation
  const walkBobTlRef = useRef<gsap.core.Timeline | null>(null);

  // Track previous transport for directional transitions
  const prevTransportRef = useRef<Transport>(transport);

  // ── Plane: horizontal drift ──
  // Slow, continuous left-to-right sweep that resets.
  const startPlaneDrift = useCallback(() => {
    if (!planeRef.current || driftTlRef.current) return;

    const tl = gsap.timeline({ repeat: -1 });

    // Drift from slight left offset to slight right, then snap back
    tl.fromTo(
      planeRef.current,
      { x: -60 },
      {
        x: 60,
        duration: 18,
        ease: 'power4.out',
      },
    ).to(planeRef.current, {
      x: -60,
      duration: 18,
      ease: 'power4.out',
    });

    driftTlRef.current = tl;
  }, []);

  const stopPlaneDrift = useCallback(() => {
    if (driftTlRef.current) {
      driftTlRef.current.kill();
      driftTlRef.current = null;
    }
    if (planeRef.current) {
      gsap.to(planeRef.current, { x: 0, duration: 0.5, ease: 'power4.out' });
    }
  }, []);

  // ── Plane: vertical bobbing ──
  // Subtle ±3px oscillation simulating atmospheric turbulence.
  const startPlaneBob = useCallback(() => {
    if (!planeRef.current || bobTlRef.current) return;

    const tl = gsap.timeline({ repeat: -1, yoyo: true });

    tl.to(planeRef.current, {
      y: -3,
      duration: 2,
      ease: 'power4.out',
    }).to(planeRef.current, {
      y: 3,
      duration: 2,
      ease: 'power4.out',
    });

    bobTlRef.current = tl;
  }, []);

  const stopPlaneBob = useCallback(() => {
    if (bobTlRef.current) {
      bobTlRef.current.kill();
      bobTlRef.current = null;
    }
    if (planeRef.current) {
      gsap.to(planeRef.current, { y: 0, duration: 0.4, ease: 'power4.out' });
    }
  }, []);

  // ── Plane: dashed trail strokeDashoffset animation ──
  const startTrailAnimation = useCallback(() => {
    if (!trailRef.current) return;

    const dashEl = trailRef.current.querySelector(`.${styles.trailDash}`) as SVGLineElement | null;
    if (!dashEl || trailTlRef.current) return;

    trailTlRef.current = gsap.to(dashEl, {
      strokeDashoffset: -36,    // advances by 2 full dash+gap cycles
      duration: 1.5,
      ease: 'none',             // linear flow for continuous feel
      repeat: -1,
    });
  }, []);

  const stopTrailAnimation = useCallback(() => {
    if (trailTlRef.current) {
      trailTlRef.current.kill();
      trailTlRef.current = null;
    }
  }, []);

  // ── Car: wheel rotation ──
  // Subtle cross-spoke rotation on both wheels.
  const startWheelRotation = useCallback(() => {
    if (!carRef.current || wheelTlRef.current) return;

    const frontWheel = carRef.current.querySelector('.car-wheel-front');
    const rearWheel = carRef.current.querySelector('.car-wheel-rear');
    if (!frontWheel && !rearWheel) return;

    const tl = gsap.timeline({ repeat: -1 });
    const targets = [frontWheel, rearWheel].filter(Boolean);

    tl.to(targets, {
      rotation: 360,
      duration: 2.5,
      ease: 'none',    // constant spin, not eased
    });

    wheelTlRef.current = tl;
  }, []);

  const stopWheelRotation = useCallback(() => {
    if (wheelTlRef.current) {
      wheelTlRef.current.kill();
      wheelTlRef.current = null;
    }
  }, []);

  // ── Car: dust particles ──
  // 3 circles stagger-animate: appear, drift left, fade out.
  const startDustParticles = useCallback(() => {
    if (!dustRef.current || dustTlRef.current) return;

    const dots = [
      dustRef.current.querySelector('.car-dust-0'),
      dustRef.current.querySelector('.car-dust-1'),
      dustRef.current.querySelector('.car-dust-2'),
    ].filter(Boolean) as SVGCircleElement[];

    if (dots.length === 0) return;

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.3 });

    dots.forEach((dot, i) => {
      const delay = i * 0.4;
      tl.fromTo(
        dot,
        { opacity: 0.22, x: 0, y: 0 },
        {
          opacity: 0,
          x: -(12 + i * 6),
          y: -(2 + i * 2),
          duration: 1.2,
          ease: 'power4.out',
        },
        delay,
      );
    });

    dustTlRef.current = tl;
  }, []);

  const stopDustParticles = useCallback(() => {
    if (dustTlRef.current) {
      dustTlRef.current.kill();
      dustTlRef.current = null;
    }
  }, []);

  // ── Walker: vertical bobbing at walking cadence ──
  // ~2Hz oscillation (±2px) to simulate the up-down of each footstep.
  const startWalkBob = useCallback(() => {
    if (!walkerRef.current || walkBobTlRef.current) return;

    const tl = gsap.timeline({ repeat: -1, yoyo: true });

    // Each half-step takes ~0.25s (≈2Hz full cycle = 0.5s)
    tl.to(walkerRef.current, {
      y: -2,
      duration: 0.25,
      ease: 'power4.out',
    }).to(walkerRef.current, {
      y: 2,
      duration: 0.25,
      ease: 'power4.out',
    });

    walkBobTlRef.current = tl;
  }, []);

  const stopWalkBob = useCallback(() => {
    if (walkBobTlRef.current) {
      walkBobTlRef.current.kill();
      walkBobTlRef.current = null;
    }
    if (walkerRef.current) {
      gsap.to(walkerRef.current, { y: 0, duration: 0.3, ease: 'power4.out' });
    }
  }, []);

  // ── Car / Walker: track terrain elevation ──
  // Smoothly animate the bottom offset so the vehicle rides the terrain.
  useEffect(() => {
    const bottom = elevationToBottom(elevation);

    if (carRef.current) {
      gsap.to(carRef.current, {
        bottom: `${bottom}%`,
        duration: 0.6,
        ease: 'power4.out',
      });
    }
    // Dust follows the car vertically
    if (dustRef.current) {
      gsap.to(dustRef.current, {
        bottom: `${bottom}%`,
        duration: 0.6,
        ease: 'power4.out',
      });
    }
    if (walkerRef.current) {
      gsap.to(walkerRef.current, {
        bottom: `${bottom}%`,
        duration: 0.6,
        ease: 'power4.out',
      });
    }
  }, [elevation]);

  // ── Cross-fade + animation lifecycle on transport change ──
  useEffect(() => {
    const refs: Record<Transport, HTMLDivElement | null> = {
      plane: planeRef.current,
      car: carRef.current,
      walking: walkerRef.current,
    };

    const dur = 0.6;
    const ease = 'expo.out';
    const prev = prevTransportRef.current;
    const isPlaneDescend = prev === 'plane' && transport !== 'plane';

    // ── Handle plane-descend special case ──
    // When leaving plane mode, the plane visually descends to ground
    // level before fading out, creating a landing illusion.
    if (isPlaneDescend && planeRef.current) {
      const groundBottom = elevationToBottom(elevation);

      // Phase 1: descend (0.5s)
      gsap.to(planeRef.current, {
        top: 'auto',
        bottom: `${groundBottom}%`,
        duration: 0.5,
        ease: 'power4.out',
        onComplete: () => {
          // Phase 2: fade out after landing (0.4s)
          if (planeRef.current) {
            gsap.to(planeRef.current, {
              opacity: 0,
              duration: 0.4,
              ease: 'expo.out',
              onComplete: () => {
                // Reset plane to sky position for next time
                if (planeRef.current) {
                  gsap.set(planeRef.current, {
                    top: '22%',
                    bottom: 'auto',
                  });
                }
              },
            });
          }
        },
      });

      // Trail fades out immediately during descent
      if (trailRef.current) {
        gsap.killTweensOf(trailRef.current, 'opacity');
        gsap.to(trailRef.current, { opacity: 0, duration: 0.3, ease });
      }
    } else {
      // Standard fade for non-plane-descend transitions
      (Object.keys(refs) as Transport[]).forEach((t) => {
        const el = refs[t];
        if (!el) return;
        gsap.killTweensOf(el, 'opacity');
        gsap.to(el, {
          opacity: t === transport ? 1 : 0,
          duration: dur,
          ease,
          delay: t === transport ? 0.15 : 0,
        });
      });

      // Trail visibility follows plane
      if (trailRef.current) {
        gsap.killTweensOf(trailRef.current, 'opacity');
        gsap.to(trailRef.current, {
          opacity: transport === 'plane' ? 1 : 0,
          duration: dur,
          ease,
          delay: transport === 'plane' ? 0.2 : 0,
        });
      }
    }

    // Fade in incoming vehicle (for plane-descend, new vehicle fades in
    // with a slight delay so it appears after the plane lands)
    if (isPlaneDescend) {
      const incomingEl = refs[transport];
      if (incomingEl) {
        gsap.killTweensOf(incomingEl, 'opacity');
        gsap.to(incomingEl, {
          opacity: 1,
          duration: dur,
          ease,
          delay: 0.5,  // wait for plane descent
        });
      }
    }

    // Dust visibility follows car
    if (dustRef.current) {
      gsap.killTweensOf(dustRef.current, 'opacity');
      gsap.to(dustRef.current, {
        opacity: transport === 'car' ? 1 : 0,
        duration: dur,
        ease,
        delay: transport === 'car' ? 0.2 : 0,
      });
    }

    // Stop all transport-specific animations
    stopPlaneDrift();
    stopPlaneBob();
    stopTrailAnimation();
    stopWheelRotation();
    stopDustParticles();
    stopWalkBob();

    // Start transport-specific animations
    if (transport === 'plane') {
      startPlaneDrift();
      startPlaneBob();
      startTrailAnimation();
    } else if (transport === 'car') {
      startWheelRotation();
      startDustParticles();
    } else if (transport === 'walking') {
      startWalkBob();
    }

    // Update previous transport ref for next transition
    prevTransportRef.current = transport;

    return () => {
      stopPlaneDrift();
      stopPlaneBob();
      stopTrailAnimation();
      stopWheelRotation();
      stopDustParticles();
      stopWalkBob();
    };
  }, [transport, startPlaneDrift, stopPlaneDrift, startPlaneBob, stopPlaneBob, startTrailAnimation, stopTrailAnimation, startWheelRotation, stopWheelRotation, startDustParticles, stopDustParticles, startWalkBob, stopWalkBob]);

  return (
    <div className={styles.container}>
      {/* Dashed trail — renders behind the plane, full width */}
      <div ref={trailRef} className={styles.trail}>
        <PlaneTrail />
      </div>

      {/* Plane silhouette — upper viewport */}
      <div ref={planeRef} className={styles.plane}>
        <PlaneSVG />
      </div>

      {/* Car silhouette — ground level */}
      <div ref={carRef} className={styles.car}>
        <CarSVG />
      </div>

      {/* Dust particles — trail behind car, same vertical position */}
      <div ref={dustRef} className={styles.dust}>
        <DustParticles />
      </div>

      {/* Walking figures (dual silhouette) — ground level */}
      <div ref={walkerRef} className={styles.walker}>
        <WalkerSVG />
        <div className={styles.companionOffset}>
          <WalkerSVG />
        </div>
      </div>
    </div>
  );
}
