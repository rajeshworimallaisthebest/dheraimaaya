/**
 * Project Pyari — STORY_DATA
 * ===========================
 * Single source of truth for every GPS coordinate, milestone,
 * building, letter fragment, voice snippet, and mosaic anchor
 * referenced throughout the 5 Narrative Acts.
 *
 * Chronological sequence finalised Feb 2026.
 *
 * Coordinate convention:
 *   - `lat` / `lng`  — real-world GPS (WGS-84)
 *   - `svgX` / `svgY` — projected position inside the Act II SVG viewBox (1200×800)
 *   - `tileX` / `tileY` — pixel offset inside the 8K mosaic (7680×4320)
 *
 * `labelAnchor` controls which side of the dot the label sits on,
 *  preventing collision inside clusters.  n = above, s = below,
 *  e = right (default), w = left.
 */

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

/** Narrative phases in strict chronological order */
export type Phase =
  | 'nepal-roots'      // June — Kathmandu origins
  | 'transit'          // Westward flights (DOH → MIA)
  | 'washburn'         // Topeka campus foundations
  | 'the-date'         // Nov 15 — First date sequence
  | 'residential'      // Settled life — housing transitions
  | 'nebraska'         // Omaha expansion arc
  | 'global-loop'      // Eastward world tour
  | 'return'           // Transit back to Topeka
  | 'peak';            // Jan 30 2026 — Denver / Sapphire Point

/** Direction the label sits relative to the node dot. */
export type LabelAnchor = 'n' | 's' | 'e' | 'w';

/** Vehicle / movement mode for the Act II POV cockpit. */
export type Transport = 'plane' | 'car' | 'walking';

/** Scenery biome that determines the parallax background layers. */
export type Biome = 'nepal' | 'topeka' | 'colorado' | 'global';

/**
 * A single time-of-day sky phase used by Act V's live gradient.
 * All color values are hex strings within the umber/ember palette.
 */
export interface SkyProfile {
  /** Identifier for this phase */
  readonly phase: 'night' | 'dawn' | 'morning' | 'day' | 'golden' | 'twilight';
  /** Human-readable label */
  readonly label: string;
  /**
   * Inclusive start hour in Topeka local time (0–23).
   * If hourStart > hourEnd, the phase wraps midnight.
   */
  readonly hourStart: number;
  /** Exclusive end hour (0–23). */
  readonly hourEnd: number;
  /** Top-of-sky gradient stop (hex) */
  readonly topColor: string;
  /** Mid-sky gradient stop at ~55% height (hex) */
  readonly midColor: string;
  /** Horizon-level gradient stop (hex) */
  readonly bottomColor: string;
}

/** Data for a pinned memory-card overlay shown at milestone stops. */
export interface MemoryCard {
  title: string;
  body: string;
  /** Path to a grayscale photo asset (relative to /public). */
  photo?: string;
}

export interface Milestone {
  id: string;
  /** Short display label */
  label: string;
  lat: number;
  lng: number;
  svgX: number;
  svgY: number;
  description: string;
  phase: Phase;
  /** Calendar date when applicable (ISO 8601 partial) */
  date?: string;
  /** Named story milestone, if any */
  storyMilestone?: string;
  /** Named interaction / micro-animation, if any */
  interaction?: string;
  /** Chronological order within the full journey (1-based) */
  order: number;
  /** Side of the dot where the label sits (default: 'e') */
  labelAnchor?: LabelAnchor;

  // ── Act II Vehicle-POV fields ──

  /** How the journey moves through this node. */
  transport: Transport;
  /** Which parallax biome to render behind the cockpit. */
  biome: Biome;
  /**
   * Terrain elevation for continuous ground-line morphing (0→1).
   * 0 = dead flat (Topeka plains), 1 = high peaks (Himalaya / Rockies).
   * Used by TerrainLine to interpolate the ground contour between nodes.
   */
  elevation: number;
  /** If true, the scroll pins here and a MemoryCard is shown. */
  isMilestoneStop?: boolean;
  /** Content for the pinned MemoryCard overlay. */
  memoryCard?: MemoryCard;
}

export interface MosaicAnchor {
  label: string;
  description: string;
  tileX: number;
  tileY: number;
}

export interface VoiceSnippet {
  id: string;
  label: string;
  audioFile: string;
  description: string;
}

export interface LetterFragment {
  id: number;
  text: string;
}

