/**
 * Act V — The Future Horizon (Afterglow)
 * ========================================
 * Thin orchestration shell. Delegates the full composition to
 * HorizonStage, mirroring the pattern used by Acts II–IV.
 *
 * Receives:
 *   isActive     — true when this act owns the primary viewport
 *   smootherReady — true once App's ScrollSmoother is initialised;
 *                   HorizonStage gates any pinned ScrollTriggers on this
 */

import HorizonStage from '../components/HorizonStage';

interface Props {
  isActive: boolean;
  /** Must be true before creating any pinned/scroll-linked ScrollTriggers. */
  smootherReady: boolean;
  /**
   * Optional ambient audio for the afterglow scene.
   * Forward from App once an audio file is placed in src/assets/audio.
   * Safe to omit — no audio plays when undefined.
   */
  ambientSrc?: string;
}

export default function ActVHorizon({ isActive, smootherReady, ambientSrc }: Props) {
  return (
    <div
      className="act"
      style={{
        minHeight: '100vh',
        opacity: isActive ? 1 : 0.3,
        transition: 'opacity var(--duration-slow) ease',
      }}
    >
      <HorizonStage isActive={isActive} smootherReady={smootherReady} ambientSrc={ambientSrc} />
    </div>
  );
}
