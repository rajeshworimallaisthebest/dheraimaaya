/**
 * MeridianMap — Act II: The Global Meridian
 * ===========================================
 * Minimalist narrative map with organic SVG continent outlines,
 * scroll-driven ink path, phase-driven progressive disclosure,
 * blueprint overlay for the Washburn cluster, and Pizza Swirl.
 *
 * Architecture:
 *   - SVG viewBox (1200×800) with simplified continent silhouettes
 *     (Deep Umber fill, 0.5px Silk stroke)
 *   - GSAP ScrollTrigger pins for 6000px
 *   - Only the active phase's labels are visible; past nodes dim,
 *     future nodes are hidden — prevents cluster overlap
 *   - Phase title card (large serif text) at bottom of viewport
 *   - Blueprint overlay fades in during Washburn cluster
 *   - Pizza Swirl: SplitText "CARNEGIE" with per-char drift
 *
 * No map service. No camera zoom. Pure narrative SVG + GSAP.
 */

import { useRef, useMemo } from 'react';
import { gsap, SplitText, useGSAP } from '../lib/gsapSetup';
import { milestones, type Phase } from '../data/STORY_DATA';
import styles from './MeridianMap.module.css';

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const VB_W = 1200;
const VB_H = 800;
const VB_DEFAULT = `0 0 ${VB_W} ${VB_H}`;

const NODE_R = 3.5;
const MILESTONE_R = 7;
const PIN_DISTANCE = 6000;
const TL_DURATION = 100;

/**
 * Camera viewBox stages for the Orchestrated Camera system.
 * Keyed to scroll progress — animated via GSAP proxy object.
 *   Stage A (0–30 %):  Wide global view (Nepal → USA)
 *   Stage B (30–70 %): Regional zoom 4× on US Midwest / Nebraska
 *   Stage C (70–100 %): Hyper-zoom 12× into Washburn campus
 *
 * VB_CAMPUS bounds calculated to frame nodes 5–11:
 *   stoffer(258,340), carnegie(290,360), capitol(315,315),
 *   papa-johns(268,378), heights(322,342), morgan(285,395),
 *   washburn-north(248,305)
 */
const VB_GLOBAL  = { x: 0,   y: 0,   w: VB_W, h: VB_H };   // Stage A: 1×
const VB_MIDWEST = { x: 80,  y: 180, w: 450,  h: 300  };    // Stage B: ~2.7×
const VB_CAMPUS  = { x: 200, y: 250, w: 200,  h: 200  };    // Stage C: 6×

/** Label offset distance from dot center (SVG units) */
const LABEL_OFFSET = 10;

// ──────────────────────────────────────────────
// Organic continent outlines (simplified but recognizable)
// viewBox 1200×800 — Deep Umber fill, 0.5px Silk stroke
// ──────────────────────────────────────────────

const NORTH_AMERICA_D =
  'M180,160 L205,140 L240,135 L280,145 L320,130 L360,140 L385,155 ' +
  'L395,175 L400,200 L410,220 L400,250 L395,280 L380,310 L370,340 ' +
  'L355,360 L340,375 L320,385 L305,395 L295,410 L300,430 L310,445 ' +
  'L320,455 L310,460 L295,450 L280,440 L270,448 L262,460 L255,470 ' +
  'L248,465 L240,450 L235,430 L220,415 L210,400 L200,385 L195,360 ' +
  'L190,335 L185,310 L178,285 L175,260 L170,235 L172,210 L175,185 Z';

const SOUTH_AMERICA_D =
  'M310,470 L320,465 L332,475 L340,490 L345,510 L348,535 L350,555 ' +
  'L348,575 L342,595 L335,610 L325,622 L315,630 L305,635 L295,632 ' +
  'L288,620 L284,600 L282,580 L284,560 L288,540 L292,520 L298,500 ' +
  'L304,485 Z';

const EUROPE_D =
  'M530,140 L555,132 L580,128 L610,130 L640,135 L660,145 L670,160 ' +
  'L665,178 L655,195 L640,210 L620,222 L605,230 L590,238 L575,248 ' +
  'L560,255 L545,260 L530,258 L520,248 L515,235 L512,218 L510,200 ' +
  'L512,180 L518,162 Z';

