/**
 * Act II — The Global Meridian (Vehicle-POV Journey)
 * ===================================================
 * Scroll-driven first-person travel experience through
 * 24 journey nodes across 9 narrative phases.
 *
 * Delegates rendering to the JourneyStage cockpit component.
 */

import JourneyStage from '../components/JourneyStage';

interface Props {
  isActive: boolean;
  /** True once ScrollSmoother has been created in App. */
  smootherReady: boolean;
}

export default function ActIIMeridian({ isActive, smootherReady }: Props) {
  return (
    <div
      aria-label="Act II — The Global Meridian"
      style={{
        opacity: isActive ? 1 : 0.6,
        transition: 'opacity 0.8s ease',
        paddingBottom: '6vh',
      }}
    >
      <JourneyStage smootherReady={smootherReady} />
    </div>
  );
}
