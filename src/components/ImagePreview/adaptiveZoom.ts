import type { ZoomState } from './types';

export type AdaptiveZoomTarget = { mode: 'fit' } | { mode: 'native'; percent: number };

/** Choose an observation scale without changing wheel or toolbar presets. */
export function nextAdaptiveZoom(state: ZoomState): AdaptiveZoomTarget | null {
  const fit = state.fitEquivalentNativePercent;
  if (fit === undefined || !Number.isFinite(fit) || fit <= 0) return null;
  if (Math.abs(fit - 100) < 0.01) {
    return state.mode === 'fit' || state.nativePercent === 100
      ? { mode: 'native', percent: 200 }
      : { mode: 'fit' };
  }
  // A high Fit uses the ordinary safe zoom-in action; it must never snap down to 100%.
  if (fit > 100) return state.mode === 'native' ? { mode: 'fit' } : null;
  const midpoint = Math.max(1, Math.round(Math.sqrt(fit * 100) / 5) * 5);
  const detail = midpoint / fit >= 1.5 && 100 / midpoint >= 1.5 ? midpoint : undefined;
  if (state.mode === 'fit') return { mode: 'native', percent: detail ?? 100 };
  return detail !== undefined && state.nativePercent === detail
    ? { mode: 'native', percent: 100 }
    : { mode: 'fit' };
}
