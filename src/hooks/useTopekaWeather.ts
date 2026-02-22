/**
 * useTopekaWeather — Act V Live Weather State
 * ==============================================
 * Fetches current weather data for Topeka, KS from WeatherAPI
 * and maps the condition to one of 10 visual sky states.
 *
 * Returns:
 *   skyState      — one of 10 weather-driven visual states
 *   gradient      — 3-stop gradient palette for the current state
 *   conditionText — human-readable weather condition
 *   isDay         — whether it's currently daytime in Topeka
 *
 * Falls back to time-based clear day/night if VITE_WEATHER_API_KEY
 * is missing or the API fetch fails.
 *
 * Environment variable:
 *   VITE_WEATHER_API_KEY — WeatherAPI key (required for live data)
 *
 * Refresh cadence: every 10 minutes (WeatherAPI free-tier safe).
 */

import { useState, useEffect, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────

export type WeatherSkyState =
  | 'clear-day'
  | 'clear-night'
  | 'partly-cloudy-day'
  | 'partly-cloudy-night'
  | 'cloudy'
  | 'rain'
  | 'heavy-rain'
  | 'thunderstorm'
  | 'snow'
  | 'fog';

export interface WeatherGradient {
  /** Top-of-sky gradient stop (hex) */
  top: string;
  /** Mid-sky gradient stop at ~55 % height (hex) */
  mid: string;
  /** Horizon-level gradient stop (hex) */
  bottom: string;
}

export interface WeatherData {
  skyState: WeatherSkyState;
  gradient: WeatherGradient;
  conditionText: string;
  isDay: boolean;
}

// ── Gradient Palettes ─────────────────────────────────────────────────────
// Muted, editorial gradients that harmonise with the umber / silk / ember
// palette while conveying weather mood and time-of-day.

export const WEATHER_GRADIENTS: Record<WeatherSkyState, WeatherGradient> = {
  'clear-day':           { top: '#2A3A4A', mid: '#5B6B6A', bottom: '#C8A882' },
  'clear-night':         { top: '#0E1015', mid: '#151820', bottom: '#1F1C19' },
  'partly-cloudy-day':   { top: '#3A4A55', mid: '#6B7B7A', bottom: '#B09878' },
  'partly-cloudy-night': { top: '#121520', mid: '#1E2030', bottom: '#2A2520' },
  'cloudy':              { top: '#2E2E2E', mid: '#3E3B38', bottom: '#4A4540' },
  'rain':                { top: '#1E2530', mid: '#2E3540', bottom: '#3A3E42' },
  'heavy-rain':          { top: '#141820', mid: '#1E2530', bottom: '#2A2E32' },
  'thunderstorm':        { top: '#0E1018', mid: '#1A1E28', bottom: '#2E2828' },
  'snow':                { top: '#3A3E45', mid: '#5A5E62', bottom: '#7A7872' },
  'fog':                 { top: '#3A3835', mid: '#4A4845', bottom: '#5A5855' },
};

// ── WeatherAPI condition-code mapping ─────────────────────────────────────

const THUNDER_CODES = new Set([1087, 1273, 1276, 1279, 1282]);

const SNOW_CODES = new Set([
  1066, 1069, 1072, 1114, 1117, 1204, 1207,
  1210, 1213, 1216, 1219, 1222, 1225, 1237,
  1249, 1252, 1255, 1258, 1261, 1264,
]);

const HEAVY_RAIN_CODES = new Set([1192, 1195, 1243, 1246]);

const LIGHT_RAIN_CODES = new Set([
  1063, 1150, 1153, 1168, 1171, 1180,
  1183, 1186, 1189, 1198, 1201, 1240,
]);

const FOG_CODES = new Set([1030, 1135, 1147]);

const CLOUDY_CODES = new Set([1006, 1009]);

function mapConditionToSkyState(code: number, isDay: boolean): WeatherSkyState {
  if (code === 1000) return isDay ? 'clear-day' : 'clear-night';
  if (code === 1003) return isDay ? 'partly-cloudy-day' : 'partly-cloudy-night';
  if (CLOUDY_CODES.has(code))     return 'cloudy';
  if (FOG_CODES.has(code))        return 'fog';
  if (THUNDER_CODES.has(code))    return 'thunderstorm';
  if (SNOW_CODES.has(code))       return 'snow';
  if (HEAVY_RAIN_CODES.has(code)) return 'heavy-rain';
  if (LIGHT_RAIN_CODES.has(code)) return 'rain';
  // Unknown code — safe fallback based on time-of-day
  return isDay ? 'partly-cloudy-day' : 'partly-cloudy-night';
}

// ── Fallback (no API key / fetch failure) ─────────────────────────────────

function getTopekaIsDay(): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '12', 10) % 24;
  return hour >= 6 && hour < 20;
}

function fallbackData(): WeatherData {
  const isDay = getTopekaIsDay();
  const skyState: WeatherSkyState = isDay ? 'clear-day' : 'clear-night';
  return {
    skyState,
    gradient: WEATHER_GRADIENTS[skyState],
    conditionText: 'Clear',
    isDay,
  };
}

// ── Constants ─────────────────────────────────────────────────────────────

const API_KEY    = import.meta.env.VITE_WEATHER_API_KEY as string | undefined;
const QUERY      = 'Topeka,KS';
const REFRESH_MS = 1 * 60 * 60 * 1000; // 1 hour

// ── Hook ──────────────────────────────────────────────────────────────────

export function useTopekaWeather(): WeatherData {
  const [data, setData] = useState<WeatherData>(fallbackData);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!API_KEY) {
      console.warn(
        '[useTopekaWeather] VITE_WEATHER_API_KEY is not set — using time-based fallback.',
      );
      return;
    }

    async function fetchWeather() {
      if (busyRef.current) return;
      busyRef.current = true;

      try {
        const res = await fetch(
          `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${QUERY}&aqi=no`,
        );
        if (!res.ok) throw new Error(`WeatherAPI responded ${res.status}`);

        const json = await res.json();
        const c    = json.current;
        const isDay    = c.is_day === 1;
        const skyState = mapConditionToSkyState(c.condition.code, isDay);

        setData({
          skyState,
          gradient: WEATHER_GRADIENTS[skyState],
          conditionText: c.condition.text,
          isDay,
        });
      } catch (err) {
        console.warn('[useTopekaWeather] Fetch failed, retaining previous state:', err);
      } finally {
        busyRef.current = false;
      }
    }

    fetchWeather();
    const id = setInterval(fetchWeather, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  return data;
}