/** Key dates referenced by the Gatekeeper and throughout the app */
export interface KeyDate {
  id: string;
  label: string;
  date: string;        // ISO partial — e.g. '2024-06' or '2024-11-15'
  description: string;
}

// ──────────────────────────────────────────────
// Global Config
// ──────────────────────────────────────────────

export const globalConfig = {
  /** Topeka, KS — used for Act V sky gradient */
  topeka: { lat: 39.0473, lng: -95.6752 },

  /** Design system palette (mirrors CSS custom properties) */
  colors: {
    umber: '#1A1816',
    silk: '#EBE7E0',
    ember: '#C79A93',
  },

  /** GSAP timing constants */
  timing: {
    audioFadeIn: 0.5,        // seconds — Act I greeting fade-in
    gateExhale: 1.8,         // seconds — Act I → Act II transition
    opticalSnap: 0.8,        // seconds — Act III blur→focus
    mosaicZoomOut: 18,       // seconds — Act III auto zoom-out reveal
    inkStagger: 0.045,       // seconds — Act IV char stagger
    heartbeatInterval: 1000, // ms — Act IV vibrate interval (60 BPM)
    heartbeatPulse: 10,      // ms — vibrate pulse length
    skyRefresh: 60_000,      // ms — Act V gradient recalc
  },

  /** Mosaic tiling */
  mosaic: {
    cols: 8,
    rows: 10,
    tileWidth: 1728,
    tileHeight: 1728,
    fullWidth: 13824,
    fullHeight: 17280,
  },
} as const;

// ──────────────────────────────────────────────
// Act V — Sky Profiles (Topeka Time-of-Day)
// ──────────────────────────────────────────────
// Six phases mapped to Topeka local hour ranges (America/Chicago).
// Colors stay strictly within the umber/ember palette — the sky is
// always dark (umber-based); the ember band simply brightens or dims
// depending on how close we are to sunrise/sunset.
//
// Consumed by: src/hooks/useTopekaSky.ts → src/components/HorizonSky.tsx

export const skyProfiles: SkyProfile[] = [
  {
    phase: 'night',
    label: 'Night',
    hourStart: 21,
    hourEnd: 5, // wraps midnight → handled by hook
    topColor:    '#1A1816', // umber
    midColor:    '#1C1A17',
    bottomColor: '#1F1C19', // barely-there warmth
  },
  {
    phase: 'dawn',
    label: 'Dawn',
    hourStart: 5,
    hourEnd: 7,
    topColor:    '#1A1816', // umber
    midColor:    '#2D1E1A',
    bottomColor: '#5C3028', // faint ember blush cresting the horizon
  },
  {
    phase: 'morning',
    label: 'Morning',
    hourStart: 7,
    hourEnd: 10,
    topColor:    '#1C1A18',
    midColor:    '#3B2820',
    bottomColor: '#7A4B45', // warm ember horizon, full-strength
  },
  {
    phase: 'day',
    label: 'Day',
    hourStart: 10,
    hourEnd: 16,
    topColor:    '#1C1B19',
    midColor:    '#241F1C',
    bottomColor: '#2F2622', // cool, subtle — sky at rest
  },
  {
    phase: 'golden',
    label: 'Golden Hour',
    hourStart: 16,
    hourEnd: 19,
    topColor:    '#1A1816', // umber
    midColor:    '#3A2218',
    bottomColor: '#8A5248', // richest ember — the peak of the day's warmth
  },
  {
    phase: 'twilight',
    label: 'Twilight',
    hourStart: 19,
    hourEnd: 21,
    topColor:    '#1A1816', // umber
    midColor:    '#2E1E1C',
    bottomColor: '#6B3C3A', // deep ember — sky holding the last light
  },
];

// ──────────────────────────────────────────────
// Key Dates (for Gatekeeper + narrative anchors)
// ──────────────────────────────────────────────

export const keyDates: KeyDate[] = [
  {
    id: 'first-meet',
    label: 'First Meet',
    date: '2024-06',
    description: 'The one-in-a-million coincidence at Prabhu Bank, Newroad.',
  },
  {
    id: 'first-date',
    label: 'First Date',
    date: '2024-11-15',
    description: 'Downtown Topeka to Papa Johns to Carnegie — the pizza that fell apart.',
  },
  {
    id: 'internship-start',
    label: 'Internship Start',
    date: '2025-05-27',
    description: 'A new chapter begins.',
  },
  {
    id: 'denver-peak',
    label: 'Denver Peak',
    date: '2026-01-30',
    description: 'Sapphire Point — the overlook where the world held its breath.',
  },
];

