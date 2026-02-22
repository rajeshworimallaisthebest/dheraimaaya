import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './MacroRevealStage.module.css';
import MosaicScene, { type MosaicSceneHandle } from './MosaicScene';
import { globalConfig } from '../data/STORY_DATA';
import { gsap, ScrollTrigger, useGSAP } from '../lib/gsapSetup';

interface Props {
  isActive: boolean;
  smootherReady: boolean;
}

export default function MacroRevealStage({ isActive, smootherReady }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const mosaicRef = useRef<MosaicSceneHandle | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [canExplore, setCanExplore] = useState(false);
  const [mosaicReady, setMosaicReady] = useState(false);
  // Controls the CSS visibility of the canvas container.
  // Starts hidden so the user never sees the full mosaic at 1x.
  const [canvasVisible, setCanvasVisible] = useState(false);
  const canExploreRef = useRef(false);
  const revealStartedRef = useRef(false);

  const { fullWidth, fullHeight } = globalConfig.mosaic;
  const aspectRatio = fullWidth / fullHeight;

  // Start zoomed into the center of the mosaic.
  const initX = 0.5;
  const initY = 0.5;

  /** Called by MosaicScene after PixiJS tiles are loaded and sprites placed. */
  const handleMosaicReady = useCallback(() => {
    console.log('[MacroRevealStage] Mosaic ready — applying initial zoom state');

    // Always re-apply the hyper-zoomed state (covers re-inits from resize).
    if (mosaicRef.current) {
      mosaicRef.current.setBlur(8);
      mosaicRef.current.setCamera({ x: initX, y: initY, scale: 25 });

      // Now safe to make the canvas container visible — camera is zoomed in
      // so the full mosaic is never shown.
      setCanvasVisible(true);
    }

    // Only flip mosaicReady once (triggers the ScrollTrigger setup)
    if (!mosaicReady) {
      setMosaicReady(true);
    }
  }, [mosaicReady, initX, initY]);

  // ── Auto zoom-out reveal ──
  // Detect when the frame is fully in the viewport, then auto-animate the reveal.
  // No scroll-driven scrub — it's a time-based GSAP tween.
  useGSAP(
    () => {
      if (!smootherReady || !mosaicReady) return;
      if (!containerRef.current || !frameRef.current || !mosaicRef.current) return;

      const mosaic = mosaicRef.current;
      const frame = frameRef.current;

      // ScrollTrigger just to detect when the frame is fully visible
      ScrollTrigger.create({
        trigger: frame,
        start: 'top 85%',   // frame top hits 85% from viewport top (nearly fully visible)
        once: true,          // fire only once
        onEnter: () => {
          if (revealStartedRef.current) return;
          revealStartedRef.current = true;

          console.log('[MacroRevealStage] Frame in viewport — starting auto reveal');

          const proxy = {
            blur: 8,
            scale: 25,
            x: initX,
            y: initY,
          };

          // Ensure initial state is correct (defensive)
          mosaic.setBlur(proxy.blur);
          mosaic.setCamera({ x: proxy.x, y: proxy.y, scale: proxy.scale });

          const tl = gsap.timeline({
            defaults: { ease: 'power4.out' },
            onComplete: () => {
              // Unlock exploration after the reveal finishes
              if (!canExploreRef.current) {
                canExploreRef.current = true;
                setCanExplore(true);
              }
            },
          });

          // Phase 1 (0→2s): Optical snap — blur clears while staying zoomed in
          tl.to(proxy, {
            blur: 0,
            duration: 2,
            ease: 'power4.out',
            onUpdate: () => {
              mosaic.setBlur(proxy.blur);
            },
          });

          // Phase 2 (1.5s→12.5s): Very slow zoom-out from 18x to 1x,
          // staying centered on the mosaic middle the whole time.
          tl.to(proxy, {
            scale: 1,
            duration: 11,
            ease: 'power1.inOut',
            onUpdate: () => {
              mosaic.setCamera({
                x: proxy.x,
                y: proxy.y,
                scale: proxy.scale,
              });
            },
          }, '-=0.5'); // Slight overlap with blur clear
        },
      });
    },
    { dependencies: [smootherReady, mosaicReady], scope: containerRef },
  );

  // Canvas resize observer
  useEffect(() => {
    if (!containerRef.current) return;

    const canvasEl = containerRef.current.querySelector<HTMLDivElement>(`.${styles.canvas}`);
    if (!canvasEl) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        console.log('[MacroRevealStage] Canvas resized:', cr.width, 'x', cr.height);
        setCanvasSize({ width: cr.width, height: cr.height });
      }
    });

    observer.observe(canvasEl);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={styles.stage}
      aria-hidden={!isActive}
      style={{
        pointerEvents: canExplore ? 'auto' : 'none',
        opacity: isActive ? 1 : 0.35,
        transition: 'opacity var(--duration-slow) ease',
      }}
    >
      <div 
        ref={frameRef}
        className={styles.frame}
        style={{
          aspectRatio: `${aspectRatio}`,
        }}
      >
        {/* Canvas slot — PixiJS mosaic foundation */}
        <div
          className={styles.canvas}
          style={{
            opacity: canvasVisible ? 1 : 0,
            transition: canvasVisible ? 'opacity 0.15s ease' : 'none',
          }}
        >
          <MosaicScene
            ref={mosaicRef}
            width={canvasSize.width}
            height={canvasSize.height}
            enableInteraction={canExplore}
            isActive={isActive}
            onReady={handleMosaicReady}
          />
        </div>

        {/* Top overlay: minimal act label */}
        <div className={styles.overlayTop}>
          <span className={styles.actLabel}>The Macroscopic Reveal</span>
          {canExplore && (
            <span className={styles.hint}>
              Drag to pan • Scroll to zoom
            </span>
          )}
        </div>
      </div>
    </div>  );
}