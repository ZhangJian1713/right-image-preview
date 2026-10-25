import { useEffect, useLayoutEffect, useState } from 'react';
import type { StageVisit } from '../model/stage';
import type { ImageDimensions } from '../model/geometry';

interface Options {
  visit: StageVisit;
  ready: boolean;
  holding: boolean;
  /** Current visit's reveal image loaded; recheck even when layout dimensions stay unchanged. */
  contentLoaded: boolean;
  dims: ImageDimensions | null;
  hideUntilReady: boolean;
  preferFastReveal: boolean;
  getRevealEl(): HTMLImageElement | null;
  onDecoded(dimensions: ImageDimensions): void;
  reveal(): void;
}

/** Owns paint/transition timing; clearing a hold must never blank the incoming stage. */
export function useStageReveal({ visit, ready, holding, contentLoaded, dims, hideUntilReady,
  preferFastReveal, getRevealEl, onDecoded, reveal }: Options) {
  type Phase = 'hidden' | 'settling' | 'ready';
  const [snapshot, setSnapshot] = useState<{ visit: StageVisit; phase: Phase }>({ visit, phase: 'hidden' });
  const phase = snapshot.visit === visit ? snapshot.phase : 'hidden';
  // 当前访问的内容已 load 且布局就绪时，帧回调暂停不能继续把整个图层隐藏。
  // 原图的解码／缩略降级条件仍由 hideUntilReady 单独控制。
  const imageShowReady = ready && (holding || contentLoaded || phase !== 'hidden');

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
    if (!holding || !imageShowReady || !contentLoaded || !dims || dims.naturalWidth <= 0 || dims.naturalHeight <= 0) return;
    const image = getRevealEl();
    if (!image?.complete || image.naturalWidth <= 0) return;
    if (preferFastReveal) onDecoded({ naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight });
    else if (hideUntilReady) return;
    reveal();
  }, [visit, contentLoaded, holding, imageShowReady, dims, getRevealEl, preferFastReveal, onDecoded, hideUntilReady, reveal]);

  return { imageShowReady, suppressTransformForSrcSwitch: holding || phase !== 'ready' };
}