// ──────────────────────────────────────────────
// Act II — Full Chronological Journey
// ──────────────────────────────────────────────
//
// The meridian path draws through these nodes in
// strict order. `phase` encodes the narrative arc
// (stay vs. transit) for visual treatment in Act II.
//
// svgX / svgY have been tuned so that:
//   - Global nodes are well-spaced across the 1200×800 canvas
//   - The Topeka cluster (orders 5–11) is spread across a
//     ~70×85 pixel area so labels don't collide
//   - Carnegie's two visits (foundation + pizza) are merged
//     into one node with both storyMilestone and interaction
//   - Each node has a labelAnchor to stagger placement

export const milestones: Milestone[] = [

  // ────── 1. Nepal Roots (June) ──────

  {
    id: 'istl-nepal',
    label: 'ISTL Nepal',
    lat: 27.7105,
    lng: 85.3430,
    svgX: 690,
    svgY: 390,
    description: 'Where we first met! We did not know each other, I was nervous for my interview and you were looking for housing options. I wish I could go back to that moment and tell myself what was about to happen.',
    phase: 'nepal-roots',
    date: '2024-06',
    labelAnchor: 'e',
    order: 1,
    transport: 'walking',
    biome: 'nepal',
    elevation: 0.70,
  },

  {
    id: 'prabhu-bank',
    label: 'Prabhu Bank',
    lat: 27.7050,
    lng: 85.3131,
    svgX: 672,
    svgY: 415,
    description: 'Out of all the all the banks, Maili didi had an account in Prabhu Bank. And we were somewhere we would never be. Maybe it was destiny, we both happened to be there at the same time. We had no idea what was about to happen, but it was the start of something that would change everything.',
    phase: 'nepal-roots',
    date: '2024-06',
    storyMilestone: 'One in a Million',
    labelAnchor: 'w',
    order: 2,
    transport: 'walking',
    biome: 'nepal',
    elevation: 0.70,
    isMilestoneStop: true,
    memoryCard: {
      title: 'One in a Million',
      body: 'To be honest, we were lost and got there searching Prabhu Bank',
    },
  },

  // ────── 2. The Westward Transit ──────

  {
    id: 'doha-transit',
    label: 'Doha',
    lat: 25.2609,
    lng: 51.5651,
    svgX: 610,
    svgY: 450,
    description: 'You helped me to navigate the airport, I had already liked you in ISTL but the way you handled all of the rest of us, I was a fan!',
    phase: 'transit',
    labelAnchor: 's',
    order: 3,
    transport: 'plane',
    biome: 'global',
    elevation: 0.30,
  },

  {
    id: 'miami-transit',
    label: 'Miami',
    lat: 25.7959,
    lng: -80.2870,
    svgX: 320,
    svgY: 485,
    description: 'Transit in Miami was a blur, but I remember you asking me if I was okay after I fained mid-flight. I did not mean to be rude if I was.',
    phase: 'transit',
    labelAnchor: 's',
    order: 4,
    transport: 'plane',
    biome: 'global',
    elevation: 0.05,
  },

  // ────── 3. Topeka Foundations (Washburn — spread) ──────

  {
    id: 'stoffer',
    label: 'Stoffer',
    lat: 39.0418,
    lng: -95.6959,
    svgX: 258,
    svgY: 340,
    description: 'Our first class together, and we both did not know what was about to happen to us. There was no "us" yet!',
    phase: 'washburn',
    labelAnchor: 'w',
    order: 5,
    transport: 'walking',
    biome: 'topeka',
    elevation: 0.05,
  },

  {
    id: 'carnegie',
    label: 'Carnegie',
    lat: 39.0405,
    lng: -95.6949,
    svgX: 290,
    svgY: 360,
    description: 'We spent so many hours together in Carnagie, I loved being with you there. I would do anything to have that again! I cannot pick a single moment there, because it was the whole experience that I loved. The late nights, the pizza, the studying, the talking, the laughing. Everything.',
    phase: 'washburn',
    storyMilestone: 'The Long Hours',
    interaction: 'The Pizza Swirl',
    labelAnchor: 'e',
    order: 6,
    transport: 'walking',
    biome: 'topeka',
    elevation: 0.05,
  },

  // ────── 4. The Date — Nov 15 ──────

  {
    id: 'capitol-downtown',
    label: 'Capitol',
    lat: 39.0483,
    lng: -95.6781,
    svgX: 315,
    svgY: 315,
    description: 'Our first date! My first date ever! I was so nervous, but you just brought the best in me. It was such a beautiful day, and I will forever hate my acrophobia for not letting us go to the top. I wish I could go back to that day and tell myself to just enjoy it, because it was perfect.',
    phase: 'the-date',
    date: '2024-11-15',
    labelAnchor: 'n',
    order: 7,
    transport: 'car',
    biome: 'topeka',
    elevation: 0.05,
    isMilestoneStop: true,
    memoryCard: {
      title: 'November 15th',
      body: 'If I had a time machine, I would visit November 15th again in a heartbeat. It was the best day of my life, and I want to experience it again and again.',
      photo: '/mosaic/capitol-date.jpeg',
    },
  },
  {
    id: 'papa-johns',
    label: 'Papa Johns',
    lat: 39.0340,
    lng: -95.6940,
    svgX: 268,
    svgY: 378,
    description: 'Remember we got two large pizzas and we swingged them while taking to Carnagie to eat?',
    phase: 'the-date',
    date: '2024-11-15',
    labelAnchor: 'w',
    order: 8,
    transport: 'car',
    biome: 'topeka',
    elevation: 0.05,
    isMilestoneStop: true,
    memoryCard: {
      title: 'The Pizza Incident',
      body: 'And remember when we opened the pizza box and the pizza was just dough and toppings? Made it more memorable.',
    },
  },

  // ────── 5. Residential Growth ──────

  {
    id: 'university-heights',
    label: 'University Heights',
    lat: 39.0440,
    lng: -95.6920,
    svgX: 322,
    svgY: 342,
    description: 'You giving me a place to live when my roommates were assholes. I never truly appreciated everything you have done for me. I am so grate for you and everything you have done for me.',
    phase: 'residential',
    labelAnchor: 'e',
    order: 9,
    transport: 'walking',
    biome: 'topeka',
    elevation: 0.05,
  },

  {
    id: 'university-heights',
    label: '1617 SW Mulvane',
    lat: 39.0440,
    lng: -95.6920,
    svgX: 322,
    svgY: 342,
    description: 'We officially started living together here! I loved living with you, though you did not very much! I enjoyed every moment with you.',
    phase: 'residential',
    labelAnchor: 'e',
    order: 9,
    transport: 'walking',
    biome: 'topeka',
    elevation: 0.05,
  },


    // ────── 6. Nebraska Expansion ──────

  {
    id: 'omaha-zoo',
    label: 'Omaha Zoo',
    lat: 41.2260,
    lng: -95.9277,
    svgX: 260,
    svgY: 255,
    description: 'Our first road trip together! Though I was a dick at one point, we still had a lot of fun!',
    phase: 'nebraska',
    labelAnchor: 'w',
    order: 12,
    transport: 'car',
    biome: 'global',
    elevation: 0.08,
  },

  {
    id: 'downtown-omaha',
    label: 'Downtown Omaha',
    lat: 41.2565,
    lng: -95.9345,
    svgX: 280,
    svgY: 232,
    description: 'We had dinner in an indian resturant, I dont have a lot to say here.',
    phase: 'nebraska',
    labelAnchor: 'e',
    order: 13,
    transport: 'car',
    biome: 'global',
    elevation: 0.08,
  },


  {
    id: 'washburn-north',
    label: 'Washburn North',
    lat: 39.0500,
    lng: -95.6940,
    svgX: 248,
    svgY: 305,
    description: 'Our own cute little apartment (if we ignore Christina). Bitter Sweet memories!',
    phase: 'residential',
    labelAnchor: 'w',
    order: 10,
    transport: 'walking',
    biome: 'topeka',
    elevation: 0.05,
  },

  // ────── 7. The Global Loop (Eastward) ──────

  {
    id: 'chicago-navy-pier',
    label: 'Chicago',
    lat: 41.8917,
    lng: -87.6086,
    svgX: 335,
    svgY: 268,
    description: 'Our first night at Chicago was not so great, it was cold during the night. But the next day at Navy Pier was great! I wish we could have stayed longer to get into the ferris wheel.',
    phase: 'global-loop',
    labelAnchor: 'n',
    order: 14,
    transport: 'plane',
    biome: 'global',
    elevation: 0.10,
    memoryCard: {
      title: 'Chicago Blues',
      body: 'look at you!!!',
      photo: '/mosaic/chicago.jpeg',
    },
  },

  {
    id: 'hong-kong-hyatt',
    label: 'Hong Kong',
    lat: 22.2930,
    lng: 114.1720,
    svgX: 845,
    svgY: 425,
    description: 'Hong Kong was such a fun trip! Our first "Skyscraper" experience. Though the food was not great and we had to rely on Ramen, we still had fun and the hotel upgrade was just cherry on top!',
    phase: 'global-loop',
    labelAnchor: 'e',
    order: 15,
    transport: 'plane',
    biome: 'global',
    elevation: 0.30,
    memoryCard: {
      title: 'Hong Kong Highs',
      body: 'Look at you and the skyline!!!',
      photo: '/mosaic/hongkong.jpeg',
    },
  },

  {
    id: 'hong-kong-ferry',
    label: 'Star Ferry',
    lat: 22.2855,
    lng: 114.1577,
    svgX: 830,
    svgY: 458,
    description: 'The star ferry was such a fun experience, I wish we could have done it more than once! I loved the view of the skyline from the water, and it was just a fun way to get around.',
    phase: 'global-loop',
    labelAnchor: 's',
    order: 16,
    transport: 'walking',
    biome: 'global',
    elevation: 0.05,
    memoryCard: {
      title: 'Star Ferry',
      body: 'Just look at that view, and you!',
      photo: '/mosaic/star-ferry.jpeg',
    }
  },

  {
    id: 'kathmandu',
    label: 'Fun Park',
    lat: 27.6850,
    lng: 85.3200,
    svgX: 702,
    svgY: 430,
    description: 'You took me to Kathmandu Fun Park, though I dont want to do the columbus again, I still loved to hold your hands when my ass was busting.',
    phase: 'global-loop',
    labelAnchor: 's',
    order: 17,
    transport: 'car',
    biome: 'nepal',
    elevation: 0.65,
  },

  {
    id: 'boudha-stupa',
    label: 'Boudha Stupa',
    lat: 27.7215,
    lng: 85.3620,
    svgX: 715,
    svgY: 378,
    description: 'I had you meet my mom here. And I wanted to show her who you were, how you were, and I loved you! I think she knew! She admires you!',
    phase: 'global-loop',
    labelAnchor: 'n',
    order: 18,
    transport: 'walking',
    biome: 'nepal',
    elevation: 0.70,
    isMilestoneStop: true,
    memoryCard: {
      title: 'Full Circle',
      body: 'It was just for you to meet my mom, and my khadus thulomummy, sorry about her eating your fried mushrooms.',
    },
  },

  // ────── 8. The Return Journey ──────

  {
    id: 'hkg-return',
    label: 'HKG Transit',
    lat: 22.3080,
    lng: 113.9185,
    svgX: 822,
    svgY: 478,
    description: 'Then came the long journey back. Thank you so much for the McDonalds sandwich that you got us even though you got lost.',
    phase: 'return',
    labelAnchor: 'e',
    order: 19,
    transport: 'plane',
    biome: 'global',
    elevation: 0.15,
  },

  {
    id: 'ord-return',
    label: 'O\'Hare',
    lat: 41.9742,
    lng: -87.9073,
    svgX: 345,
    svgY: 248,
    description: 'we were both tensed because of immigration, but you handled it like a pro!',
    phase: 'return',
    labelAnchor: 'n',
    order: 20,
    transport: 'plane',
    biome: 'global',
    elevation: 0.10,
  },

  {
    id: 'mci-arrival',
    label: 'MCI Arrival',
    lat: 39.2976,
    lng: -94.7139,
    svgX: 308,
    svgY: 290,
    description: 'Kansas City! Almost home! And christina should have been not late!',
    phase: 'return',
    labelAnchor: 'e',
    order: 21,
    transport: 'plane',
    biome: 'global',
    elevation: 0.08,
  },

  {
    id: 'washburn-south',
    label: 'Washburn South',
    lat: 39.0380,
    lng: -95.6950,
    svgX: 275,
    svgY: 408,
    description: 'Moved to washburn south! I hated that I had to live without you in my room even though you busted my ass and made me clean the room everyday which you still do, but I like it!',
    phase: 'return',
    labelAnchor: 's',
    order: 22,
    transport: 'car',
    biome: 'topeka',
    elevation: 0.05,
  },

  // ────── 9. Current Peak — Jan 30, 2026 ──────

  {
    id: 'denver',
    label: 'Denver',
    lat: 39.7392,
    lng: -104.9903,
    svgX: 215,
    svgY: 290,
    description: 'Our second trip! I loved Denver, and you cannot stop thinking moving there. I wish we had more time, and try not to leave your phone in a rental please. I cannot run anymore!',
    phase: 'peak',
    date: '2026-01-30',
    labelAnchor: 'w',
    order: 23,
    transport: 'car',
    biome: 'colorado',
    elevation: 0.55,
  },

  {
    id: 'sapphire-point',
    label: 'Sapphire Point',
    lat: 39.4658,
    lng: -106.0465,
    svgX: 195,
    svgY: 315,
    description: 'It was just breathtaking, the view, the air, and you. I am so grateful for that moment with you.',
    phase: 'peak',
    date: '2026-01-30',
    storyMilestone: 'The Peak',
    labelAnchor: 'w',
    order: 24,
    transport: 'car',
    biome: 'colorado',
    elevation: 0.90,
    isMilestoneStop: true,
    memoryCard: {
      title: 'The Peak',
      body: 'I wish to have trips like this more often. Just you and me, and the world.',
      photo: '/mosaic/sapphire-point.jpeg',
    },
  },
];

