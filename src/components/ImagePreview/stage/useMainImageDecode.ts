import { useCallback, useLayoutEffect, useRef } from 'react';
import type { ImageDimensions } from '../model/geometry';
import type { StageVisit } from '../model/stage';
import { IMAGE_DECODE_TIMEOUT_MS } from '../imagePreviewTuning';
import { scheduleRevealAfterDecode } from './imagePreviewDecode';

interface Options {
  visit: StageVisit;
  getMainEl(): HTMLImageElement | null;
  preferFastReveal: boolean;
  onImageLoad(dims: ImageDimensions): void;
  onDecoded(): void;
  onPainted(): void;
}

/** A decode subscription belongs to one committed selection, not just to a URL. */
export function useMainImageDecode({ visit, getMainEl, preferFastReveal,
  onImageLoad, onDecoded, onPainted }: Options) {
  const sessions = useRef(new WeakMap<StageVisit, { active: boolean; cancel(): void; image: HTMLImageElement | null }>());
  const onLoad = useCallback((image: HTMLImageElement) => {
    const session = sessions.current.get(visit);
    if (!session?.active || image.naturalWidth <= 0) return;
    onPainted();
    onImageLoad({ naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight });
    if (session.image === image) return;
    session.cancel();
    session.image = image;
    if (preferFastReveal) onDecoded();
    else session.cancel = scheduleRevealAfterDecode(image, () => {
      if (session.active) onDecoded();
    }, IMAGE_DECODE_TIMEOUT_MS);
  }, [visit, onPainted, onImageLoad, onDecoded, preferFastReveal]);

  useLayoutEffect(() => {
    const session = { active: true, cancel: () => {}, image: null as HTMLImageElement | null };
    sessions.current.set(visit, session);
    const image = getMainEl();
    if (image?.complete && image.naturalWidth > 0) onLoad(image);
    return () => {
      session.active = false;
      session.cancel();
      session.image = null;
    };
  }, [visit, getMainEl, onLoad]);
  return onLoad;
}
