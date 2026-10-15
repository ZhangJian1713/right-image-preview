import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  FirstZoomInStrategy, NativePercent, ZoomInAtMaxBehaviour, ZoomMode,
  ZoomOutBelowMinBehaviour, ZoomState,
} from './types';

export interface ZoomStateOptions {
  stops: NativePercent[];
  initialMode: ZoomMode;
  initialNativePercent?: NativePercent;
  firstZoomInStrategy: FirstZoomInStrategy;
  zoomOutBelowMinBehaviour: ZoomOutBelowMinBehaviour;
  zoomInAtMaxBehaviour: ZoomInAtMaxBehaviour;
  onZoomChange?: (state: ZoomState) => void;
  onMaxStopReached?: () => void;
}

type ZoomTarget = { mode: ZoomMode; percent: NativePercent };
export interface ZoomStateActions {
  mode: ZoomMode;
  nativePercent: NativePercent;
  zoomIn(fitEquivalentNativePercent?: number): void;
  zoomOut(fitEquivalentNativePercent?: number): void;
  fit(): void;
  setNative(percent: NativePercent): void;
  reset(): void;
  getState(fitEquivalentNativePercent?: number): ZoomState;
  peekZoomIn(fitEquivalentNativePercent?: number): ZoomTarget | null;
  peekZoomOut(fitEquivalentNativePercent?: number): ZoomTarget | null;
}

const positive = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value) && value > 0;

export function useZoomState(options: ZoomStateOptions): ZoomStateActions {
  const {
    stops, initialMode, initialNativePercent, firstZoomInStrategy,
    zoomOutBelowMinBehaviour, zoomInAtMaxBehaviour, onZoomChange, onMaxStopReached,
  } = options;
  const sortedStops = useMemo(() => {
    const valid = [...new Set(stops.filter(positive))].sort((a, b) => a - b);
    return valid.length ? valid : [100];
  }, [stops]);
  const minStop = sortedStops[0];
  const maxStop = sortedStops[sortedStops.length - 1];
  const initialPercent = positive(initialNativePercent)
    ? sortedStops.reduce((best, value) => Math.abs(value - initialNativePercent) <
      Math.abs(best - initialNativePercent) ? value : best)
    : minStop;
  const [state, setState] = useState({ mode: initialMode, nativePercent: initialPercent });
  // Actions update the latest state synchronously; multiple steps in one event compose.
  const stateRef = useRef(state);

  const apply = useCallback((target: ZoomTarget, fitEquivalentNativePercent?: number) => {
    if (!positive(target.percent)) return;
    const next = { mode: target.mode, nativePercent: target.percent };
    stateRef.current = next;
    setState(next);
    onZoomChange?.({ ...next, fitEquivalentNativePercent });
  }, [onZoomChange]);

  const peekZoomIn = useCallback((fitEquivalentNativePercent?: number): ZoomTarget | null => {
    const current = stateRef.current;
    if (current.mode === 'fit') {
      // Fit can already exceed every stop. An attempted zoom-in must not jump down.
      if (positive(fitEquivalentNativePercent) && fitEquivalentNativePercent >= maxStop) return null;
      let percent: number;
      if (firstZoomInStrategy === 'first-stop') percent = minStop;
      else if (firstZoomInStrategy === 'hundred') {
        percent = sortedStops.reduce((best, value) =>
          Math.abs(value - 100) < Math.abs(best - 100) ? value : best);
      } else {
        percent = sortedStops.find((value) => value > (fitEquivalentNativePercent ?? 0)) ?? maxStop;
      }
      return { mode: 'native', percent };
    }
    const percent = sortedStops.find((value) => value > current.nativePercent);
    return percent === undefined ? null : { mode: 'native', percent };
  }, [sortedStops, minStop, maxStop, firstZoomInStrategy]);

  const peekZoomOut = useCallback((fitEquivalentNativePercent?: number): ZoomTarget | null => {
    const current = stateRef.current;
    const effective = current.mode === 'fit' ? fitEquivalentNativePercent : current.nativePercent;
    if (!positive(effective)) return null;
    const percent = [...sortedStops].reverse().find((value) => value < effective);
    if (percent !== undefined) return { mode: 'native', percent };
    return current.mode === 'native' && zoomOutBelowMinBehaviour === 'fit'
      ? { mode: 'fit', percent: current.nativePercent }
      : null;
  }, [sortedStops, zoomOutBelowMinBehaviour]);

  const zoomIn = useCallback((fitEquivalentNativePercent?: number) => {
    const target = peekZoomIn(fitEquivalentNativePercent);
    if (target) apply(target, fitEquivalentNativePercent);
    else if (zoomInAtMaxBehaviour === 'notify') onMaxStopReached?.();
  }, [peekZoomIn, apply, zoomInAtMaxBehaviour, onMaxStopReached]);
  const zoomOut = useCallback((fitEquivalentNativePercent?: number) => {
    const target = peekZoomOut(fitEquivalentNativePercent);
    if (target) apply(target, fitEquivalentNativePercent);
  }, [peekZoomOut, apply]);
  const fit = useCallback(() => {
    apply({ mode: 'fit', percent: stateRef.current.nativePercent });
  }, [apply]);
  const setNative = useCallback((percent: number) => {
    apply({ mode: 'native', percent });
  }, [apply]);
  const reset = useCallback(() => {
    const next = { mode: initialMode, nativePercent: initialPercent };
    stateRef.current = next;
    setState(next);
  }, [initialMode, initialPercent]);
  const getState = useCallback((fitEquivalentNativePercent?: number): ZoomState =>
    ({ ...stateRef.current, fitEquivalentNativePercent }), []);

  return { ...state, zoomIn, zoomOut, fit, setNative, reset, getState, peekZoomIn, peekZoomOut };
}
