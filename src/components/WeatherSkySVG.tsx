/**
 * WeatherSkySVG — 10 Atmospheric SVG Sky Scenes
 * ===============================================
 * Renders one of ten weather-driven SVG overlays for Act V's
 * live horizon sky. Each scene uses inline CSS animations for
 * dynamic elements (rain, snow, stars, lightning, fog drift).
 *
 * Elements use the Resonance palette exclusively:
 *   silk  (#EBE7E0) — luminous elements (sun, moon, stars, precipitation)
 *   ember (#C79A93) — warm accents (sun glow, lightning)
 *
 * All element positions are pre-computed with a deterministic PRNG
 * (Mulberry32) so renders are stable across reconciliation cycles.
 */

import { memo } from 'react';
import type { WeatherSkyState } from '../hooks/useTopekaWeather';

// ── Deterministic PRNG (Mulberry32) ──────────────────────────────────────

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Pre-computed element positions ───────────────────────────────────────

interface StarData  { cx: number; cy: number; r: number; opacity: number; delay: number }
interface RainData  { x: number; len: number; delay: number; sw: number }
interface SnowData  { cx: number; r: number; delay: number; dur: number }

const rngS = mulberry32(42);
const STARS: StarData[] = Array.from({ length: 50 }, () => ({
  cx: rngS() * 1440,
  cy: rngS() * 550,
  r: 0.4 + rngS() * 1.6,
  opacity: 0.15 + rngS() * 0.45,
  delay: rngS() * 6,
}));

const rngR = mulberry32(101);
const RAIN_DROPS: RainData[] = Array.from({ length: 55 }, () => ({
  x: rngR() * 1440,
  len: 12 + rngR() * 28,
  delay: rngR() * 2,
  sw: 0.4 + rngR() * 0.3,
}));

const rngH = mulberry32(202);
const HEAVY_DROPS: RainData[] = Array.from({ length: 90 }, () => ({
  x: rngH() * 1440,
  len: 18 + rngH() * 35,
  delay: rngH() * 1.5,
  sw: 0.4 + rngH() * 0.8,
}));

const rngW = mulberry32(303);
const SNOWFLAKES: SnowData[] = Array.from({ length: 55 }, () => ({
  cx: rngW() * 1440,
  r: 1 + rngW() * 3,
  delay: rngW() * 10,
  dur: 6 + rngW() * 8,
}));

// ── Palette constants ────────────────────────────────────────────────────

const SILK  = '#EBE7E0';
const EMBER = '#C79A93';

// ── Shared SVG wrapper attributes ────────────────────────────────────────

const svgProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 1440 900',
  preserveAspectRatio: 'xMidYMid slice' as const,
  width: '100%',
  height: '100%',
  style: { display: 'block' } as React.CSSProperties,
} as const;

// ── Reusable cloud shape ─────────────────────────────────────────────────
// Composed of overlapping ellipses for an organic, natural feel.

