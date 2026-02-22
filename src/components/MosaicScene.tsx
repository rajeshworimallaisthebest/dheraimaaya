import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Application, Sprite, BlurFilter, Assets } from '../lib/pixiSetup';
import { globalConfig } from '../data/STORY_DATA';

interface Props {
  /** CSS pixel width of the canvas area. */
  width: number;
  /** CSS pixel height of the canvas area. */
  height: number;
  /** Enable user interaction (pan/zoom). */
  enableInteraction?: boolean;
  /** Whether the scene is currently active (pause ticker when false). */
  isActive?: boolean;
  /** Fires once when the PixiJS app + all tiles are fully loaded and ready. */
  onReady?: () => void;
}

export interface MosaicSceneHandle {
  setBlur: (radius: number) => void;
  setScale: (scale: number) => void;
  setCamera: (params: { x: number; y: number; scale: number }) => void;
}

const MosaicScene = forwardRef<MosaicSceneHandle, Props>((
  { width, height, enableInteraction = false, isActive = true, onReady },
  ref
) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const blurFilterRef = useRef<BlurFilter | null>(null);
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  
  // Store initial mosaic scale and offset for camera calculations
  const mosaicScaleRef = useRef(1);
  const mosaicOffsetRef = useRef({ x: 0, y: 0 });

  const { rows, cols } = globalConfig.mosaic;

  useImperativeHandle(ref, () => ({
    setBlur: (radius: number) => {
      if (!appRef.current) return;
      if (radius > 0) {
        if (!blurFilterRef.current) {
          blurFilterRef.current = new BlurFilter();
          appRef.current.stage.filters = [blurFilterRef.current];
        }
        blurFilterRef.current.blur = radius;
      } else {
        if (blurFilterRef.current) {
          appRef.current.stage.filters = null;
          blurFilterRef.current = null;
        }
      }
    },
    setScale: (scale: number) => {
      if (!appRef.current) return;
      appRef.current.stage.scale.set(scale);
    },
    setCamera: ({ x, y, scale }: { x: number; y: number; scale: number }) => {
      if (!appRef.current) return;
      const { fullWidth, fullHeight } = globalConfig.mosaic;
      
      // Convert normalized coordinates to pixel space within the SCALED mosaic
      const baseScale = mosaicScaleRef.current;
      const offsetX = mosaicOffsetRef.current.x;
      const offsetY = mosaicOffsetRef.current.y;
      
      const targetX = x * fullWidth * baseScale + offsetX;
      const targetY = y * fullHeight * baseScale + offsetY;
      
      // Position the stage so the target point is centered in the viewport
      appRef.current.stage.x = width / 2 - targetX * scale;
      appRef.current.stage.y = height / 2 - targetY * scale;
      appRef.current.stage.scale.set(scale);
    },
  }));

  useEffect(() => {
    if (!hostRef.current) return;
    if (width <= 0 || height <= 0) return;

    let destroyed = false;

    const init = async () => {
      if (destroyed) return;

      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }

      const app = new Application();
      await app.init({
        width,
        height,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (destroyed) {
        app.destroy(true);
        return;
      }

      appRef.current = app;

      hostRef.current!.innerHTML = '';
      hostRef.current!.appendChild(app.canvas);

      // Pause ticker initially if not active
      if (!isActive) {
        app.ticker.stop();
      }

      const { fullWidth, fullHeight, tileWidth, tileHeight } = globalConfig.mosaic;

      // Calculate scale to fit the full mosaic (6912x8640) into the canvas
      // while preserving aspect ratio
      const scaleX = width / fullWidth;
      const scaleY = height / fullHeight;
      const scale = Math.max(scaleX, scaleY); // Fit to smallest dimension

      // Calculate scaled tile dimensions
      const scaledTileW = tileWidth * scale;
      const scaledTileH = tileHeight * scale;

      // Center the mosaic in the canvas if there's extra space
      const scaledMosaicW = fullWidth * scale;
      const scaledMosaicH = fullHeight * scale;
      const offsetX = (width - scaledMosaicW) / 2;
      const offsetY = (height - scaledMosaicH) / 2;

      // Store for camera calculations
      mosaicScaleRef.current = scale;
      mosaicOffsetRef.current = { x: offsetX, y: offsetY };

      console.log('[MosaicScene] Loading mosaic:', {
        canvasSize: { width, height },
        mosaicSize: { fullWidth, fullHeight },
        scale,
        scaledTileSize: { w: scaledTileW, h: scaledTileH },
        offset: { x: offsetX, y: offsetY }
      });

      // Build array of all tile paths
      const tilePaths: string[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          tilePaths.push(`/mosaic/tile_r${r}_c${c}.webp`);
        }
      }

      // Preload all tiles into PixiJS Assets cache
      try {
        await Assets.load(tilePaths);
        console.log('[MosaicScene] All tiles preloaded');
      } catch (error) {
        console.error('[MosaicScene] Failed to load tiles:', error);
        return;
      }

      if (destroyed) return;

      // Now create sprites from the cached assets with proper positioning
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tilePath = `/mosaic/tile_r${r}_c${c}.webp`;
          const sprite = Sprite.from(tilePath);
          sprite.x = offsetX + c * scaledTileW;
          sprite.y = offsetY + r * scaledTileH;
          sprite.width = scaledTileW;
          sprite.height = scaledTileH;
          app.stage.addChild(sprite);
        }
      }
      
      console.log('[MosaicScene] Mosaic initialized with', rows * cols, 'tiles');

      // Signal parent that the mosaic is ready for camera/blur operations
      onReady?.();
    };

    void init();

    return () => {
      destroyed = true;
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
      if (hostRef.current) {
        hostRef.current.innerHTML = '';
      }
    };
  }, [width, height, rows, cols]);

  // Pause/resume ticker based on active state for performance
  useEffect(() => {
    if (!appRef.current) return;

    if (isActive) {
      appRef.current.ticker.start();
    } else {
      appRef.current.ticker.stop();
    }
  }, [isActive]);

  // Pointer-driven pan and wheel zoom when interaction is enabled
  useEffect(() => {
    if (!enableInteraction || !hostRef.current || !appRef.current) return;

    const host = hostRef.current;
    const app = appRef.current;

    const handlePointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      host.style.cursor = 'grabbing';
      host.style.pointerEvents = 'auto';
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();

      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;

      app.stage.x += dx;
      app.stage.y += dy;

      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      host.style.cursor = 'grab';
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Get mouse position relative to the canvas
      const rect = host.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Get world position before zoom
      const worldPosX = (mouseX - app.stage.x) / app.stage.scale.x;
      const worldPosY = (mouseY - app.stage.y) / app.stage.scale.y;
      
      // Calculate new scale
      const delta = e.deltaY > 0 ? 0.95 : 1.05;
      const oldScale = app.stage.scale.x;
      const newScale = Math.max(0.1, Math.min(30, oldScale * delta));
      
      // Apply new scale
      app.stage.scale.set(newScale);
      
      // Adjust position to zoom towards mouse/touch point
      const newPosX = mouseX - worldPosX * newScale;
      const newPosY = mouseY - worldPosY * newScale;
      
      app.stage.x = newPosX;
      app.stage.y = newPosY;
    };

    host.style.cursor = 'grab';
    host.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    host.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      host.style.cursor = 'default';
      host.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      host.removeEventListener('wheel', handleWheel);
    };
  }, [enableInteraction]);

  return <div ref={hostRef} style={{ width: '100%', height: '100%' }} />;
});

MosaicScene.displayName = 'MosaicScene';

export default MosaicScene;

