/**
 * Project Pyari — App Shell
 * ==========================
 * Central orchestrator. Manages:
 *   1. Act 0 personal video (plays once after authentication)
 *   2. GSAP ScrollSmoother (high-inertia 60FPS scrolling)
 *   3. `currentAct` state derived from scroll position
 *   4. Sequential rendering of all 5 Narrative Acts
 *
 * Acts II-V (the scroll journey) are rendered only after the
 * user passes the Gatekeeper and the video completes.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  gsap,
  ScrollSmoother,
  ScrollTrigger,
  useGSAP,
} from './lib/gsapSetup';

// ── Act Components ──
import Act0Video from './acts/Act0_Video';
import ActIThreshold from './acts/ActI_Threshold';
import ActIIMeridian from './acts/ActII_Meridian';
import ActIIIReveal from './acts/ActIII_Reveal';
import ActIVResonance from './acts/ActIV_Resonance';
import ActVHorizon from './acts/ActV_Horizon';

// ── Audio ──
import { useAudio } from './hooks/useAudio';

// ── Styles ──
import './styles/global.css';

export type ActNumber = 1 | 2 | 3 | 4 | 5;

export default function App() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const smootherRef = useRef<ScrollSmoother | null>(null);
  const journeyRef = useRef<HTMLDivElement>(null);

  // Which Act is currently in the viewport
  const [currentAct, setCurrentAct] = useState<ActNumber>(1);

  // Gate: nothing scrolls / renders until authenticated
  const [authenticated, setAuthenticated] = useState(false);

  // Video: true once Act 0 video finishes (or is skipped)
  const [videoComplete, setVideoComplete] = useState(false);

  // True once ScrollSmoother has been created — children must
  // wait for this before creating pinned ScrollTriggers.
  const [smootherReady, setSmootherReady] = useState(false);

  // ── Piano ambient track — loops throughout the entire experience ──
  const { play: playPiano } = useAudio({
    src: `${import.meta.env.BASE_URL}audio/intro_greeting.mp3`,
    filterFrequency: 800,
    loop: true,
    targetVolume: 0.5,
    fadeInDuration: 3,
    fadeOutDuration: 3,
  });

  // Start piano once the video is done and the scroll journey begins
  useEffect(() => {
    if (videoComplete) {
      playPiano();
    }
  }, [videoComplete, playPiano]);

  /**
   * Initialise ScrollSmoother ONLY after video completes.
   * Before that, only Act 0 / Gatekeeper is in the DOM — no scroll needed.
   */
  useGSAP(
    () => {
      if (!videoComplete) return;

      // Wait for React to flush the conditional render and for
      // the browser to layout the newly-mounted Act sections.
      const initSmoother = () => {
        // Guard: content must be in the DOM and have height
        if (!contentRef.current || contentRef.current.scrollHeight < 2) {
          requestAnimationFrame(initSmoother);
          return;
        }

        smootherRef.current = ScrollSmoother.create({
          wrapper: wrapperRef.current!,
          content: contentRef.current!,
          smooth: 2,
          effects: true,
        });

        // Signal children that smoother is ready — they MUST wait
        // for this before creating pinned ScrollTriggers, otherwise
        // the pin uses position:fixed which is broken inside the
        // smoother's transform container.
        setSmootherReady(true);

        // ── Per-Act scroll tracking ──
        const actIds = [
          'act-threshold',
          'act-meridian',
          'act-reveal',
          'act-resonance',
          'act-horizon',
        ];

        actIds.forEach((id, index) => {
          const el = document.getElementById(id);
          if (!el) return;
          ScrollTrigger.create({
            trigger: el,
            start: 'top center',
            end: 'bottom center',
            onEnter: () => setCurrentAct((index + 1) as ActNumber),
            onEnterBack: () => setCurrentAct((index + 1) as ActNumber),
          });
        });

        // Smooth scroll to Act II after a brief beat
        gsap.delayedCall(0.4, () => {
          smootherRef.current?.scrollTo('#act-meridian', true, 'top top');
        });

        // Fade in the journey content so it doesn't appear abruptly
        if (journeyRef.current) {
          gsap.fromTo(
            journeyRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 2, ease: 'power4.out', delay: 0.15 },
          );
        }
      };

      // Kick off after a frame to let React commit
      requestAnimationFrame(initSmoother);
    },
    { dependencies: [videoComplete] },
  );

  /**
   * Called when the Gatekeeper's identity + password flow completes.
   * Unlocks Act 0 (the video).
   */
  const handleAuthenticated = useCallback(() => {
    setAuthenticated(true);
  }, []);

  /**
   * Called when the Act 0 video finishes (or is skipped).
   * Unlocks the scroll journey.
   */
  const handleVideoComplete = useCallback(() => {
    setVideoComplete(true);
  }, []);

  /** Scroll back to Act I */
  const handleReturnToTop = useCallback(() => {
    if (smootherRef.current) {
      smootherRef.current.scrollTo(0, true);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  return (
    <>
    <div id="smooth-wrapper" ref={wrapperRef}>
      <div id="smooth-content" ref={contentRef}>

        {/* ── Gatekeeper — always rendered until authenticated ── */}
        <section
          id="act-threshold"
          style={authenticated ? { height: 0, overflow: 'hidden', pointerEvents: 'none' } : undefined}
        >
          {!authenticated && (
            <ActIThreshold
              isActive={currentAct === 1}
              onAuthenticated={handleAuthenticated}
            />
          )}
        </section>

        {/* ── Act 0 — Personal video message ── */}
        {authenticated && !videoComplete && (
          <section id="act-video" aria-label="Act 0 — Video Message">
            <Act0Video onVideoComplete={handleVideoComplete} />
          </section>
        )}

        {/* ── Acts II-V — rendered only after video completes ── */}
        {videoComplete && (
          <div ref={journeyRef} style={{ opacity: 0 }}>
            <section id="act-meridian">
              <ActIIMeridian isActive={currentAct === 2} smootherReady={smootherReady} />
            </section>

            <section id="act-reveal">
              <ActIIIReveal isActive={currentAct === 3} smootherReady={smootherReady} />
            </section>

            <section id="act-resonance">
              <ActIVResonance isActive={currentAct === 4} smootherReady={smootherReady} />
            </section>

            <section id="act-horizon" aria-label="Act V — The Future Horizon">
              <ActVHorizon isActive={currentAct === 5} smootherReady={smootherReady} />
            </section>
          </div>
        )}

      </div>
    </div>

    {/* ── Fixed return-to-top circle — outside scroll container ── */}
    {videoComplete && currentAct === 5 && (
      <button
        onClick={handleReturnToTop}
        aria-label="Return to the beginning"
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 9999,
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '1px solid rgba(235, 231, 224, 0.22)',
          background: 'rgba(26, 24, 22, 0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-ember)',
          fontSize: '1.15rem',
          lineHeight: 1,
          transition: 'border-color 0.35s ease, background 0.35s ease, opacity 0.5s ease',
          animation: 'fadeInUp 0.8s ease both',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-ember)';
          e.currentTarget.style.background = 'rgba(199, 154, 147, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(235, 231, 224, 0.22)';
          e.currentTarget.style.background = 'rgba(26, 24, 22, 0.7)';
        }}
      >
        &#8593;
      </button>
    )}
    </>
  );
}
