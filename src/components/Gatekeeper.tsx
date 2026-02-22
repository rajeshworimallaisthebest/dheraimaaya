/**
 * Gatekeeper — Act I: The Threshold
 * ===================================
 * Multi-step authentication gate before the memoir unlocks.
 *
 * Step 1 (identity):
 *   "Are you Rajeshwori Malla?" — Yes / No
 *   No → rejection card (dead end).
 *   Yes → Step 2.
 *
 * Step 2 (password):
 *   Password input. Checks against hardcoded value.
 *   Wrong → inline error, stays on screen.
 *   Correct → Step 3.
 *
 * Step 3 (exhale):
 *   Audio starts, preload begins, exhale transition plays,
 *   then signals App to unlock content.
 */

import { useRef, useCallback, useState } from 'react';
import { gsap, useGSAP } from '../lib/gsapSetup';
import { useAssetPreloader } from '../hooks/useAssetPreloader';
import { globalConfig } from '../data/STORY_DATA';
import styles from './Gatekeeper.module.css';

/** The password that unlocks the memoir (sourced from env to stay out of git). */
const GATE_PASSWORD = import.meta.env.VITE_GATE_PASSWORD ?? '';

type GateStep = 'identity' | 'rejected' | 'password' | 'exhale';

interface GatekeeperProps {
  /** Called after the exhale animation completes — signals App to unlock content */
  onAuthenticated: () => void;
}

export default function Gatekeeper({ onAuthenticated }: GatekeeperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const rejectedRef = useRef<HTMLDivElement>(null);
  const passwordBlockRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const exhaleRef = useRef<HTMLDivElement>(null);
  const loadBarRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<GateStep>('identity');
  const [pwError, setPwError] = useState(false);

  // ── Asset preloader: mosaic tiles ──
  const { progress, startPreload } = useAssetPreloader();

  // ── Step 1 entrance animation ──
  useGSAP(
    () => {
      if (step !== 'identity') return;

      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      tl.to(promptRef.current, {
        opacity: 1,
        duration: 1.4,
        delay: 0.6,
      });

      tl.to(
        buttonsRef.current,
        { opacity: 1, duration: 0.8 },
        '-=0.3',
      );
    },
    { scope: containerRef, dependencies: [step] },
  );

  // ── Animate password screen entrance ──
  useGSAP(
    () => {
      if (step !== 'password') return;

      gsap.fromTo(
        passwordBlockRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'power4.out', delay: 0.15 },
      );
    },
    { scope: containerRef, dependencies: [step] },
  );

  // ── Animate rejection card entrance ──
  useGSAP(
    () => {
      if (step !== 'rejected') return;

      gsap.fromTo(
        rejectedRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'power4.out', delay: 0.15 },
      );
    },
    { scope: containerRef, dependencies: [step] },
  );

  // ── Preload progress bar ──
  useGSAP(
    () => {
      if (loadBarRef.current && progress > 0) {
        gsap.to(loadBarRef.current, {
          scaleX: progress,
          duration: 0.3,
          ease: 'power4.out',
        });
      }
    },
    { dependencies: [progress] },
  );

  // ── "No" handler — identity rejection ──
  const handleNo = useCallback(() => {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

    tl.to([promptRef.current, buttonsRef.current], {
      opacity: 0,
      y: -16,
      duration: 0.4,
      stagger: 0.06,
    });

    tl.call(() => setStep('rejected'));
  }, []);

  // ── "Yes" handler — move to password ──
  const handleYes = useCallback(() => {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

    tl.to([promptRef.current, buttonsRef.current], {
      opacity: 0,
      y: -16,
      duration: 0.4,
      stagger: 0.06,
    });

    tl.call(() => setStep('password'));
  }, []);

  // ── Password submit ──
  const handlePasswordSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const value = inputRef.current?.value ?? '';

      if (value !== GATE_PASSWORD) {
        setPwError(true);
        // Shake the input
        gsap.fromTo(
          inputRef.current,
          { x: -6 },
          { x: 0, duration: 0.4, ease: 'expo.out' },
        );
        if (errorRef.current) {
          gsap.fromTo(
            errorRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.35, ease: 'power4.out' },
          );
        }
        return;
      }

      // Correct password — start exhale
      setPwError(false);
      setStep('exhale');

      // 1. Background preload
      startPreload();

      // 3. Exhale transition
      const { gateExhale } = globalConfig.timing;

      const tl = gsap.timeline({
        defaults: { ease: 'expo.out' },
        onComplete: () => onAuthenticated(),
      });

      // Fade out password block
      tl.to(passwordBlockRef.current, {
        opacity: 0,
        y: -20,
        duration: 0.5,
      });

      // Exhale overlay — silk curtain fills screen
      tl.to(
        exhaleRef.current,
        { opacity: 1, duration: gateExhale * 0.6 },
        '-=0.2',
      );

      // Dissolve overlay
      tl.to(exhaleRef.current, {
        opacity: 0,
        duration: gateExhale * 0.4,
        delay: 0.15,
      });
    },
    [startPreload, onAuthenticated],
  );

  return (
    <div
      ref={containerRef}
      className={styles.gate}
      aria-label="Act I — The Threshold"
    >
      {/* ───────── Step 1: Identity ───────── */}
      {step === 'identity' && (
        <>
          <p ref={promptRef} className={styles.prompt}>
            Are you Rajeshwori Malla?
          </p>

          <div ref={buttonsRef} className={styles.buttonRow}>
            <button
              className={styles.gateButton}
              onClick={handleYes}
              aria-label="Yes — I am Rajeshwori Malla"
            >
              Yes
            </button>
            <button
              className={`${styles.gateButton} ${styles.gateButtonGhost}`}
              onClick={handleNo}
              aria-label="No — I am not"
            >
              No
            </button>
          </div>
        </>
      )}

      {/* ───────── Rejection ───────── */}
      {step === 'rejected' && (
        <div ref={rejectedRef} className={styles.rejectedCard}>
          <p className={styles.rejectedText}>
            Sorry, you are not authorized to view the contents of this page.
          </p>
          <p className={styles.rejectedSub}>Thank you.</p>
        </div>
      )}

      {/* ───────── Step 2: Password ───────── */}
      {step === 'password' && (
        <div ref={passwordBlockRef} className={styles.passwordBlock}>
          <p className={styles.passwordPrompt}>Enter the passphrase</p>
          <p className={styles.passwordHint}>hint: your spirit animal</p>
          <form onSubmit={handlePasswordSubmit} className={styles.passwordForm}>
            <input
              ref={inputRef}
              type="password"
              className={styles.passwordInput}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              aria-label="Passphrase"
            />
            <button type="submit" className={styles.gateButton}>
              Enter
            </button>
          </form>
          {pwError && (
            <p ref={errorRef} className={styles.passwordError}>
              Incorrect passphrase. Try again.
            </p>
          )}
        </div>
      )}

      {/* ───────── Exhale / Preload ───────── */}
      {step === 'exhale' && (
        <div
          ref={loadBarRef}
          className={styles.loadBar}
          style={{ width: '100%' }}
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      )}

      <div ref={exhaleRef} className={styles.exhale} aria-hidden="true" />
    </div>
  );
}