// ──────────────────────────────────────────────
// Act II — Derived Helpers
// ──────────────────────────────────────────────

/** All milestone nodes that pin and reveal a MemoryCard. */
export const milestoneStops = milestones.filter((m) => m.isMilestoneStop);

/** Total journey node count (used for ScrollTrigger math). */
export const JOURNEY_NODE_COUNT = milestones.length;

// ── Journey Segments (consecutive runs sharing the same transport) ──

export interface Segment {
  transport: Transport;
  /** Inclusive start index into milestones[]. */
  startIndex: number;
  /** Exclusive end index into milestones[]. */
  endIndex: number;
}

function computeSegments(): Segment[] {
  const segs: Segment[] = [];
  let cur: Segment | null = null;

  milestones.forEach((m, i) => {
    if (!cur || cur.transport !== m.transport) {
      if (cur) segs.push(cur);
      cur = { transport: m.transport, startIndex: i, endIndex: i + 1 };
    } else {
      cur.endIndex = i + 1;
    }
  });

  if (cur) segs.push(cur);
  return segs;
}

export const segments = computeSegments();

// ── Scroll Map (accounts for milestone-stop pin durations) ──

export interface ScrollMap {
  /** Start position (in vh) of each milestone node. */
  nodeStartVh: number[];
  /** Total scroll height (vh) for the Act II stage. */
  totalVh: number;
}

