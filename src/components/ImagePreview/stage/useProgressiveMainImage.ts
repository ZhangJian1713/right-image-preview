import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PROGRESSIVE_PRELOAD_TIMEOUT_MS } from '../imagePreviewTuning';
import type { MainImageLoadStage } from '../types';
import type { ImageDimensions } from '../model/geometry';

export interface UseProgressiveMainImageArgs {
  mainSrc: string;
  /** Optional owning stage selection; repeated URLs still represent distinct visits. */
  selection?: object;
  minimapSrc: string | undefined;
  /** When true, the item uses a custom minimap node — progressive main is disabled. */
  minimapCustom: boolean;
  enabled: boolean;
  /** Minimum ms the placeholder stays visible after the full image is ready (see {@link ImagePreviewProps.progressivePlaceholderMinMs}). */
  placeholderMinVisibleMs: number;
  /**
   * When true (e.g. neighbor was display-ready), skip artificial dwell but **keep** the
   * minimap underlay until the main viewport image has decoded — avoids a black frame.
   */
  preferFastReveal?: boolean;
  /** Optional known full-image size (from display-ready meta) to layout before the probe finishes. */
  knownDimensions?: ImageDimensions | null;
  onImageLayout: (d: ImageDimensions) => void;
  onStageChange?: (stage: MainImageLoadStage) => void;
}

export interface UseProgressiveMainImageResult {
  pipelineActive: boolean;
  preloadStage: MainImageLoadStage;
  fullDecoded: boolean;
  /**
   * True when the minimap URL should paint in the main area (parallel preload or placeholder).
   * Keeps the thumbnail visible during long main-image decode instead of a black box.
   */
  showMinimapUnderlay: boolean;
  /** Call from the visible &lt;img&gt; `onLoad` after optional `decode()`. */
  onMainImgDecoded: (dimensions?: ImageDimensions) => void;
  onMainImgError: () => void;
  onMinimapError: () => void;
}

interface ProgressiveVisit {
  active: boolean;
  stage: MainImageLoadStage;
  fullDecoded: boolean;
  minimapReady: boolean;
  /** The viewport decoded; fullDecoded additionally waits for the configured placeholder dwell. */
  mainDecoded: boolean;
  mainError: boolean;
  minimapError: boolean;
  failMain: (() => void) | null;
  failMinimap: (() => void) | null;
  stopProbes: (() => void) | null;
  placeholderAt: number | null;
  timer: number | null;
  completed: boolean;
}

function useLatestRef<T>(value: T) {
  const r = useRef(value);
  useLayoutEffect(() => {
    r.current = value;
  });
  return r;
}

/**
 * Preloads the full image to obtain natural dimensions (for layout / minimap),
 * then keeps a thumbnail underlay until the real &lt;img&gt; has loaded+decoded.
 */
