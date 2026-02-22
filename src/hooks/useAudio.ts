/**
 * useAudio — Ambient Score Controller
 * =====================================
 * Handles the Act I ambient piano track with a Web Audio API
 * low-pass filter. Uses Howler.js for cross-browser playback
 * and routes audio through a BiquadFilterNode for warmth.
 *
 * Design system ref: power4.out easing on volume fade-in.
 */

import { useRef, useCallback, useEffect } from 'react';
import { Howl } from 'howler';
import { gsap } from '../lib/gsapSetup';
import { globalConfig } from '../data/STORY_DATA';

interface UseAudioOptions {
  /** Path to the audio file */
  src: string;
  /** Initial low-pass filter frequency (Hz). Default 800 */
  filterFrequency?: number;
  /** Whether to loop the track. Default true */
  loop?: boolean;
  /** Target volume after fade-in. Default 0.6 */
  targetVolume?: number;
  /** Duration of the GSAP volume fade-in (seconds). Default from globalConfig */
  fadeInDuration?: number;
  /** Duration of the GSAP volume fade-out (seconds). Default 0.8 */
  fadeOutDuration?: number;
}

interface UseAudioReturn {
  /** Start playback with a GSAP-driven volume fade-in */
  play: () => void;
  /** Stop playback with a fade-out */
  stop: () => void;
  /** Whether audio is currently playing */
  isPlaying: () => boolean;
  /** Adjust the low-pass filter frequency in real time */
  setFilterFrequency: (freq: number) => void;
}

export function useAudio({
  src,
  filterFrequency = 800,
  loop = true,
  targetVolume = 0.6,
  fadeInDuration,
  fadeOutDuration = 0.8,
}: UseAudioOptions): UseAudioReturn {
  const howlRef = useRef<Howl | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const volumeProxy = useRef({ value: 0 });

  // Clean up on unmount
  useEffect(() => {
    return () => {
      tweenRef.current?.kill();
      howlRef.current?.unload();
    };
  }, []);

  const play = useCallback(() => {
    const fadeIn = fadeInDuration ?? globalConfig.timing.audioFadeIn;

    // ── Resume path: Howl already exists ──
    if (howlRef.current) {
      const howl = howlRef.current;
      // Kill any running fade (e.g. an in-progress fade-out)
      tweenRef.current?.kill();
      if (!howl.playing()) howl.play();
      volumeProxy.current.value = howl.volume();
      tweenRef.current = gsap.to(volumeProxy.current, {
        value: targetVolume,
        duration: fadeIn,
        ease: 'power4.out',
        onUpdate: () => { howl.volume(volumeProxy.current.value); },
      });
      return;
    }

    // ── First init ──
    const howl = new Howl({
      src: [src],
      loop,
      volume: 0, // start silent — GSAP drives the fade
      html5: false, // use Web Audio API for filter support
    });

    howlRef.current = howl;

    howl.once('load', () => {
      // Wire up the low-pass filter via Howler's internal AudioContext
      try {
        const ctx = (Howler as unknown as { ctx: AudioContext }).ctx;
        if (ctx) {
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = filterFrequency;
          filter.Q.value = 1;
          filterRef.current = filter;

          // Access the master gain node and insert the filter
          const masterGain = (Howler as unknown as { masterGain: GainNode }).masterGain;
          if (masterGain) {
            masterGain.disconnect();
            masterGain.connect(filter);
            filter.connect(ctx.destination);
          }
        }
      } catch {
        // Filter wiring failed — audio still plays unfiltered
        console.warn('[useAudio] Low-pass filter could not be applied.');
      }

      // Start playback
      howl.play();

      // GSAP fade-in: 0 → targetVolume
      volumeProxy.current.value = 0;
      tweenRef.current = gsap.to(volumeProxy.current, {
        value: targetVolume,
        duration: fadeIn,
        ease: 'power4.out',
        onUpdate: () => {
          howl.volume(volumeProxy.current.value);
        },
      });
    });

    howl.load();
  }, [src, loop, targetVolume, filterFrequency, fadeInDuration]);

  const stop = useCallback(() => {
    const howl = howlRef.current;
    if (!howl) return;

    tweenRef.current?.kill();

    if (!howl.playing()) return;

    volumeProxy.current.value = howl.volume();
    tweenRef.current = gsap.to(volumeProxy.current, {
      value: 0,
      duration: fadeOutDuration,
      ease: 'power4.out',
      onUpdate: () => {
        howl.volume(volumeProxy.current.value);
      },
      onComplete: () => {
        howl.stop();
      },
    });
  }, [fadeOutDuration]);

  const isPlaying = useCallback(() => {
    return howlRef.current?.playing() ?? false;
  }, []);

  const setFilterFrequency = useCallback((freq: number) => {
    if (filterRef.current) {
      filterRef.current.frequency.value = freq;
    }
  }, []);

  return { play, stop, isPlaying, setFilterFrequency };
}
