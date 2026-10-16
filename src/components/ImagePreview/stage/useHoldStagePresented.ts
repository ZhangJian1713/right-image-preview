import { useEffect, useMemo, useState } from 'react';
import { isHoldBitmapCandidate, pickHoldPresentImg, scheduleHoldStagePresented,
  type HoldBitmapCandidateInput } from './holdContentVisible';

export interface UseHoldStagePresentedParams extends HoldBitmapCandidateInput {
  visitKey: string;
  getUnderlayEl(): HTMLImageElement | null;
  getMainEl(): HTMLImageElement | null;
}

/** Confirmation is scoped to one visit; a later visit never inherits its predecessor. */
export function useHoldStagePresented({ visitKey, getUnderlayEl, getMainEl,
  imageLoadError, imageShowReady, showMinimapUnderlay, underlayPainted,
  pipelineActive, fullDecoded, thumbOnly, mainPainted }: UseHoldStagePresentedParams): boolean {
  const visit = useMemo(() => ({ key: visitKey }), [visitKey]);
  const [presentedVisit, setPresentedVisit] = useState<object | null>(null);
  useEffect(() => {
    if (presentedVisit === visit || imageLoadError) return;
    const candidate = { imageLoadError, imageShowReady, showMinimapUnderlay,
      underlayPainted, pipelineActive, fullDecoded, thumbOnly, mainPainted };
    if (!isHoldBitmapCandidate(candidate)) return;
    const image = pickHoldPresentImg({ ...candidate,
      underlayEl: getUnderlayEl(), mainEl: getMainEl() });
    if (!image) return;
    return scheduleHoldStagePresented(image, () => setPresentedVisit(visit));
  }, [visit, presentedVisit, imageLoadError, imageShowReady, showMinimapUnderlay,
    underlayPainted, pipelineActive, fullDecoded, thumbOnly, mainPainted,
    getUnderlayEl, getMainEl]);
  return imageLoadError || presentedVisit === visit;
}
