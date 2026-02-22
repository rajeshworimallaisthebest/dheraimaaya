/**
 * HorizonSky — Act V Weather-Driven Live Sky
 * =============================================
 * Renders a full-viewport gradient background driven by live
 * Topeka, KS weather data (via WeatherAPI), overlaid with one of
 * 10 atmospheric SVG scenes — sun, moon, clouds, rain, snow,
 * lightning, fog — matched to the current real-world conditions.
 *
 * Gradient technique: GSAP tween on a plain RGB proxy object.
 * On each tick, GSAP updates the proxy values and we rebuild the
 * CSS `linear-gradient` string imperatively via `.style.background`.
 * This avoids CSS `transition` limitations with gradient interpolation
 * across browsers and gives us full easing/duration control.
 *
 * Each weather-state change triggers a 3 s `power4.out` crossfade
 * on the gradient and a 2.5 s opacity fade on the SVG overlay.
 * State changes are infrequent (API polled every 10 min), so per-frame
 * overhead outside a tween is zero.
 */

import { useRef, useEffect } from 'react';
import { gsap } from '../lib/gsapSetup';
import { useTopekaWeather } from '../hooks/useTopekaWeather';
import type { WeatherGradient } from '../hooks/useTopekaWeather';
import WeatherSkySVG from './WeatherSkySVG';
import styles from './HorizonSky.module.css';

// ── Color helpers ─────────────────────────────────────────────────────────

interface Rgb { r: number; g: number; b: number }

function hexToRgb(hex: string): Rgb {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToString({ r, g, b }: Rgb): string {
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

function buildGradient(proxy: GradientProxy): string {
  const top = rgbToString({ r: proxy.topR, g: proxy.topG, b: proxy.topB });
  const mid = rgbToString({ r: proxy.midR, g: proxy.midG, b: proxy.midB });
  const bot = rgbToString({ r: proxy.botR, g: proxy.botG, b: proxy.botB });
  return `linear-gradient(to bottom, ${top} 0%, ${mid} 55%, ${bot} 100%)`;
}

// ── Gradient proxy ────────────────────────────────────────────────────────

interface GradientProxy {
  topR: number; topG: number; topB: number;
  midR: number; midG: number; midB: number;
  botR: number; botG: number; botB: number;
}

function gradientToProxy(g: WeatherGradient): GradientProxy {
  const top = hexToRgb(g.top);
  const mid = hexToRgb(g.mid);
  const bot = hexToRgb(g.bottom);
  return {
    topR: top.r, topG: top.g, topB: top.b,
    midR: mid.r, midG: mid.g, midB: mid.b,
    botR: bot.r, botG: bot.g, botB: bot.b,
  };
}

// ── Component ─────────────────────────────────────────────────────────────

export default function HorizonSky() {
  const skyRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);
  const weather = useTopekaWeather();

  // Tracks which state is currently rendered — prevents re-triggering
  // a tween if the component re-renders for reasons unrelated to weather.
  const activeStateRef = useRef<string | null>(null);

  // Mutable RGB proxy that GSAP tweens in place.
  const proxyRef = useRef<GradientProxy | null>(null);

  // In-progress GSAP tween reference — killed on rapid state changes.
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    if (!skyRef.current) return;

    const el = skyRef.current;

    // First mount: seed proxy and paint immediately
    if (proxyRef.current === null) {
      proxyRef.current = gradientToProxy(weather.gradient);
      el.style.background = buildGradient(proxyRef.current);
      activeStateRef.current = weather.skyState;

      // Soft fade-in on the SVG layer
      if (svgRef.current) {
        gsap.fromTo(svgRef.current, { opacity: 0 }, {
          opacity: 1, duration: 2, ease: 'power4.out',
        });
      }
      return;
    }

    // Guard: skip if the weather state hasn't actually changed
    if (activeStateRef.current === weather.skyState) return;

    // Kill any in-progress tween to prevent proxy value conflicts
    tweenRef.current?.kill();

    const target = gradientToProxy(weather.gradient);
    const proxy  = proxyRef.current;

    // Crossfade the gradient
    tweenRef.current = gsap.to(proxy, {
      ...target,
      duration: 3,
      ease: 'power4.out',
      onUpdate() {
        el.style.background = buildGradient(proxy);
      },
    });

    // Crossfade the SVG overlay
    if (svgRef.current) {
      gsap.fromTo(
        svgRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 2.5, ease: 'power4.out' },
      );
    }

    activeStateRef.current = weather.skyState;

    return () => {
      tweenRef.current?.kill();
    };
  }, [weather]);

  return (
    <div
      ref={skyRef}
      className={styles.sky}
      aria-hidden="true"
      data-sky-state={weather.skyState}
      data-sky-condition={weather.conditionText}
    >
      <div ref={svgRef} className={styles.svgLayer}>
        <WeatherSkySVG state={weather.skyState} />
      </div>
    </div>
  );
}
