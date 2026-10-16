import type { LayerPresentation } from '../parts/DisplayStageLayers';

/** One retained frame: identity, dimensions and pose must always belong to the same image. */
export interface OutgoingFrame extends LayerPresentation {
  src: string;
  index: number;
}

interface CaptureOptions {
  src: string;
  index: number;
  live: (LayerPresentation & { src: string }) | null;
  frozen?: LayerPresentation;
  image?: Pick<HTMLImageElement, 'complete' | 'naturalWidth' | 'naturalHeight'>;
  fallbackTransform: string;
}

/** Prefer the last live pose, then a retained pose, then a loaded bitmap's dimensions. */
export function captureOutgoingFrame({ src, index, live, frozen, image, fallbackTransform }: CaptureOptions): OutgoingFrame | null {
  const matchingLive = live?.src === src ? live : null;
  const loaded = image?.complete && image.naturalWidth > 0;
  if (!src || (!matchingLive && !frozen && !loaded)) return null;
  const dims = matchingLive?.dims ?? frozen?.dims ?? {
    naturalWidth: image!.naturalWidth,
    naturalHeight: image!.naturalHeight,
  };
  return {
    src, index, dims: { ...dims },
    cssTransform: matchingLive?.cssTransform ?? frozen?.cssTransform ?? fallbackTransform,
  };
}
