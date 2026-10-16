import type { NativePercent, SmallImageZoomOptions } from '../types';
import type { ImageDimensions } from '../model/geometry';

export const positiveZoom = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value) && value > 0;

/** One finite ladder for controls, native actions and gestures. Only the final small-image stop is added. */
export function resolveZoomStops(stops: NativePercent[], smallImage?: SmallImageZoomOptions,
  dimensions?: ImageDimensions | null): NativePercent[] {
  const valid = [...new Set(stops.filter(positiveZoom))].sort((a, b) => a - b);
  if (!valid.length) valid.push(100);
  if (smallImage && dimensions && positiveZoom(smallImage.maxEdge) &&
    positiveZoom(smallImage.maxNativePercent) && positiveZoom(dimensions.naturalWidth) &&
    positiveZoom(dimensions.naturalHeight) &&
    Math.max(dimensions.naturalWidth, dimensions.naturalHeight) <= smallImage.maxEdge &&
    smallImage.maxNativePercent > valid[valid.length - 1]) valid.push(smallImage.maxNativePercent);
  return valid;
}