const AFRICA_D =
  'M545,270 L565,262 L585,258 L605,260 L625,268 L642,280 L655,295 ' +
  'L665,315 L672,340 L675,365 L672,390 L668,415 L660,438 L648,458 ' +
  'L632,475 L615,488 L598,495 L580,497 L565,492 L552,480 L542,465 ' +
  'L535,445 L530,420 L528,395 L530,370 L533,345 L537,320 L540,295 Z';

const ASIA_D =
  'M670,130 L700,120 L740,115 L780,112 L825,115 L870,120 L910,128 ' +
  'L945,138 L975,150 L1000,165 L1015,182 L1020,200 L1015,220 ' +
  'L1005,240 L990,258 L972,275 L950,290 L925,302 L900,312 ' +
  'L875,320 L850,325 L825,328 L800,332 L780,340 L765,352 ' +
  'L755,368 L748,385 L745,405 L748,420 L755,435 L765,448 ' +
  'L760,455 L748,450 L735,440 L720,430 L705,425 L690,420 ' +
  'L678,410 L670,395 L668,375 L670,355 L675,335 L678,315 ' +
  'L680,295 L678,275 L675,255 L672,235 L670,215 L668,195 ' +
  'L668,175 L666,155 Z';

const AUSTRALIA_D =
  'M870,440 L895,432 L920,430 L945,435 L965,445 L978,460 ' +
  'L982,478 L978,495 L968,510 L952,520 L935,525 L915,522 ' +
  'L898,515 L885,505 L875,490 L870,475 L868,458 Z';

const CONTINENTS = [
  NORTH_AMERICA_D, SOUTH_AMERICA_D,
  EUROPE_D, AFRICA_D, ASIA_D, AUSTRALIA_D,
];

// ──────────────────────────────────────────────
// Blueprint campus data (viewBox 0 0 700 520)
// ──────────────────────────────────────────────

const BLUEPRINT_VB = '0 0 700 520';

const CAMPUS_BUILDINGS = [
  { id: 'bp-stoffer', label: 'STOFFER SCIENCE HALL', x: 140, y: 80, w: 200, h: 80 },
  { id: 'bp-carnegie', label: 'CARNEGIE HALL', x: 220, y: 230, w: 220, h: 90 },
  { id: 'bp-south', label: 'WASHBURN SOUTH', x: 180, y: 400, w: 240, h: 65 },
] as const;

const CAMPUS_WALKWAYS = [
  { x1: 240, y1: 160, x2: 330, y2: 230 },
  { x1: 330, y1: 320, x2: 300, y2: 400 },
] as const;

// ──────────────────────────────────────────────
// Phase ordering for phase-driven visibility
// ──────────────────────────────────────────────

const PHASE_ORDER: Phase[] = [
  'nepal-roots', 'transit', 'washburn', 'the-date',
  'residential', 'nebraska', 'global-loop', 'return', 'peak',
];

const PHASE_TITLES: Record<Phase, string> = {
  'nepal-roots': 'Nepal — Roots',
  transit: 'Westward Transit',
  washburn: 'Washburn Foundations',
  'the-date': 'The Date — Nov 15',
  residential: 'Settling In',
  nebraska: 'Nebraska',
  'global-loop': 'The Global Loop',
  return: 'The Return',
  peak: 'The Peak',
};

// ──────────────────────────────────────────────
// Path generation — Catmull-Rom → cubic bézier
// ──────────────────────────────────────────────

function catmullRomToBezier(
  points: { x: number; y: number }[],
  tension = 0.35,
): string {
  if (points.length < 2) return '';
  const d: string[] = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3;
    const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3;
    const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3;
    const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3;
    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }
  return d.join(' ');
}

function computeNodeProgress(pts: { x: number; y: number }[]): number[] {
  if (pts.length < 2) return pts.map(() => 0);
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    lengths.push(Math.sqrt(dx * dx + dy * dy));
    total += lengths[lengths.length - 1];
  }
  const progress: number[] = [0];
  let cum = 0;
  for (const l of lengths) {
    cum += l;
    progress.push(cum / total);
  }
  return progress;
}

