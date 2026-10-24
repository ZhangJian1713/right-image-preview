import { useCallback } from 'react';
import type { RefObject } from 'react';
import { nextAdaptiveZoom } from './adaptiveZoom';
import { runFlushSync } from '../lib/flushSyncCompat';
import type { ZoomStateActions } from './useZoomState';

interface AdaptiveZoomOptions {
  enabled: boolean;
  viewportRef: RefObject<HTMLDivElement | null>;
  fitEquivalentNativePercent?: number;
  zoomState: ZoomStateActions;
  zoomAnchorTranslate(previousScale: number, nextScale: number, x: number, y: number): void;
}

export function useAdaptiveZoom(options: AdaptiveZoomOptions) {
  const { enabled, viewportRef, fitEquivalentNativePercent, zoomState,
    zoomAnchorTranslate } = options;
  const cycle = useCallback((point?: { x: number; y: number }) => {
    if (!enabled || !fitEquivalentNativePercent || !viewportRef.current) return;
    const current = zoomState.getState(fitEquivalentNativePercent);
    let target = nextAdaptiveZoom(current);
    if (!target && current.mode === 'fit' && fitEquivalentNativePercent > 100) {
      target = zoomState.peekZoomIn(fitEquivalentNativePercent);
    }
    if (!target) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const previousScale = current.mode === 'fit' ? fitEquivalentNativePercent / 100 : current.nativePercent / 100;
    runFlushSync(() => {
      if (target.mode === 'fit') zoomState.fit();
      else {
        zoomAnchorTranslate(previousScale, target.percent / 100,
          point ? point.x - rect.left - rect.width / 2 : 0,
          point ? point.y - rect.top - rect.height / 2 : 0);
        zoomState.setNative(target.percent);
      }
    });
  }, [enabled, viewportRef, fitEquivalentNativePercent, zoomState, zoomAnchorTranslate]);

  const state = { mode: zoomState.mode, nativePercent: zoomState.nativePercent, fitEquivalentNativePercent };
  const nextTarget = nextAdaptiveZoom(state);
  const nextScale = nextTarget?.mode === 'native'
    ? nextTarget.percent / 100
    : (fitEquivalentNativePercent ?? 100) / 100;
  return {
    cycle,
    nextTarget,
    nextScale,
  };
}
