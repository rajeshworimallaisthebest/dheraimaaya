/**
 * Act III — The Macroscopic Reveal (Peak)
 * ========================================
 * 8K mosaic via PixiJS + guided tour + free exploration.
 */

import MacroRevealStage from '../components/MacroRevealStage';

interface Props {
  isActive: boolean;
  smootherReady: boolean;
}

export default function ActIIIReveal({ isActive, smootherReady }: Props) {
  return (
    <div
      className="act"
      style={{
        minHeight: '120vh', // Enough for the mosaic frame to fully enter viewport
        opacity: isActive ? 1 : 0.3,
        transition: 'opacity var(--duration-slow) ease',
        paddingTop: '8vh',
        paddingBottom: '12vh',
      }}
      aria-label="Act III — The Macroscopic Reveal"
    >
      <MacroRevealStage isActive={isActive} smootherReady={smootherReady} />
    </div>
  );
}