/**
 * Build a lookup mapping each milestone to its scroll-start (vh),
 * accounting for extra runway added by milestone-stop pins.
 */
function buildScrollMap(vhPerNode = 100, pinVh = 240): ScrollMap {
  const nodeStartVh: number[] = [];
  let cursor = 0;

  milestones.forEach((m) => {
    nodeStartVh.push(cursor);
    cursor += vhPerNode;
    if (m.isMilestoneStop) {
      cursor += pinVh;
    }
  });

  // Extra runway so the last node can fully exit the viewport
  // before Act III begins (one full node-width of scroll).
  cursor += vhPerNode;

  return { nodeStartVh, totalVh: cursor };
}

export const scrollMap = buildScrollMap();

// ──────────────────────────────────────────────
// Act III — Mosaic Guided-Tour Anchors
// ──────────────────────────────────────────────

export const mosaicAnchors: MosaicAnchor[] = [
  {
    label: 'Roots',
    description: 'A tile of the Kathmandu origin.',
    tileX: 960,
    tileY: 1620,
  },
  {
    label: 'Coincidence',
    description: 'A tile of the Newroad encounter.',
    tileX: 2880,
    tileY: 1080,
  },
  {
    label: 'The Summit',
    description: 'A tile of the Sapphire Point view.',
    tileX: 5760,
    tileY: 540,
  },
  {
    label: 'The Whole',
    description: 'The camera pulls back to reveal the full mosaic.',
    tileX: 3840,
    tileY: 2160,
  },
];

