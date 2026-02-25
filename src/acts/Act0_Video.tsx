/**
 * Act 0 — The Video Message
 * ==========================
 * Full-screen personal video that plays immediately after
 * authentication. Fades in over 3 s, plays to completion,
 * then fades out over 3 s and signals the parent that it's
 * done so the scroll journey can begin.
 *
 * Responsive aspect ratio: 16:9 desktop, 4:3 mobile (CSS).
 *
 * Place the final .mp4 at:  public/video/message.mp4
 */

import { useRef, useState, useEffect } from 'react';
import { gsap, useGSAP } from '../lib/gsapSetup';
import styles from './Act0_Video.module.css';

/** Path inside /public — swap once the real file is ready */
const VIDEO_SRC = `${import.meta.env.BASE_URL}video/intro-message.mp4`;

interface Props {
  /** Called after the video finishes + fade-out completes */
  onVideoComplete: () => void;
}

export default function Act0Video({ onVideoComplete }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasSource, setHasSource] = useState(false);

  // ── Probe whether the video file actually exists ──
  useEffect(() => {
    fetch(VIDEO_SRC, { method: 'HEAD' })
      .then((res) => {
        if (res.ok) setHasSource(true);
        else setHasSource(false);
      })
      .catch(() => setHasSource(false));
  }, []);

  // ── Fade-in on mount, play, then fade-out on ended ──
  useGSAP(
    () => {
      if (!wrapRef.current) return;

      // Smooth 3 s fade-in from 0 → 1
      gsap.fromTo(
        wrapRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 3,
          ease: 'power4.out',
        },
      );
    },
    { dependencies: [] },
  );

  // ── Start playback once source is confirmed ──
  useEffect(() => {
    if (hasSource && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay blocked — user will need to tap
      });
    }
  }, [hasSource]);

  /** When the video ends, fade out then signal parent */
  const handleEnded = () => {
    if (!wrapRef.current) return;

    gsap.to(wrapRef.current, {
      opacity: 0,
      duration: 3,
      ease: 'power4.out',
      onComplete: () => onVideoComplete(),
    });
  };

  /**
   * If there's no video file yet, show the placeholder for 2 s
   * then auto-complete so the rest of the app isn't blocked.
   */
  useEffect(() => {
    if (hasSource) return;

    const timer = setTimeout(() => {
      if (!wrapRef.current) { onVideoComplete(); return; }

      gsap.to(wrapRef.current, {
        opacity: 0,
        duration: 3,
        ease: 'power4.out',
        onComplete: () => onVideoComplete(),
      });
    }, 4000); // 3 s fade-in + 1 s to read placeholder

    return () => clearTimeout(timer);
  }, [hasSource, onVideoComplete]);

  return (
    <div className={styles.videoStage}>
      <div ref={wrapRef} className={styles.videoWrap}>
        {hasSource ? (
          <video
            ref={videoRef}
            className={styles.video}
            src={VIDEO_SRC}
            playsInline
            muted={false}
            preload="auto"
            onEnded={handleEnded}
          />
        ) : (
          <div className={styles.placeholder}>
            <span className={styles.placeholderIcon}>▶</span>
            <p className={styles.placeholderText}>
              Video placeholder — drop your .mp4 into
              <br />
              <strong>public/video/message.mp4</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
