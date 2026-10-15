import { describe, expect, it } from 'vitest';
import { nextAdaptiveZoom } from '../src/components/ImagePreview/adaptiveZoom';

describe('adaptive observation targets', () => {
  it.each([[25, 50], [14, 35], [40, 65]])('Fit %s uses Detail %s before actual size', (fit, detail) => {
    expect(nextAdaptiveZoom({ mode: 'fit', nativePercent: 10, fitEquivalentNativePercent: fit }))
      .toEqual({ mode: 'native', percent: detail });
    expect(nextAdaptiveZoom({ mode: 'native', nativePercent: detail, fitEquivalentNativePercent: fit }))
      .toEqual({ mode: 'native', percent: 100 });
    expect(nextAdaptiveZoom({ mode: 'native', nativePercent: 100, fitEquivalentNativePercent: fit }))
      .toEqual({ mode: 'fit' });
  });
  it('merges small-image Fit/100 and ignores arbitrary manual scales', () => {
    expect(nextAdaptiveZoom({ mode: 'fit', nativePercent: 10, fitEquivalentNativePercent: 100 }))
      .toEqual({ mode: 'native', percent: 200 });
    expect(nextAdaptiveZoom({ mode: 'native', nativePercent: 100, fitEquivalentNativePercent: 100 }))
      .toEqual({ mode: 'native', percent: 200 });
    expect(nextAdaptiveZoom({ mode: 'native', nativePercent: 800, fitEquivalentNativePercent: 25 }))
      .toEqual({ mode: 'fit' });
    expect(nextAdaptiveZoom({ mode: 'fit', nativePercent: 10, fitEquivalentNativePercent: 74 }))
      .toEqual({ mode: 'native', percent: 100 });
  });
  it('does not invent an observation scale for missing dimensions or high Fit', () => {
    for (const fit of [undefined, 0, NaN, Infinity, 950]) {
      expect(nextAdaptiveZoom({ mode: 'fit', nativePercent: 10, fitEquivalentNativePercent: fit })).toBeNull();
    }
  });
});