// ──────────────────────────────────────────────
// Act IV — Letter Fragments
// ──────────────────────────────────────────────

export const letterFragments: LetterFragment[] = [
  { id: 1, text: 'There are things I never really said out loud.' },
  { id: 2, text: 'Not because I didn’t feel them,' },
  { id: 3, text: 'but because I didn’t want to make them smaller by turning them into words.' },
  { id: 4, text: 'You came into my life in a way I wasn’t expecting.' },
  { id: 5, text: 'And somehow, after that, everything started to line up a little better.' },
  { id: 6, text: 'We met in a way that still feels unlikely to me.' },
  { id: 7, text: 'Two people crossing the same stretch of time without knowing it.' },
  { id: 8, text: 'Topeka was just another location, but with you it felt like a beginning.' },
  { id: 9, text: 'I think about the small things more than anything else.' },
  { id: 10, text: 'The way you could walk into a place and change how it felt.' },
  { id: 11, text: 'The quiet that stayed behind after you laughed.' },
  { id: 12, text: 'That pizza that fell apart before we even got a chance to share it.' },
  { id: 13, text: 'We walked through buildings named after people we’d never meet,' },
  { id: 14, text: 'and somehow they started to feel like ours.' },
  { id: 15, text: 'Stoffer. Carnegie. Morgan. Just names on buildings, but they hold memories now.' },
  { id: 16, text: 'The world kept getting bigger — Chicago, Hong Kong, Denver' },
  { id: 17, text: 'but it never really pulled us apart in the ways that mattered.' },
  { id: 18, text: 'At Denver, with the sky opening up in front of us,' },
  { id: 19, text: 'I realized something I’d been feeling for a long time.' },
  { id: 20, text: 'Some people don’t complete you.' },
  { id: 21, text: 'They remind you that you were already whole.' },
  { id: 22, text: 'Being with you just made that easier to believe.' },
  { id: 23, text: 'This isn’t really a love letter.' },
  { id: 24, text: 'It’s just me saying thank you, in the only way I know how.' },
  { id: 25, text: 'For being you, and for letting me be a part of it.' },
  { id: 26, text: 'You are THE BEST!' },
];

