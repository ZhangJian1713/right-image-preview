import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { nextAdaptiveZoom, type AdaptiveZoomTarget } from './adaptiveZoom';
import { runFlushSync } from './flushSyncCompat';
import type { ZoomStateActions } from './useZoomState';

interface AdaptiveZoomOptions {
  enabled: boolean;
  resourceKey: string;
  viewportRef: RefObject<HTMLDivElement | null>;
  fitEquivalentNativePercent?: number;
  zoomState: ZoomStateActions;
  zoomAnchorTranslate(previousScale: number, nextScale: number, x: number, y: number): void;
}

export function useAdaptiveZoom(options: AdaptiveZoomOptions) {
  const { enabled, resourceKey, viewportRef, fitEquivalentNativePercent, zoomState,
    zoomAnchorTranslate } = options;
  const scope = useMemo(() => ({ resourceKey, enabled }), [resourceKey, enabled]);
  const [hint, setHint] = useState<{ scope: object; target: AdaptiveZoomTarget } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), [resourceKey, enabled]);

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
      setHint({ scope, target });
    });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHint(null), 900);
  }, [enabled, scope, viewportRef, fitEquivalentNativePercent, zoomState, zoomAnchorTranslate]);

  const state = { mode: zoomState.mode, nativePercent: zoomState.nativePercent, fitEquivalentNativePercent };
  const nextTarget = nextAdaptiveZoom(state);
  const nextScale = nextTarget?.mode === 'native'
    ? nextTarget.percent / 100
    : (fitEquivalentNativePercent ?? 100) / 100;
  return {
    cycle,
    nextTarget,
    nextScale,
    hintTarget: enabled && hint?.scope === scope ? hint.target : null,
  };
}
