import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PROGRESSIVE_PRELOAD_TIMEOUT_MS } from './imagePreviewTuning';
import type { MainImageLoadStage } from './types';
import type { ImageDimensions } from './useImageTransform';

export interface UseProgressiveMainImageArgs {
  mainSrc: string;
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
  onMainImgDecoded: () => void;
}

interface ProgressiveVisit {
  active: boolean;
  stage: MainImageLoadStage;
  fullDecoded: boolean;
  minimapReady: boolean;
  pendingReveal: boolean;
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
  const visit = useMemo(() => ({ mainSrc, minimapSrc, pipelineActive }),
    [mainSrc, minimapSrc, pipelineActive]);
  const sessions = useRef(new WeakMap<object, ProgressiveVisit>());
  // Invoked only by events/effects. A new source can receive a cached-image ref callback
  // before its parent's effects, without mutating any shared session during render.
  const getVisit = useCallback(() => {
    let session = sessions.current.get(visit);
    if (!session) {
      session = { active: true, stage: pipelineActive ? 'preloading' : 'inactive',
        fullDecoded: false, minimapReady: false, pendingReveal: false,
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
  const genRef = useRef(0);
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
  const setFullDecoded = useCallback((value: boolean) => update({ fullDecoded: value }), [update]);
  const setMinimapPrelayoutReady = useCallback((value: boolean) => update({ minimapReady: value }), [update]);
  const clearRevealTimeout = useCallback(() => {
    const timer = getVisit().timer;
    if (timer !== null) window.clearTimeout(timer);
    getVisit().timer = null;
  }, [getVisit]);
  useEffect(() => {
    getVisit().active = true;
    return () => { getVisit().active = false; clearRevealTimeout(); };
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
      setFullDecoded(true);
      onStageChangeRef.current?.('full-ready');
    };
    // Fast-reveal (dwell=0): finish sync so outgoing can drop in the same layout pass.
    if (wait === 0) {
      finish();
      return;
    }
    getVisit().timer = window.setTimeout(finish, wait);
  }, [clearRevealTimeout, getVisit, setFullDecoded, onStageChangeRef, effectiveDwellMsRef]);

  useEffect(() => {
    if (!pipelineActive) {
      return undefined;
    }
    onStageChangeRef.current?.('preloading');

    const gen = ++genRef.current;
    let cancelled = false;
    /** Main `Image()` probe finished (success or error) — do not apply late minimap dimensions after that. */
    let mainProbeFinished = false;

    const known = knownDimensionsRef.current;
    const knownOk = !!(known && known.naturalWidth > 0 && known.naturalHeight > 0);
    /**
     * Display-ready navigate: layout meta already known and the viewport layer is (or will be)
     * the retained decoded DOM node. A second `new Image(); img.src = mainSrc` probe re-decodes
     * ~20–30MB and commonly costs ~1s — skip it on the fast path.
     */
    const skipMainProbe = preferFastRevealRef.current && knownOk;

    if (knownOk) {
      onImageLayoutRef.current(known!);
      getVisit().placeholderAt = performance.now();
      getVisit().stage = 'thumbnail-placeholder';
      // Known dimensions enter the external preload pipeline once per resource visit.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreloadStage('thumbnail-placeholder');
      onStageChangeRef.current?.('thumbnail-placeholder');
      // Layout microtask may have called onMainImgDecoded while stage was still `preloading`
      // (sync reset on src change). Drain that pending now — do not wait for a main probe.
      if (getVisit().pendingReveal) {
        getVisit().pendingReveal = false;
        armRevealAfterDwell();
      }
    }

    // Parallel minimap preload: small file → layout + underlay immediately while main may take seconds.
    if (minimapSrc && minimapSrc !== mainSrc) {
      const tEarly = new Image();
      tEarly.onload = () => {
        if (cancelled || gen !== genRef.current || mainProbeFinished) return;
        // Prefer known full-image dims for layout when available; still mark underlay ready.
        if (!knownOk) {
          onImageLayoutRef.current({
            naturalWidth: tEarly.naturalWidth,
            naturalHeight: tEarly.naturalHeight,
          });
        }
        setMinimapPrelayoutReady(true);
        if (getVisit().stage === 'preloading') {
          getVisit().placeholderAt = performance.now();
          getVisit().stage = 'thumbnail-placeholder';
          setPreloadStage('thumbnail-placeholder');
          onStageChangeRef.current?.('thumbnail-placeholder');
          if (getVisit().pendingReveal) {
            getVisit().pendingReveal = false;
            armRevealAfterDwell();
          }
        }
      };
      tEarly.onerror = () => {
        /* main or tryMinimapFallback will still attempt layout */
      };
      tEarly.src = minimapSrc;
    }

    if (skipMainProbe) {
      return () => {
        cancelled = true;
      };
    }

    const img = new Image();
    /** Timeout id assigned after `img.src` (sync cache `onload` must not read before assign). */
    const preloadTimeoutHolder: { id?: number } = {};
    /** After we fall back to minimap (or give up on main), ignore a very late main `onload`. */
    let ignoreMainPreloadResult = false;
    let minimapFallbackStarted = false;

    const tryMinimapFallback = () => {
      if (cancelled || gen !== genRef.current || minimapFallbackStarted) return;
      minimapFallbackStarted = true;
      ignoreMainPreloadResult = true;
      mainProbeFinished = true;
      if (!minimapSrc || minimapSrc === mainSrc) {
        getVisit().stage = 'error';
        setPreloadStage('error');
        onStageChangeRef.current?.('error');
        return;
      }
      const thumb = new Image();
      thumb.onload = () => {
        if (cancelled || gen !== genRef.current) return;
        onImageLayoutRef.current({
          naturalWidth: thumb.naturalWidth,
          naturalHeight: thumb.naturalHeight,
        });
        setFullDecoded(true);
        getVisit().stage = 'thumb-only';
        setPreloadStage('thumb-only');
        onStageChangeRef.current?.('thumb-only');
      };
      thumb.onerror = () => {
        if (cancelled || gen !== genRef.current) return;
        getVisit().stage = 'error';
        setPreloadStage('error');
        onStageChangeRef.current?.('error');
      };
      thumb.src = minimapSrc;
    };

    img.onload = () => {
      if (cancelled || gen !== genRef.current || ignoreMainPreloadResult) return;
      if (preloadTimeoutHolder.id !== undefined) window.clearTimeout(preloadTimeoutHolder.id);
      mainProbeFinished = true;
      onImageLayoutRef.current({
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      });
      getVisit().placeholderAt = performance.now();
      getVisit().stage = 'thumbnail-placeholder';
      setPreloadStage('thumbnail-placeholder');
      onStageChangeRef.current?.('thumbnail-placeholder');
      if (getVisit().pendingReveal) {
        getVisit().pendingReveal = false;
        armRevealAfterDwell();
      }
    };
    img.onerror = () => {
      if (cancelled || gen !== genRef.current) return;
      mainProbeFinished = true;
      if (preloadTimeoutHolder.id !== undefined) window.clearTimeout(preloadTimeoutHolder.id);
      tryMinimapFallback();
    };
    img.src = mainSrc;

    preloadTimeoutHolder.id = window.setTimeout(() => {
      if (cancelled || gen !== genRef.current) return;
      tryMinimapFallback();
    }, PROGRESSIVE_PRELOAD_TIMEOUT_MS);

    return () => {
      cancelled = true;
      if (preloadTimeoutHolder.id !== undefined) window.clearTimeout(preloadTimeoutHolder.id);
    };
  },
  [mainSrc, minimapSrc, pipelineActive, armRevealAfterDwell, getVisit, setPreloadStage, setFullDecoded, setMinimapPrelayoutReady, onStageChangeRef, onImageLayoutRef, knownDimensionsRef, preferFastRevealRef],
  );

  const onMainImgDecoded = useCallback(() => {
    const active = enabled && !!minimapSrc && minimapSrc !== mainSrc && !minimapCustom;
    if (!active) {
      if (!getVisit().active || getVisit().completed) return;
      getVisit().completed = true;
      setFullDecoded(true);
      onStageChangeRef.current?.('full-ready');
      return;
    }
    if (getVisit().completed) return;

    const stage = getVisit().stage;
    if (stage === 'preloading') {
      getVisit().pendingReveal = true;
      // Display-ready: known dims mean we can enter placeholder + reveal without waiting for the
      // progressive effect (layout microtask often races ahead of that effect).
      const known = knownDimensionsRef.current;
      if (
        preferFastRevealRef.current &&
        known &&
        known.naturalWidth > 0 &&
        known.naturalHeight > 0
      ) {
        getVisit().placeholderAt = performance.now();
        getVisit().stage = 'thumbnail-placeholder';
        setPreloadStage('thumbnail-placeholder');
        getVisit().pendingReveal = false;
        armRevealAfterDwell();
      }
      return;
    }
    if (stage === 'thumbnail-placeholder') {
      armRevealAfterDwell();
      return;
    }

    setFullDecoded(true);
    if (stage === 'error') {
      onStageChangeRef.current?.('full-ready');
    }
  }, [enabled, minimapSrc, minimapCustom, mainSrc, armRevealAfterDwell, getVisit, setFullDecoded, setPreloadStage, onStageChangeRef, knownDimensionsRef, preferFastRevealRef]);

  const showMinimapUnderlay =
    pipelineActive &&
    !!minimapSrc &&
    (minimapPrelayoutReady ||
      preloadStage === 'thumbnail-placeholder' ||
      preloadStage === 'thumb-only');

  return { pipelineActive, preloadStage, fullDecoded, showMinimapUnderlay, onMainImgDecoded };
}