// ──────────────────────────────────────────────
// Act IV — Voice Snippets (Acoustic Ghosts)
// ──────────────────────────────────────────────

export const voiceSnippets: VoiceSnippet[] = [
  {
    id: 'vs-01',
    label: 'Nickname whisper',
    audioFile: '/audio/snippet-nickname.m4a',
    description: 'A softly whispered nickname.',
  },
  {
    id: 'vs-02',
    label: 'Laugh fragment',
    audioFile: '/audio/snippet-laugh.m4a',
    description: 'A two-second burst of candid laughter.',
  },
  {
    id: 'vs-03',
    label: '"Remember?"',
    audioFile: '/audio/snippet-remember.m4a',
    description: 'A single word: "Remember?"',
  },
  // ── Placeholder entries — add audio files to public/audio to enable ──
  // {
  //   id: 'vs-04',
  //   label: 'Inside joke',
  //   audioFile: '/audio/snippet-inside-joke.m4a',
  //   description: 'A murmured inside joke — context optional.',
  // },
  // {
  //   id: 'vs-05',
  //   label: 'Humming',
  //   audioFile: '/audio/snippet-humming.m4a',
  //   description: 'A few bars hummed under breath.',
  // },
  // {
  //   id: 'vs-06',
  //   label: '"Look at this"',
  //   audioFile: '/audio/snippet-look.m4a',
  //   description: '"Look at this" — barely audible, full of wonder.',
  // },
  // {
  //   id: 'vs-07',
  //   label: 'Goodnight',
  //   audioFile: '/audio/snippet-goodnight.m4a',
  //   description: 'A quiet "goodnight" trailing off.',
  // },
  // {
  //   id: 'vs-08',
  //   label: 'Breath',
  //   audioFile: '/audio/snippet-breath.m4a',
  //   description: 'Just a breath — presence without words.',
  // },
];

// ──────────────────────────────────────────────
// Act V — Final Message
// ──────────────────────────────────────────────

export const finalMessage =
  'Different paths, same light. Wherever the next chapter takes us, the sky remains the same.';