function CloudShape({
  x,
  y,
  scale = 1,
  opacity = 0.1,
}: {
  x: number;
  y: number;
  scale?: number;
  opacity?: number;
}) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`} opacity={opacity}>
      <ellipse cx="0"   cy="0"   rx="70" ry="28" fill={SILK} />
      <ellipse cx="-40" cy="5"   rx="48" ry="22" fill={SILK} />
      <ellipse cx="50"  cy="4"   rx="55" ry="24" fill={SILK} />
      <ellipse cx="10"  cy="-12" rx="40" ry="20" fill={SILK} />
      <ellipse cx="-20" cy="-8"  rx="35" ry="18" fill={SILK} />
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1 — Clear Day
// ═══════════════════════════════════════════════════════════════════════════

function ClearDaySky() {
  return (
    <svg {...svgProps}>
      <defs>
        <radialGradient id="cd-glow" cx="50%" cy="24%" r="25%">
          <stop offset="0%"   stopColor={SILK}  stopOpacity="0.22" />
          <stop offset="50%"  stopColor={EMBER} stopOpacity="0.06" />
          <stop offset="100%" stopColor={EMBER} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sun glow halo */}
      <circle cx="720" cy="220" r="220" fill="url(#cd-glow)" />

      {/* Sun disc */}
      <circle cx="720" cy="220" r="42" fill={SILK} opacity="0.30" />

      {/* Subtle radial rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
        <line
          key={a}
          x1={720 + Math.cos((a * Math.PI) / 180) * 58}
          y1={220 + Math.sin((a * Math.PI) / 180) * 58}
          x2={720 + Math.cos((a * Math.PI) / 180) * 115}
          y2={220 + Math.sin((a * Math.PI) / 180) * 115}
          stroke={SILK}
          strokeWidth="0.6"
          opacity="0.10"
        />
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 — Clear Night
// ═══════════════════════════════════════════════════════════════════════════

function ClearNightSky() {
  return (
    <svg {...svgProps}>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: var(--tw-min); }
          50%      { opacity: var(--tw-max); }
        }
      `}</style>

      <defs>
        <radialGradient id="cn-moonglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={SILK} stopOpacity="0.12" />
          <stop offset="100%" stopColor={SILK} stopOpacity="0" />
        </radialGradient>
        <mask id="cn-crescent">
          <circle cx="1000" cy="180" r="35" fill="white" />
          <circle cx="1018" cy="168" r="30" fill="black" />
        </mask>
      </defs>

      {/* Moon glow */}
      <circle cx="1000" cy="180" r="110" fill="url(#cn-moonglow)" />

      {/* Moon crescent */}
      <circle cx="1000" cy="180" r="35" fill={SILK} opacity="0.22" mask="url(#cn-crescent)" />

      {/* Stars */}
      {STARS.map((s, i) => (
        <circle
          key={i}
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          fill={SILK}
          style={
            {
              '--tw-min': s.opacity,
              '--tw-max': Math.min(1, s.opacity + 0.3),
              opacity: s.opacity,
              animation: `twinkle ${3 + s.delay}s ${s.delay}s ease-in-out infinite`,
            } as React.CSSProperties
          }
        />
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 — Partly Cloudy Day
// ═══════════════════════════════════════════════════════════════════════════

function PartlyCloudyDaySky() {
  return (
    <svg {...svgProps}>
      <defs>
        <radialGradient id="pcd-glow" cx="50%" cy="26%" r="18%">
          <stop offset="0%"   stopColor={SILK}  stopOpacity="0.18" />
          <stop offset="100%" stopColor={EMBER} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sun behind clouds */}
      <circle cx="620" cy="210" r="180" fill="url(#pcd-glow)" />
      <circle cx="620" cy="210" r="36"  fill={SILK} opacity="0.22" />

      {/* Clouds partially covering sun */}
      <CloudShape x={680} y={220} scale={1.3} opacity={0.12} />
      <CloudShape x={400} y={280} scale={0.9} opacity={0.08} />
      <CloudShape x={1050} y={190} scale={1.0} opacity={0.07} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 — Partly Cloudy Night
// ═══════════════════════════════════════════════════════════════════════════

function PartlyCloudyNightSky() {
  return (
    <svg {...svgProps}>
      <style>{`
        @keyframes twinkle-pc {
          0%, 100% { opacity: var(--tw-min); }
          50%      { opacity: var(--tw-max); }
        }
      `}</style>

      <defs>
        <mask id="pcn-crescent">
          <circle cx="950" cy="200" r="30" fill="white" />
          <circle cx="965" cy="188" r="25" fill="black" />
        </mask>
      </defs>

      {/* Moon crescent */}
      <circle cx="950" cy="200" r="30" fill={SILK} opacity="0.18" mask="url(#pcn-crescent)" />

      {/* Stars peeking through cloud gaps */}
      {STARS.slice(0, 20).map((s, i) => (
        <circle
          key={i}
          cx={s.cx}
          cy={s.cy}
          r={s.r * 0.8}
          fill={SILK}
          style={
            {
              '--tw-min': s.opacity * 0.5,
              '--tw-max': Math.min(1, s.opacity * 0.5 + 0.2),
              opacity: s.opacity * 0.5,
              animation: `twinkle-pc ${4 + s.delay}s ${s.delay}s ease-in-out infinite`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Cloud wisps */}
      <CloudShape x={800}  y={220} scale={1.1} opacity={0.09} />
      <CloudShape x={1100} y={170} scale={0.8} opacity={0.07} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 — Cloudy / Overcast
// ═══════════════════════════════════════════════════════════════════════════

function CloudySky() {
  return (
    <svg {...svgProps}>
      {/* Multi-layered cloud cover */}
      <CloudShape x={200}  y={150} scale={1.8} opacity={0.12} />
      <CloudShape x={550}  y={120} scale={2.0} opacity={0.14} />
      <CloudShape x={900}  y={140} scale={1.6} opacity={0.11} />
      <CloudShape x={1200} y={160} scale={1.9} opacity={0.13} />
      <CloudShape x={350}  y={250} scale={1.4} opacity={0.08} />
      <CloudShape x={750}  y={270} scale={1.5} opacity={0.09} />
      <CloudShape x={1100} y={240} scale={1.3} opacity={0.07} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6 — Rain
// ═══════════════════════════════════════════════════════════════════════════

function RainSky() {
  return (
    <svg {...svgProps}>
      <style>{`
        @keyframes rain-fall {
          0%   { transform: translateY(-30px); opacity: 0; }
          8%   { opacity: 0.18; }
          92%  { opacity: 0.18; }
          100% { transform: translateY(920px); opacity: 0; }
        }
      `}</style>

      {/* Cloud layer */}
      <CloudShape x={300}  y={80} scale={2.2} opacity={0.14} />
      <CloudShape x={700}  y={60} scale={2.5} opacity={0.16} />
      <CloudShape x={1100} y={70} scale={2.0} opacity={0.13} />

      {/* Rain drops */}
      {RAIN_DROPS.map((d, i) => (
        <line
          key={i}
          x1={d.x}
          y1={0}
          x2={d.x}
          y2={d.len}
          stroke={SILK}
          strokeWidth={d.sw}
          strokeLinecap="round"
          style={{
            opacity: 0,
            animation: `rain-fall ${1.2 + d.delay * 0.3}s ${d.delay}s linear infinite`,
          }}
        />
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 7 — Heavy Rain / Storm
// ═══════════════════════════════════════════════════════════════════════════

function HeavyRainSky() {
  return (
    <svg {...svgProps}>
      <style>{`
        @keyframes heavy-rain {
          0%   { transform: translateY(-30px); opacity: 0; }
          5%   { opacity: 0.24; }
          95%  { opacity: 0.24; }
          100% { transform: translateY(920px); opacity: 0; }
        }
      `}</style>

      {/* Dense cloud cover */}
      <CloudShape x={200}  y={60}  scale={2.5} opacity={0.18} />
      <CloudShape x={600}  y={40}  scale={2.8} opacity={0.20} />
      <CloudShape x={1000} y={50}  scale={2.4} opacity={0.17} />
      <CloudShape x={400}  y={100} scale={2.0} opacity={0.12} />
      <CloudShape x={850}  y={90}  scale={2.2} opacity={0.14} />

      {/* Heavy rain drops — slightly angled by offset x2 */}
      {HEAVY_DROPS.map((d, i) => (
        <line
          key={i}
          x1={d.x}
          y1={0}
          x2={d.x + 2}
          y2={d.len}
          stroke={SILK}
          strokeWidth={d.sw}
          strokeLinecap="round"
          style={{
            opacity: 0,
            animation: `heavy-rain ${0.8 + d.delay * 0.2}s ${d.delay}s linear infinite`,
          }}
        />
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 8 — Thunderstorm
// ═══════════════════════════════════════════════════════════════════════════

function ThunderstormSky() {
  return (
    <svg {...svgProps}>
      <style>{`
        @keyframes thunder-flash {
          0%, 100% { opacity: 0; }
          46%      { opacity: 0; }
          47%      { opacity: 0.85; }
          48%      { opacity: 0.10; }
          49%      { opacity: 0.65; }
          51%      { opacity: 0; }
        }
        @keyframes storm-rain {
          0%   { transform: translateY(-30px); opacity: 0; }
          5%   { opacity: 0.20; }
          95%  { opacity: 0.20; }
          100% { transform: translateY(920px); opacity: 0; }
        }
      `}</style>

      {/* Dark cloud mass */}
      <CloudShape x={250}  y={50} scale={2.8} opacity={0.20} />
      <CloudShape x={650}  y={30} scale={3.0} opacity={0.24} />
      <CloudShape x={1050} y={45} scale={2.6} opacity={0.19} />
      <CloudShape x={450}  y={85} scale={2.2} opacity={0.15} />

      {/* Primary lightning bolt */}
      <path
        d="M 700,120 L 680,260 L 715,250 L 690,400 L 730,280 L 700,290 L 720,180 Z"
        fill={EMBER}
        style={{ animation: 'thunder-flash 8s 2s ease-in-out infinite' }}
      />

      {/* Secondary lightning — offset timing for realism */}
      <path
        d="M 1050,100 L 1035,220 L 1060,215 L 1040,340 L 1070,230 L 1048,240 L 1060,150 Z"
        fill={EMBER}
        opacity="0.7"
        style={{ animation: 'thunder-flash 11s 5s ease-in-out infinite' }}
      />

      {/* Storm rain */}
      {HEAVY_DROPS.slice(0, 70).map((d, i) => (
        <line
          key={i}
          x1={d.x}
          y1={0}
          x2={d.x + 3}
          y2={d.len}
          stroke={SILK}
          strokeWidth={d.sw}
          strokeLinecap="round"
          style={{
            opacity: 0,
            animation: `storm-rain ${0.7 + d.delay * 0.15}s ${d.delay}s linear infinite`,
          }}
        />
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 9 — Snow / Sleet / Ice
// ═══════════════════════════════════════════════════════════════════════════

function SnowSky() {
  return (
    <svg {...svgProps}>
      <style>{`
        @keyframes snow-fall {
          0%   { transform: translateY(-15px) translateX(0);    opacity: 0;    }
          10%  { opacity: 0.45; }
          25%  { transform: translateY(220px) translateX(12px); }
          50%  { transform: translateY(450px) translateX(-8px); }
          75%  { transform: translateY(680px) translateX(10px); }
          90%  { opacity: 0.25; }
          100% { transform: translateY(920px) translateX(-3px); opacity: 0; }
        }
      `}</style>

      {/* Soft high cloud cover */}
      <CloudShape x={300}  y={80} scale={2.0} opacity={0.10} />
      <CloudShape x={700}  y={60} scale={2.3} opacity={0.12} />
      <CloudShape x={1100} y={75} scale={1.8} opacity={0.09} />

      {/* Snowflakes */}
      {SNOWFLAKES.map((s, i) => (
        <circle
          key={i}
          cx={s.cx}
          cy={0}
          r={s.r}
          fill={SILK}
          style={{
            opacity: 0,
            animation: `snow-fall ${s.dur}s ${s.delay}s linear infinite`,
          }}
        />
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 10 — Fog / Mist / Haze
// ═══════════════════════════════════════════════════════════════════════════

function FogSky() {
  return (
    <svg {...svgProps}>
      <style>{`
        @keyframes fog-drift-a {
          0%, 100% { transform: translateX(-3%); }
          50%      { transform: translateX(3%);  }
        }
        @keyframes fog-drift-b {
          0%, 100% { transform: translateX(4%);  }
          50%      { transform: translateX(-4%); }
        }
      `}</style>

      <defs>
        <linearGradient id="fog-band" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={SILK} stopOpacity="0" />
          <stop offset="30%"  stopColor={SILK} stopOpacity="1" />
          <stop offset="70%"  stopColor={SILK} stopOpacity="1" />
          <stop offset="100%" stopColor={SILK} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Layered fog bands at varying heights and drift speeds */}
      <rect x="-50" y="150" width="1540" height="120" fill="url(#fog-band)" opacity="0.06"
        style={{ animation: 'fog-drift-a 25s ease-in-out infinite' }} />
      <rect x="-50" y="300" width="1540" height="150" fill="url(#fog-band)" opacity="0.09"
        style={{ animation: 'fog-drift-b 30s ease-in-out infinite' }} />
      <rect x="-50" y="450" width="1540" height="120" fill="url(#fog-band)" opacity="0.12"
        style={{ animation: 'fog-drift-a 35s 5s ease-in-out infinite' }} />
      <rect x="-50" y="580" width="1540" height="100" fill="url(#fog-band)" opacity="0.10"
        style={{ animation: 'fog-drift-b 28s 8s ease-in-out infinite' }} />
      <rect x="-50" y="700" width="1540" height="130" fill="url(#fog-band)" opacity="0.14"
        style={{ animation: 'fog-drift-a 22s 3s ease-in-out infinite' }} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Dispatcher
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  state: WeatherSkyState;
}

function WeatherSkySVG({ state }: Props) {
  switch (state) {
    case 'clear-day':           return <ClearDaySky />;
    case 'clear-night':         return <ClearNightSky />;
    case 'partly-cloudy-day':   return <PartlyCloudyDaySky />;
    case 'partly-cloudy-night': return <PartlyCloudyNightSky />;
    case 'cloudy':              return <CloudySky />;
    case 'rain':                return <RainSky />;
    case 'heavy-rain':          return <HeavyRainSky />;
    case 'thunderstorm':        return <ThunderstormSky />;
    case 'snow':                return <SnowSky />;
    case 'fog':                 return <FogSky />;
  }
}

export default memo(WeatherSkySVG);
