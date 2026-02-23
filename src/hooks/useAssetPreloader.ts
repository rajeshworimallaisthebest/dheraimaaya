/**
 * useAssetPreloader — Background Mosaic Tile Loader
 * ===================================================
 * Starts pre-fetching the tiled mosaic images into browser
 * cache / GPU memory after the Act I gate opens.
 *
 * Returns loading progress (0-1) so a subtle indicator
 * can be shown if needed.
 */

import { useState, useCallback, useRef } from 'react';
import { globalConfig } from '../data/STORY_DATA';

interface PreloaderState {
  /** 0 → 1 progress */
  progress: number;
  /** True once all tiles are cached */
  complete: boolean;
  /** True while loading is in-flight */
  loading: boolean;
}

interface UseAssetPreloaderReturn extends PreloaderState {
  /** Kick off the preload. Safe to call multiple times — will no-op after first. */
  startPreload: () => void;
}

/**
 * Generates tile URLs based on the mosaic grid config.
 * Convention: /mosaic/tile_r{row}_c{col}.webp
 */
function getTileUrls(): string[] {
  const { rows, cols } = globalConfig.mosaic;
  const urls: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      urls.push(`${import.meta.env.BASE_URL}mosaic/tile_r${r}_c${c}.webp`);
    }
  }
  return urls;
}

export function useAssetPreloader(): UseAssetPreloaderReturn {
  const [state, setState] = useState<PreloaderState>({
    progress: 0,
    complete: false,
    loading: false,
  });

  const startedRef = useRef(false);

  const startPreload = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const urls = getTileUrls();
    const total = urls.length;
    let loaded = 0;

    setState({ progress: 0, complete: false, loading: true });

    urls.forEach((url) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded++;
        const progress = loaded / total;
        setState({
          progress,
          complete: loaded === total,
          loading: loaded < total,
        });
      };
      img.src = url;
    });
  }, []);

  return { ...state, startPreload };
}
