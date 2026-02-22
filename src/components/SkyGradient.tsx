/**
 * SkyGradient — Atmospheric Sky Tint Layer
 * =========================================
 * Full-viewport div rendered behind all biome layers in
 * ParallaxWorld. Provides a dusty-blue gradient at the
 * top of the scene for atmospheric depth.
 *
 * In plane mode the gradient is stronger (opacity 0.20)
 * and extends deeper (60% height) to suggest altitude.
 */

import { useRef, useEffect } from 'react';
import { gsap } from '../lib/gsapSetup';
import type { Transport } from '../data/STORY_DATA';
import styles from './SkyGradient.module.css';

interface Props {
  transport?: Transport;
}

export default function SkyGradient({ transport }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const isPlane = transport === 'plane';

    gsap.to(ref.current, {
      opacity: isPlane ? 0.20 : 0.12,
      duration: 0.6,
      ease: 'expo.out',
    });

    // Swap gradient extent for plane mode
    ref.current.style.background = isPlane
      ? 'linear-gradient(to bottom, var(--color-sky-tint) 0%, transparent 60%)'
      : 'linear-gradient(to bottom, var(--color-sky-tint) 0%, transparent 40%)';
  }, [transport]);

  return <div ref={ref} className={styles.sky} />;
}
