import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { IMAGE_DECODE_TIMEOUT_MS } from '../imagePreviewTuning';
import { scheduleRevealAfterDecode } from '../stage/imagePreviewDecode';
import {
  DISPLAY_PRELOAD_IDLE_MS,
  PRELOAD_DISPLAY_SETTLE_MS,
  defaultEstimateDecodedBytes,
  pickDisplaySlotIndexes,
  resolvePreloadDisplaySlotCeiling,
} from './neighborDisplayPreload';
import type { ImageItem, PreloadDisplayMode } from '../types';

export interface DisplaySlotMeta {
  naturalWidth: number;
  naturalHeight: number;
}

export interface UseNeighborDisplayPreloadParams {
  images: ImageItem[];
  currentIndex: number;
  radius: number;
  /** Max neighbor display-ready slots; `0` disables. */
  displaySlots: number;
  memoryBudgetBytes?: number;
  estimateDecodedBytes?: (item: ImageItem) => number;
  mode?: PreloadDisplayMode;
  /** When true, defer starting new decodes (e.g. while panning). */
  interactionBusy?: boolean;
  /**
   * After `currentIndex` changes, wait this long before warming neighbors.
   * Default {@link PRELOAD_DISPLAY_SETTLE_MS}.
   */
  settleMs?: number;
}

export interface UseNeighborDisplayPreloadResult {
  slotIndexes: number[];
  displayReadyIndexes: ReadonlySet<number>;
  isSrcDisplayReady(src: string): boolean;
  getMeta(src: string): DisplaySlotMeta | undefined;
  /** Record that the main view finished decoding this `src` (feeds fast-reveal later). */
  markSrcDisplayReady(src: string, meta?: DisplaySlotMeta): void;
  /** Offscreen entries for `'slot'` mode (empty while settle debounce is pending). */
  slotRenderEntries: { index: number; src: string }[];
  onSlotImgLoad(index: number, el: HTMLImageElement): void;
  notifyInteraction(): void;
  /** True when neighbor display preload is allowed to run (settled + not interaction-busy). */
  neighborWarmActive: boolean;
}

/**
 * Keeps up to `displaySlots` neighbors display-ready (load + decode).
 * - `'slot'`: render {@link slotRenderEntries} when settled; call {@link onSlotImgLoad} on load.
 * - `'decode'`: detached `Image()` + `decode()` only (also gated on settle).
 *
 * Neighbor warm-up is **debounced** after navigation: rapid index changes cancel the pending
 * timer so only the final settled image starts warming neighbors. Current main decode is separate.
 */
