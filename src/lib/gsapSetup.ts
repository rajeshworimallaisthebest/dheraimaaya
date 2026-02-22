/**
 * Project Pyari — GSAP Plugin Registration
 * -----------------------------------------
 * Centralised setup so every plugin is registered exactly once.
 * Import this module at the app root before any animation code runs.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(
  ScrollTrigger,
  ScrollSmoother,
  DrawSVGPlugin,
  SplitText,
  useGSAP,
);

// Global GSAP defaults matching the Resonance design system
gsap.defaults({
  ease: 'power4.out',
  duration: 0.8,
});

export { gsap, ScrollTrigger, ScrollSmoother, DrawSVGPlugin, SplitText, useGSAP };
