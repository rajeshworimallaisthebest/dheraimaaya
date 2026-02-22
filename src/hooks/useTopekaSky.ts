/**
 * useTopekaSky — Act V Live Sky State
 * =====================================
 * Derives the current sky phase from Topeka local time
 * (America/Chicago timezone) and re-evaluates on a
 * configurable interval driven by globalConfig.timing.skyRefresh.
 *
 * Returns a `SkyState` with:
 *   profile     — the active SkyProfile (colors, phase label)
 *   hour        — Topeka local hour 0–23
 *   minute      — Topeka local minute 0–59
 *   progress    — 0→1: how far through the current phase
 *
 * Usage:
 *   const { profile, hour, progress } = useTopekaSky();
 */

import { useState, useEffect } from 'react';
import { globalConfig, skyProfiles } from '../data/STORY_DATA';
import type { SkyProfile } from '../data/STORY_DATA';

// ── Types ─────────────────────────────────────────────────────────────────

export interface SkyState {
  /** The active sky phase profile (colors, label, phase name). */
  profile: SkyProfile;
  /** Current Topeka local hour (0–23). */
  hour: number;
  /** Current Topeka local minute (0–59). */
  minute: number;
  /**
   * How far through the current phase, 0–1.
   * Useful for future micro-interpolation between adjacent phases.
   */
  progress: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Read current Topeka (America/Chicago) hour and minute from Intl.
 * Handles DST automatically — no manual UTC offset needed.
 */
function getTopekaTime(): { hour: number; minute: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  // `hour12: false` returns '24' for midnight in some environments; normalise
  const rawHour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
  const hour    = rawHour % 24;
  const minute  = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
  return { hour, minute };
}

/**
 * Find the SkyProfile that owns the given local hour.
 * Profiles whose hourStart > hourEnd wrap midnight (e.g. night: 21 → 5).
 */
function getProfileForHour(hour: number): SkyProfile {
  for (const profile of skyProfiles) {
    if (profile.hourStart <= profile.hourEnd) {
      // Normal range — e.g. day: 10 → 16
      if (hour >= profile.hourStart && hour < profile.hourEnd) return profile;
    } else {
      // Midnight-wrapping range — e.g. night: 21 → 5
      if (hour >= profile.hourStart || hour < profile.hourEnd) return profile;
    }
  }
  // Fallback: night (should never be reached with a complete skyProfiles array)
  return skyProfiles.find(p => p.phase === 'night') ?? skyProfiles[0];
}

/**
 * Compute 0→1 progress through the given profile based on current h:m.
 */
function getProgress(hour: number, minute: number, profile: SkyProfile): number {
  const fracHour = hour + minute / 60;
  let elapsed: number;
  let total: number;

  if (profile.hourStart <= profile.hourEnd) {
    total   = profile.hourEnd - profile.hourStart;
    elapsed = fracHour - profile.hourStart;
  } else {
    // Midnight-wrapping (night: 21 → 5 = 8 h total)
    total   = 24 - profile.hourStart + profile.hourEnd;
    elapsed = hour >= profile.hourStart
      ? fracHour - profile.hourStart
      : 24 - profile.hourStart + fracHour;
  }

  return Math.min(1, Math.max(0, elapsed / total));
}

/** Build initial SkyState from the current Topeka clock reading. */
function computeSkyState(): SkyState {
  const { hour, minute } = getTopekaTime();
  const profile  = getProfileForHour(hour);
  const progress = getProgress(hour, minute, profile);
  return { profile, hour, minute, progress };
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useTopekaSky(): SkyState {
  const [state, setState] = useState<SkyState>(computeSkyState);

  useEffect(() => {
    // Recompute on the configured interval (default: 60 s)
    const id = setInterval(() => {
      setState(computeSkyState());
    }, globalConfig.timing.skyRefresh);

    return () => clearInterval(id);
  }, []); // interval length is constant; no re-registration needed

  return state;
}