export function useNeighborDisplayPreload(
  p: UseNeighborDisplayPreloadParams,
): UseNeighborDisplayPreloadResult {
  const {
    images,
    currentIndex,
    radius,
    displaySlots,
    memoryBudgetBytes,
    estimateDecodedBytes = defaultEstimateDecodedBytes,
    mode = 'slot',
    interactionBusy = false,
    settleMs = PRELOAD_DISPLAY_SETTLE_MS,
  } = p;

  const slotIndexes = useMemo(
    () =>
      pickDisplaySlotIndexes({
        currentIndex,
        radius,
        images,
        maxSlots: resolvePreloadDisplaySlotCeiling(displaySlots, memoryBudgetBytes),
        budgetBytes: memoryBudgetBytes,
        estimateBytes: estimateDecodedBytes,
      }),
    [currentIndex, radius, images, displaySlots, memoryBudgetBytes, estimateDecodedBytes],
  );

  const [displayReadyIndexes, setDisplayReadyIndexes] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  /** Navigation quiet long enough to warm neighbors. */
  const navigation = useMemo(() => ({ currentIndex }), [currentIndex]);
  const [settledNavigation, setSettledNavigation] = useState<object | null>(null);
  const navSettled = settledNavigation === navigation;
  /** Not panning / minimap-dragging (short idle after release). */
  const interaction = useMemo(() => ({ interactionBusy }), [interactionBusy]);
  const [idleInteraction, setIdleInteraction] = useState<object | null>(interaction);
  const panIdle = idleInteraction === interaction;


  const neighborWarmActive = navSettled && panIdle && !interactionBusy;

  const [metaBySrc, setMetaBySrc] = useState<ReadonlyMap<string, DisplaySlotMeta>>(new Map());
  const [readySources, setReadySources] = useState<ReadonlySet<string>>(new Set());
  const decodeImagesRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const inFlightRef = useRef<Set<number>>(new Set());
  const panIdleTimerRef = useRef<number | null>(null);
  const slotIndexesRef = useRef(slotIndexes);
  useLayoutEffect(() => { slotIndexesRef.current = slotIndexes; }, [slotIndexes]);

  const rememberReady = useCallback((src: string, meta?: DisplaySlotMeta) => {
    setReadySources((previous) => previous.has(src) ? previous : new Set(previous).add(src));
    if (meta && meta.naturalWidth > 0 && meta.naturalHeight > 0) setMetaBySrc((previous) => {
      const old = previous.get(src);
      return old?.naturalWidth === meta.naturalWidth && old.naturalHeight === meta.naturalHeight
        ? previous : new Map(previous).set(src, meta);
    });
  }, []);

  /** Blue strip = in active neighbor slots AND decode settled — never “neighbor ⇒ blue”. */
  const rebuildDisplayReadyIndexes = useCallback(() => {
    setDisplayReadyIndexes(() => {
      const next = new Set<number>();
      for (const i of slotIndexesRef.current) {
        const src = images[i]?.src;
        if (src && readySources.has(src)) next.add(i);
      }
      return next;
    });
  }, [images, readySources]);

  const clearPanIdleTimer = useCallback(() => {
    if (panIdleTimerRef.current != null) {
      window.clearTimeout(panIdleTimerRef.current);
      panIdleTimerRef.current = null;
    }
  }, []);

  const armPanIdle = useCallback(() => {
    clearPanIdleTimer();
    panIdleTimerRef.current = window.setTimeout(() => {
      panIdleTimerRef.current = null;
      setIdleInteraction(interaction);
    }, DISPLAY_PRELOAD_IDLE_MS);
  }, [clearPanIdleTimer, interaction]);

  const abortInFlightNeighborDecodes = useCallback(() => {
    for (const [idx, img] of [...decodeImagesRef.current.entries()]) {
      img.onload = null;
      img.onerror = null;
      img.src = '';
      decodeImagesRef.current.delete(idx);
      inFlightRef.current.delete(idx);
    }
  }, []);

  const markIndexReady = useCallback(
    (idx: number, src: string, img: HTMLImageElement) => {
      rememberReady(src, { naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
      inFlightRef.current.delete(idx);
      // Strip blue only if still in the neighbor slot window *and* decode just settled.
      if (!slotIndexesRef.current.includes(idx)) return;
      setDisplayReadyIndexes((prev) => {
        if (prev.has(idx)) return prev;
        const next = new Set(prev);
        next.add(idx);
        return next;
      });
    },
    [rememberReady],
  );

  const markSrcDisplayReady = useCallback(
    (src: string, meta?: DisplaySlotMeta) => {
      if (!src) return;
      rememberReady(src, meta);
      // Only paint blue for neighbors currently in slots that match this src.
      setDisplayReadyIndexes((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const idx of slotIndexesRef.current) {
          if (images[idx]?.src === src && !next.has(idx)) {
            next.add(idx);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    },
    [rememberReady, images],
  );

  const notifyInteraction = useCallback(() => {
    setIdleInteraction(null);
    armPanIdle();
  }, [armPanIdle]);

  // Debounce neighbor warm after navigation (keydown scrub cancels pending timer).
  useEffect(() => {
    abortInFlightNeighborDecodes();
    const delay = Math.max(0, settleMs);
    const id = window.setTimeout(() => setSettledNavigation(navigation), delay);
    return () => window.clearTimeout(id);
  }, [navigation, settleMs, abortInFlightNeighborDecodes]);

  // Pause while panning / minimap-dragging; resume shortly after release.
  useEffect(() => {
    if (interactionBusy) {
      clearPanIdleTimer();
      abortInFlightNeighborDecodes();
      return undefined;
    }
    armPanIdle();
    return () => clearPanIdleTimer();
  }, [interactionBusy, abortInFlightNeighborDecodes, armPanIdle, clearPanIdleTimer]);

  useEffect(() => {
    if (!neighborWarmActive) abortInFlightNeighborDecodes();
  }, [neighborWarmActive, abortInFlightNeighborDecodes]);

  useEffect(() => {
    // Recompute strip blues: slot window ∩ decode-settled only.
    // Still-loading neighbors stay gray/green progress — never blue just for being adjacent.
    rebuildDisplayReadyIndexes();
    const allowed = new Set(slotIndexes);
    for (const [idx, img] of [...decodeImagesRef.current.entries()]) {
      if (!allowed.has(idx)) {
        img.onload = null;
        img.onerror = null;
        img.src = '';
        decodeImagesRef.current.delete(idx);
        inFlightRef.current.delete(idx);
      }
    }
  }, [slotIndexes, images, readySources, rebuildDisplayReadyIndexes]);

  const slotCeiling = resolvePreloadDisplaySlotCeiling(displaySlots, memoryBudgetBytes);

  useEffect(() => {
    if (!neighborWarmActive || mode !== 'decode' || slotCeiling <= 0 || radius <= 0) return;

    for (const idx of slotIndexes) {
      if (inFlightRef.current.has(idx)) continue;
      const src = images[idx]?.src;
      if (!src) continue;
      if (readySources.has(src)) {
        // Already decode-settled — eligible for blue in the active window only.
        rebuildDisplayReadyIndexes();
        continue;
      }

      const img = new Image();
      inFlightRef.current.add(idx);
      decodeImagesRef.current.set(idx, img);
      img.onload = () => {
        scheduleRevealAfterDecode(
          img,
          () => markIndexReady(idx, src, img),
          IMAGE_DECODE_TIMEOUT_MS,
        );
      };
      img.onerror = () => {
        inFlightRef.current.delete(idx);
        decodeImagesRef.current.delete(idx);
      };
      img.src = src;
    }
  }, [neighborWarmActive, mode, slotCeiling, radius, slotIndexes, images, markIndexReady, rebuildDisplayReadyIndexes, readySources]);

  const onSlotImgLoad = useCallback(
    (index: number, el: HTMLImageElement) => {
      const src = images[index]?.src;
      if (!src || mode !== 'slot') return;
      scheduleRevealAfterDecode(
        el,
        () => markIndexReady(index, src, el),
        IMAGE_DECODE_TIMEOUT_MS,
      );
    },
    [mode, images, markIndexReady],
  );

  // When settle resumes, repaint blues for slot-window ∩ already-decoded only.
  useEffect(() => {
    if (!neighborWarmActive || mode !== 'slot') return;
    rebuildDisplayReadyIndexes();
  }, [neighborWarmActive, mode, slotIndexes, images, rebuildDisplayReadyIndexes]);

  const slotRenderEntries = useMemo(() => {
    if (mode !== 'slot' || slotCeiling <= 0 || radius <= 0) return [];
    const indexes = new Set<number>();
    for (const index of slotIndexes) {
      const src = images[index]?.src;
      if (!src) continue;
      // While settle/pan-idle pauses *new* warm-up, keep already-ready neighbors mounted
      // so WebView does not discard their decoded bitmaps.
      if (neighborWarmActive || readySources.has(src)) {
        indexes.add(index);
      }
    }
    const curSrc = images[currentIndex]?.src;
    if (curSrc && readySources.has(curSrc)) {
      indexes.add(currentIndex);
    }
    return [...indexes]
      .map((index) => {
        const src = images[index]?.src;
        return src ? { index, src } : null;
      })
      .filter((e): e is { index: number; src: string } => e != null);
  }, [
    mode,
    slotCeiling,
    radius,
    slotIndexes,
    images,
    currentIndex,
    readySources,
    neighborWarmActive,
  ]);

  const isSrcDisplayReady = useCallback(
    (src: string) => (src ? readySources.has(src) : false),
    [readySources],
  );

  const getMeta = useCallback(
    (src: string) => metaBySrc.get(src),
    [metaBySrc],
  );

  useEffect(() => {
    return () => {
      clearPanIdleTimer();
      abortInFlightNeighborDecodes();
    };
  }, [abortInFlightNeighborDecodes, clearPanIdleTimer]);

  return {
    slotIndexes,
    displayReadyIndexes,
    isSrcDisplayReady,
    getMeta,
    markSrcDisplayReady,
    slotRenderEntries,
    onSlotImgLoad,
    notifyInteraction,
    neighborWarmActive,
  };
}