/**
 * Compute label x/y and anchor based on labelAnchor direction.
 */
function labelPos(
  svgX: number,
  svgY: number,
  anchor: 'n' | 's' | 'e' | 'w' = 'e',
): { x: number; y: number; textAnchor: 'start' | 'middle' | 'end' } {
  switch (anchor) {
    case 'n':
      return { x: svgX, y: svgY - LABEL_OFFSET, textAnchor: 'middle' };
    case 's':
      return { x: svgX, y: svgY + LABEL_OFFSET + 8, textAnchor: 'middle' };
    case 'w':
      return { x: svgX - LABEL_OFFSET, y: svgY + 3, textAnchor: 'end' };
    case 'e':
    default:
      return { x: svgX + LABEL_OFFSET, y: svgY + 3, textAnchor: 'start' };
  }
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function MeridianMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const blueprintRef = useRef<HTMLDivElement>(null);
  const pizzaRef = useRef<HTMLDivElement>(null);
  const pizzaTextRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const phaseTitleRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  /** Mutable proxy animated by GSAP to drive the SVG viewBox. */
  const viewBoxRef = useRef({ x: 0, y: 0, w: VB_W, h: VB_H });

  // ── Derived geometry ──

  const { pathD, nodeProgress, clusterStart, clusterEnd, pizzaIdx } =
    useMemo(() => {
      const points = milestones.map((m) => ({ x: m.svgX, y: m.svgY }));
      return {
        pathD: catmullRomToBezier(points, 0.35),
        nodeProgress: computeNodeProgress(points),
        clusterStart: milestones.findIndex((m) => m.id === 'stoffer'),
        clusterEnd: milestones.findIndex((m) => m.id === 'washburn-north'),
        pizzaIdx: milestones.findIndex((m) => m.id === 'carnegie'),
      };
    }, []);

  // Pre-compute phase boundaries (first/last node index per phase)
  const phaseBounds = useMemo(() => {
    const map = new Map<Phase, { first: number; last: number }>();
    milestones.forEach((m, i) => {
      const existing = map.get(m.phase);
      if (!existing) {
        map.set(m.phase, { first: i, last: i });
      } else {
        existing.last = i;
      }
    });
    return map;
  }, []);

  // ── Master scroll-driven timeline ──

  useGSAP(
    () => {
      const path = pathRef.current;
      const glow = glowRef.current;
      const svg = svgRef.current;
      const blueprint = blueprintRef.current;
      const pizzaContainer = pizzaRef.current;
      const pizzaText = pizzaTextRef.current;
      const phaseTitle = phaseTitleRef.current;
      if (!path || !glow || !svg) return;

      // ── Stroke setup ──
      const totalLength = path.getTotalLength();
      gsap.set([path, glow], {
        strokeDasharray: totalLength,
        strokeDashoffset: totalLength,
      });

      // Track which phase title is currently showing
      let currentPhaseTitle = '';

      // ── Pinned master timeline ──
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: `+=${PIN_DISTANCE}`,
          pin: true,
          scrub: 1.5,
          onUpdate: (self) => {
            if (progressFillRef.current) {
              progressFillRef.current.style.height = `${self.progress * 100}%`;
            }
            if (scrollHintRef.current) {
              scrollHintRef.current.style.opacity =
                self.progress < 0.04 ? '1' : '0';
            }
          },
        },
        defaults: { ease: 'none' },
      });

      // ── 1. Ink path draw ──
      tl.to(
        [path, glow],
        { strokeDashoffset: 0, duration: TL_DURATION, ease: 'none' },
        0,
      );

      // ── 1b. Orchestrated Camera — viewBox zoom ──
      {
        const vb = viewBoxRef.current;
        const syncViewBox = () => {
          svg.setAttribute(
            'viewBox',
            `${vb.x} ${vb.y} ${vb.w} ${vb.h}`,
          );
        };

        // Initialize viewBox to global view at the start
        gsap.set(vb, {
          x: VB_GLOBAL.x,
          y: VB_GLOBAL.y,
          w: VB_GLOBAL.w,
          h: VB_GLOBAL.h,
        });
        syncViewBox();

        // Stage A → B: Global → Midwest 4× at ~30% scroll (timeline pos 30)
        tl.to(
          vb,
          {
            x: VB_MIDWEST.x,
            y: VB_MIDWEST.y,
            w: VB_MIDWEST.w,
            h: VB_MIDWEST.h,
            duration: 8,
            ease: 'power2.inOut',
            onUpdate: syncViewBox,
          },
          30,
        );

        // Stage B → C: Midwest → Campus 10× at ~70% scroll (timeline pos 70)
        tl.to(
          vb,
          {
            x: VB_CAMPUS.x,
            y: VB_CAMPUS.y,
            w: VB_CAMPUS.w,
            h: VB_CAMPUS.h,
            duration: 8,
            ease: 'power2.inOut',
            onUpdate: syncViewBox,
          },
          70,
        );
      }

      // ── 2. Phase-driven node reveals + label visibility ──
      //
      // For each phase:
      //   - At phase start: fade in active nodes + their labels
      //   - At phase end: fade labels out, shrink nodes to dimmed state
      // This ensures only the active phase's labels compete for space.

      PHASE_ORDER.forEach((phase) => {
        const bounds = phaseBounds.get(phase);
        if (!bounds) return;

        const phaseStartT = nodeProgress[bounds.first] * TL_DURATION;
        const phaseEndT = nodeProgress[bounds.last] * TL_DURATION;
        // Give each phase enough dwell time before dimming
        const dwellAfter = Math.max(3, (phaseEndT - phaseStartT) * 0.4);

        // Phase title card — fade in/out centered at bottom
        if (phaseTitle) {
          tl.call(
            () => {
              const title = PHASE_TITLES[phase];
              if (currentPhaseTitle !== title) {
                currentPhaseTitle = title;
                phaseTitle.textContent = title;
              }
            },
            undefined,
            phaseStartT - 0.5,
          );

          tl.to(
            phaseTitle,
            { opacity: 1, duration: 1.5, ease: 'power4.out' },
            phaseStartT - 0.5,
          );
          tl.to(
            phaseTitle,
            { opacity: 0, duration: 2, ease: 'power4.out' },
            phaseEndT + dwellAfter,
          );
        }

        // Individual nodes in this phase
        for (let i = bounds.first; i <= bounds.last; i++) {
          const m = milestones[i];
          const t = nodeProgress[i] * TL_DURATION;
          const node = document.getElementById(`node-${m.id}`);
          const label = document.getElementById(`label-${m.id}`);
          const sub = document.getElementById(`sublabel-${m.id}`);
          const ring = document.getElementById(`ring-${m.id}`);

          // Pop in
          if (node) {
            tl.fromTo(
              node,
              { scale: 0, transformOrigin: 'center center' },
              { scale: 1, duration: 1.5, ease: 'power4.out' },
              t,
            );
          }

          // Labels fade in
          if (label) {
            tl.to(label, { opacity: 1, duration: 1.5, ease: 'power4.out' }, t + 0.3);
          }
          if (sub) {
            tl.to(sub, { opacity: 0.7, duration: 1.5, ease: 'power4.out' }, t + 0.5);
          }
          if (ring) {
            tl.to(ring, { opacity: 0.5, duration: 1.5, ease: 'power4.out' }, t + 0.2);
          }

          // Labels fade out after phase ends (nodes stay but dim)
          // Keep labels partially visible so past locations remain readable
          const fadeOutT = phaseEndT + dwellAfter;
          if (label) {
            tl.to(label, { opacity: 0.25, duration: 2, ease: 'power4.out' }, fadeOutT);
          }
          if (sub) {
            tl.to(sub, { opacity: 0.15, duration: 2, ease: 'power4.out' }, fadeOutT);
          }
          if (ring) {
            tl.to(ring, { opacity: 0.25, duration: 2, ease: 'power4.out' }, fadeOutT);
          }

          // Dim the node dot after phase
          const dot = document.getElementById(`dot-${m.id}`);
          if (dot) {
            tl.to(
              dot,
              { opacity: 0.6, attr: { r: 2.5 }, duration: 2, ease: 'power4.out' },
              fadeOutT,
            );
          }
        }
      });

      // ── 3. Blueprint overlay (Washburn cluster) ──
      if (blueprint && clusterStart >= 0 && clusterEnd >= 0) {
        const bpIn = nodeProgress[clusterStart] * TL_DURATION;
        tl.to(
          blueprint,
          { opacity: 1, duration: 4, ease: 'power4.out' },
          bpIn - 1,
        );
        tl.to(
          blueprint,
          { opacity: 0, duration: 4, ease: 'power4.out' },
          bpIn + 15,
        );
      }

      // ── 4. Pizza Swirl at Carnegie ──
      if (pizzaText && pizzaContainer && pizzaIdx >= 0) {
        const pt = nodeProgress[pizzaIdx] * TL_DURATION;
        tl.to(
          pizzaContainer,
          { opacity: 1, duration: 1.5, ease: 'power4.out' },
          pt + 2,
        );
        const split = new SplitText(pizzaText, { type: 'chars' });
        split.chars.forEach((char, ci) => {
          tl.to(
            char,
            {
              rotation: gsap.utils.random(-60, 60),
              x: gsap.utils.random(-50, 50),
              y: gsap.utils.random(10, 60),
              opacity: 0.4,
              duration: 6,
              ease: 'power4.out',
            },
            pt + 3 + ci * 0.5,
          );
        });
        tl.to(
          pizzaContainer,
          { opacity: 0, duration: 2, ease: 'power4.out' },
          pt + 10,
        );
      }
    },
    { scope: containerRef },
  );

  // ── Render ──

  return (
    <div ref={containerRef} className={styles.container}>
      {/* ── World Map SVG ── */}
      <svg
        ref={svgRef}
        className={styles.mapSvg}
        viewBox={VB_DEFAULT}
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="glow-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Organic continent silhouettes */}
        {CONTINENTS.map((d, i) => (
          <path key={`cont-${i}`} d={d} className={styles.landmass} />
        ))}

        {/* Glow layer */}
        <path ref={glowRef} d={pathD} className={styles.meridianGlow} />

        {/* Main meridian ink path — 2px Silk */}
        <path ref={pathRef} d={pathD} className={styles.meridianPath} />

        {/* Node group */}
        <g>
          {milestones.map((m) => {
            const lp = labelPos(m.svgX, m.svgY, m.labelAnchor);
            return (
              <g
                key={m.id}
                id={`node-${m.id}`}
                style={{ transformOrigin: `${m.svgX}px ${m.svgY}px` }}
              >
                {/* Milestone outer ring */}
                {m.storyMilestone && (
                  <circle
                    id={`ring-${m.id}`}
                    cx={m.svgX}
                    cy={m.svgY}
                    r={MILESTONE_R}
                    className={styles.nodeMilestone}
                  />
                )}

                {/* Node dot */}
                <circle
                  id={`dot-${m.id}`}
                  cx={m.svgX}
                  cy={m.svgY}
                  r={NODE_R}
                  className={styles.nodeCircle}
                  data-phase={m.phase}
                />

                {/* Label — positioned by labelAnchor */}
                <text
                  id={`label-${m.id}`}
                  className={styles.nodeLabel}
                  x={lp.x}
                  y={lp.y}
                  textAnchor={lp.textAnchor}
                >
                  {m.label}
                </text>

                {/* Sublabel (milestone or interaction) */}
                {(m.storyMilestone || m.interaction) && (
                  <text
                    id={`sublabel-${m.id}`}
                    className={styles.nodeSublabel}
                    x={lp.x}
                    y={lp.y + (m.labelAnchor === 'n' ? -9 : 9)}
                    textAnchor={lp.textAnchor}
                  >
                    {m.storyMilestone || m.interaction}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* ── Phase Title Card ── */}
      <div ref={phaseTitleRef} className={styles.phaseTitle} />

      {/* ── Blueprint Overlay ── */}
      <div ref={blueprintRef} className={styles.blueprintOverlay}>
        <svg
          className={styles.blueprintSvg}
          viewBox={BLUEPRINT_VB}
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
        >
          {Array.from({ length: 14 }).map((_, i) => (
            <line
              key={`hg-${i}`}
              x1={20} y1={20 + i * 37} x2={680} y2={20 + i * 37}
              className={styles.bpGrid}
            />
          ))}
          {Array.from({ length: 19 }).map((_, i) => (
            <line
              key={`vg-${i}`}
              x1={20 + i * 37} y1={20} x2={20 + i * 37} y2={500}
              className={styles.bpGrid}
            />
          ))}
          <rect x={20} y={20} width={660} height={480} className={styles.bpBorder} />
          {CAMPUS_BUILDINGS.map((b) => (
            <g key={b.id}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} className={styles.bpBuilding} />
              <line x1={b.x} y1={b.y + b.h / 2} x2={b.x + b.w} y2={b.y + b.h / 2} className={styles.bpCenterLine} />
              <line x1={b.x + b.w / 2} y1={b.y} x2={b.x + b.w / 2} y2={b.y + b.h} className={styles.bpCenterLine} />
              <text className={styles.bpBuildingLabel} x={b.x + b.w / 2} y={b.y - 12} textAnchor="middle">{b.label}</text>
            </g>
          ))}
          <line x1={330} y1={230} x2={330} y2={320} className={styles.bpInterior} />
          <text className={styles.bpAnnotation} x={448} y={278} textAnchor="start">NOV 15 — THE PIZZA</text>
          <line x1={440} y1={275} x2={448} y2={275} className={styles.bpBuilding} />
          {CAMPUS_WALKWAYS.map((w, i) => (
            <line key={`walk-${i}`} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} className={styles.bpWalkway} />
          ))}
          <text className={styles.bpDimension} x={225} y={205} textAnchor="middle">← 120 m →</text>
          <text className={styles.bpDimension} x={350} y={368} textAnchor="middle">← 95 m →</text>
          <line x1={500} y1={390} x2={600} y2={390} className={styles.bpScale} />
          <line x1={500} y1={385} x2={500} y2={395} className={styles.bpScale} />
          <line x1={600} y1={385} x2={600} y2={395} className={styles.bpScale} />
          <text className={styles.bpDimension} x={550} y={385} textAnchor="middle">50 m</text>
          <g transform="translate(630, 70)">
            <line x1={0} y1={-22} x2={0} y2={22} className={styles.bpCompass} />
            <line x1={-8} y1={0} x2={8} y2={0} className={styles.bpCompass} />
            <polygon points="0,-22 -4,-14 4,-14" className={styles.bpCompassArrow} />
            <text className={styles.bpCompassLabel} x={0} y={-30} textAnchor="middle">N</text>
          </g>
          <rect x={440} y={435} width={230} height={55} className={styles.bpCartouche} />
          <text className={styles.bpTitle} x={555} y={457} textAnchor="middle">WASHBURN UNIVERSITY</text>
          <line x1={455} y1={463} x2={655} y2={463} className={styles.bpDivider} />
          <text className={styles.bpSubtitle} x={555} y={478} textAnchor="middle">CAMPUS PLAN — TOPEKA, KS</text>
        </svg>
      </div>

      {/* ── Pizza Swirl Overlay ── */}
      <div ref={pizzaRef} className={styles.pizzaOverlay}>
        <div ref={pizzaTextRef} className={styles.pizzaText}>
          CARNEGIE
        </div>
      </div>

      {/* ── Progress indicator ── */}
      <div className={styles.progressTrack}>
        <div ref={progressFillRef} className={styles.progressFill} />
      </div>

      {/* ── Scroll hint ── */}
      <div ref={scrollHintRef} className={styles.scrollHint}>
        scroll to trace the meridian
      </div>
    </div>
  );
}
