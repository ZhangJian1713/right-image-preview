import { useEffect, useLayoutEffect, useState } from 'react';
import type { StageVisit } from '../model/stage';
import type { ImageDimensions } from '../model/geometry';

interface Options {
  visit: StageVisit;
  ready: boolean;
  holding: boolean;
  /** Current visit received a main load; recheck even when layout dimensions stay unchanged. */
  mainLoaded: boolean;
  dims: ImageDimensions | null;
  hideMainUntilDecoded: boolean;
  preferFastReveal: boolean;
  getMainEl(): HTMLImageElement | null;
  onDecoded(): void;
  reveal(): void;
}

/** Owns paint/transition timing; clearing a hold must never blank the incoming stage. */
export function useStageReveal({ visit, ready, holding, mainLoaded, dims, hideMainUntilDecoded,
  preferFastReveal, getMainEl, onDecoded, reveal }: Options) {
  type Phase = 'hidden' | 'settling' | 'ready';
  const [snapshot, setSnapshot] = useState<{ visit: StageVisit; phase: Phase }>({ visit, phase: 'hidden' });
  const phase = snapshot.visit === visit ? snapshot.phase : 'hidden';
  const imageShowReady = ready && (holding || phase !== 'hidden');

  useEffect(() => {
    let first = 0;
    let second = 0;
    const update = (phase: Phase) => setSnapshot((previous) =>
      previous.visit === visit && previous.phase === phase ? previous : { visit, phase });
    if (!ready) {
      // Layout disappeared: a later ready transition must settle its fit transform again.
      update('hidden');
    } else if (holding) {
      // Preserve visibility while covered so uncovering never blanks the incoming frame.
      update('settling');
    } else {
      first = requestAnimationFrame(() => {
        update('settling');
        second = requestAnimationFrame(() => update('ready'));
      });
    }
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [visit, ready, holding]);

  useLayoutEffect(() => {
    if (!holding || !imageShowReady || !dims || dims.naturalWidth <= 1 || dims.naturalHeight <= 1) return;
    const image = getMainEl();
    if (!image?.complete || image.naturalWidth <= 1) return;
    if (preferFastReveal) onDecoded();
    else if (hideMainUntilDecoded) return;
    reveal();
  }, [visit, mainLoaded, holding, imageShowReady, dims, getMainEl, preferFastReveal, onDecoded, hideMainUntilDecoded, reveal]);

  return { imageShowReady, suppressTransformForSrcSwitch: holding || phase !== 'ready' };
}