export function useProgressiveMainImage({
  mainSrc,
  selection,
  minimapSrc,
  minimapCustom,
  enabled,
  placeholderMinVisibleMs,
  preferFastReveal = false,
  knownDimensions = null,
  onImageLayout,
  onStageChange,
}: UseProgressiveMainImageArgs): UseProgressiveMainImageResult {
  const onStageChangeRef = useLatestRef(onStageChange);
  const onImageLayoutRef = useLatestRef(onImageLayout);
  const knownDimensionsRef = useLatestRef(knownDimensions);
  const preferFastRevealRef = useLatestRef(preferFastReveal);

  const pipelineActive =
    enabled && !!minimapSrc && minimapSrc !== mainSrc && !minimapCustom;

  const effectiveDwellMsRef = useLatestRef(preferFastReveal ? 0 : placeholderMinVisibleMs);

  const initialStage: MainImageLoadStage = pipelineActive ? 'preloading' : 'inactive';
  const visit = useMemo(() => ({ mainSrc, minimapSrc, pipelineActive, selection }),
    [mainSrc, minimapSrc, pipelineActive, selection]);
  const sessions = useRef(new WeakMap<object, ProgressiveVisit>());
  // Invoked only by events/effects. A new source can receive a cached-image ref callback
  // before its parent's effects, without mutating any shared session during render.
  const getVisit = useCallback(() => {
    let session = sessions.current.get(visit);
    if (!session) {
      session = { active: true, stage: pipelineActive ? 'preloading' : 'inactive',
        fullDecoded: false, minimapReady: false, mainDecoded: false, mainError: false,
        minimapError: false, failMain: null, failMinimap: null, stopProbes: null,
        placeholderAt: null, timer: null, completed: false };
      sessions.current.set(visit, session);
    }
    return session;
  }, [visit, pipelineActive]);
  const [snapshot, setSnapshot] = useState<{ visit: typeof visit; stage: MainImageLoadStage;
    fullDecoded: boolean; minimapReady: boolean }>({ visit, stage: initialStage,
    fullDecoded: false, minimapReady: false });
  const current = snapshot.visit === visit ? snapshot :
    { visit, stage: initialStage, fullDecoded: false, minimapReady: false };
  const preloadStage = current.stage;
  const fullDecoded = current.fullDecoded;
  const minimapPrelayoutReady = current.minimapReady;
  const update = useCallback((changes: Partial<Pick<ProgressiveVisit, 'stage' | 'fullDecoded' | 'minimapReady'>>) => {
    const session = getVisit();
    if (!session.active) return;
    Object.assign(session, changes);
    const next = { visit, stage: session.stage, fullDecoded: session.fullDecoded,
      minimapReady: session.minimapReady };
    // A cached image ref may report decoded again after every commit. Preserve identity
    // on no-op notifications, or the callback itself would keep scheduling renders.
    setSnapshot((previous) => previous.visit === next.visit &&
      previous.stage === next.stage && previous.fullDecoded === next.fullDecoded &&
      previous.minimapReady === next.minimapReady ? previous : next);
  }, [getVisit, visit]);
  const setPreloadStage = useCallback((stage: MainImageLoadStage) => update({ stage }), [update]);
  const markFullDecoded = useCallback(() => update({ fullDecoded: true }), [update]);
  const clearRevealTimeout = useCallback(() => {
    const session = getVisit();
    if (session.timer !== null) window.clearTimeout(session.timer);
    session.timer = null;
  }, [getVisit]);
  useLayoutEffect(() => {
    getVisit().active = true;
    return () => { getVisit().active = false; getVisit().stopProbes?.(); clearRevealTimeout(); };
  }, [getVisit, clearRevealTimeout]);

  const armRevealAfterDwell = useCallback(() => {
    if (getVisit().completed) return;
    clearRevealTimeout();
    const t0 = getVisit().placeholderAt;
    const dwell = effectiveDwellMsRef.current;
    const elapsed = t0 == null ? 0 : performance.now() - t0;
    const wait = Math.max(0, dwell - elapsed);
    const finish = () => {
      if (!getVisit().active) return;
      getVisit().timer = null;
      getVisit().completed = true;
      update({ fullDecoded: true, stage: 'full-ready' });
      onStageChangeRef.current?.('full-ready');
    };
    // Fast-reveal (dwell=0): finish sync so outgoing can drop in the same layout pass.
    if (wait === 0) {
      finish();
      return;
    }
    getVisit().timer = window.setTimeout(finish, wait);
  }, [clearRevealTimeout, getVisit, update, onStageChangeRef, effectiveDwellMsRef]);

  const enterPlaceholder = useCallback(() => {
    getVisit().placeholderAt = performance.now();
    setPreloadStage('thumbnail-placeholder');
    onStageChangeRef.current?.('thumbnail-placeholder');
    if (getVisit().mainDecoded) armRevealAfterDwell();
  }, [getVisit, setPreloadStage, onStageChangeRef, armRevealAfterDwell]);

  useEffect(() => {
    const session = getVisit();
    if (!pipelineActive) return;
    // Cached DOM load/decode can beat this passive effect. Never reopen its probes.
    if (session.mainDecoded) {
      if (!session.completed) armRevealAfterDwell();
      return;
    }
    onStageChangeRef.current?.('preloading');
    if (session.mainDecoded || !session.active) return;

    let cancelled = false;
    let deadline: number | null = null;
    const probes = new Set<HTMLImageElement>();
    const release = (image: HTMLImageElement) => {
      image.onload = image.onerror = null;
      image.removeAttribute('src');
      probes.delete(image);
    };
    const clearDeadline = () => {
      if (deadline !== null) window.clearTimeout(deadline);
      deadline = null;
    };
    const dispose = () => {
      cancelled = true;
      clearDeadline();
      for (const image of probes) release(image);
      if (session.stopProbes === dispose) {
        session.stopProbes = session.failMain = session.failMinimap = null;
      }
    };
    session.stopProbes = dispose;
    const stale = () => cancelled || !session.active || session.mainDecoded;
    const probe = () => { const image = new Image(); probes.add(image); return image; };

    const known = knownDimensionsRef.current;
    const knownOk = !!(known && known.naturalWidth > 0 && known.naturalHeight > 0);
    // Retained, display-ready DOM already owns the full bitmap and layout.
    const skipMainProbe = preferFastRevealRef.current && knownOk;
    let mainProbeFinished = false;
    let mainFailed = session.mainError;
    let mainProbe: HTMLImageElement | null = null;
    let thumbnailProbe: HTMLImageElement | null = null;
    let thumbDims: ImageDimensions | null = null;
    let thumbFailed = session.minimapError;
    let thumbnailFinished = thumbFailed;
    const applyFallback = () => {
      if (stale() || !mainFailed) return;
      if (thumbDims) {
        onImageLayoutRef.current(thumbDims);
        update({ minimapReady: true, stage: 'thumb-only' });
        onStageChangeRef.current?.('thumb-only');
      } else if (thumbFailed) {
        setPreloadStage('error');
        onStageChangeRef.current?.('error');
      }
    };
    session.failMain = () => {
      if (stale()) return;
      clearDeadline();
      mainProbeFinished = mainFailed = true;
      if (mainProbe) release(mainProbe);
      applyFallback();
    };
    session.failMinimap = () => {
      if (stale()) return;
      thumbDims = null;
      thumbnailFinished = thumbFailed = true;
      if (thumbnailProbe) release(thumbnailProbe);
      applyFallback();
    };

    if (knownOk) {
      onImageLayoutRef.current(known!);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      enterPlaceholder();
    }
    if (stale()) return dispose;

    // Reuse this single thumbnail probe for both early layout and failure fallback.
    const thumb = thumbnailProbe = probe();
    thumb.onload = () => {
      if (stale() || thumbnailFinished) return;
      thumbnailFinished = true;
      thumbDims = { naturalWidth: thumb.naturalWidth, naturalHeight: thumb.naturalHeight };
      release(thumb);
      if (mainFailed) { applyFallback(); return; }
      if (!mainProbeFinished) {
        if (!knownOk) onImageLayoutRef.current(thumbDims);
        update({ minimapReady: true });
        if (session.stage === 'preloading') enterPlaceholder();
      }
    };
    thumb.onerror = () => {
      if (stale() || thumbnailFinished) return;
      thumbnailFinished = thumbFailed = true;
      release(thumb);
      applyFallback();
    };
    if (!thumbFailed) thumb.src = minimapSrc!;
    else { release(thumb); applyFallback(); }

    if (!skipMainProbe && !mainFailed && !stale()) {
      const image = mainProbe = probe();
      image.onload = () => {
        if (stale() || mainProbeFinished) return;
        clearDeadline();
        mainProbeFinished = true;
        const dimensions = { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight };
        release(image);
        onImageLayoutRef.current(dimensions);
        enterPlaceholder();
      };
      const fail = () => {
        if (stale() || mainProbeFinished) return;
        session.failMain?.();
      };
      image.onerror = fail;
      // Arm before src: synchronous cache events must be able to clear the deadline.
      deadline = window.setTimeout(fail, PROGRESSIVE_PRELOAD_TIMEOUT_MS);
      image.src = mainSrc;
    }
    return dispose;
  }, [mainSrc, minimapSrc, pipelineActive, armRevealAfterDwell, getVisit, setPreloadStage,
    update, onStageChangeRef, onImageLayoutRef, knownDimensionsRef, preferFastRevealRef, enterPlaceholder]);

  const onMainImgDecoded = useCallback((dimensions?: ImageDimensions) => {
    const session = getVisit();
    if (!session.active || session.completed || session.mainDecoded) return;
    session.mainDecoded = true;
    session.stopProbes?.();
    // The actual viewport image wins even if a probe supplied thumbnail layout meanwhile.
    if (dimensions) onImageLayoutRef.current(dimensions);
    if (!pipelineActive) {
      session.completed = true;
      markFullDecoded();
      onStageChangeRef.current?.('full-ready');
      return;
    }
    if (session.stage !== 'thumbnail-placeholder') enterPlaceholder();
    else armRevealAfterDwell();
  }, [pipelineActive, armRevealAfterDwell, getVisit, markFullDecoded, enterPlaceholder,
    onStageChangeRef, onImageLayoutRef]);
  const onMainImgError = useCallback(() => {
    const session = getVisit();
    if (!session.active || session.mainDecoded) return;
    session.mainError = true;
    session.failMain?.();
  }, [getVisit]);
  const onMinimapError = useCallback(() => {
    const session = getVisit();
    if (!session.active || session.mainDecoded) return;
    session.minimapError = true;
    session.failMinimap?.();
  }, [getVisit]);

  const showMinimapUnderlay =
    pipelineActive &&
    (minimapPrelayoutReady ||
      preloadStage === 'thumbnail-placeholder' ||
      preloadStage === 'thumb-only');

  return { pipelineActive, preloadStage, fullDecoded, showMinimapUnderlay,
    onMainImgDecoded, onMainImgError, onMinimapError };
}
