import { useCallback, useMemo, useRef, useReducer } from 'react';
import type { ImageDimensions } from '../model/geometry';
import type { DisplayLayerEntry } from '../model/stage';
import { createStageHandoff, stageHandoff } from './stageHandoff';

interface Options {
  src: string;
  index: number;
  dims: ImageDimensions | null;
  cssTransform: string;
  slots: ReadonlyArray<{ src: string; index: number }>;
}

/** Owns selected/retained frames; DOM references are populated only during React commits. */
export function useStageHandoff({ src, index, dims, cssTransform, slots }: Options) {
  const layers = useRef(new Map<string, HTMLImageElement>());
  const [stored, dispatch] = useReducer(stageHandoff, undefined, () => createStageHandoff(src, index));
  let state = stored;
  if (stored.visit.src !== src || stored.visit.index !== index) {
    // Adjust this component's state before its children render. No shared object is mutated
    // during render, so an interrupted render cannot overwrite the last committed pose.
    const event = { type: 'select', src, index } as const;
    state = stageHandoff(stored, event);
    dispatch(event);
  }
  // mainPainted resets on selection, so the previous source's layout cannot become
  // this visit's pose. State in an abandoned React render is discarded with that render.
  if (state.mainPainted && !state.outgoing && dims && dims.naturalWidth > 0 && dims.naturalHeight > 0) {
    const event = { type: 'present', visit: state.visit,
      frame: { src, index, dims: { ...dims }, cssTransform } } as const;
    const next = stageHandoff(state, event);
    if (next !== state) { state = next; dispatch(event); }
  }
  const { visit, outgoing, frozen, mainPainted, underlayPainted } = state;

  const prepareNavigation = useCallback(() => {
    const frame = state.presented;
    if (!frame || frame.src !== src) return;
    dispatch({ type: 'prepare', visit, frame });
  }, [src, visit, state.presented]);

  const markMainPainted = useCallback(() => dispatch({ type: 'paint', visit, layer: 'main' }), [visit]);
  const markUnderlayPainted = useCallback(() => dispatch({ type: 'paint', visit, layer: 'underlay' }), [visit]);
  const reveal = useCallback(() => dispatch({ type: 'reveal', visit }), [visit]);
  const getMainEl = useCallback(() => layers.current.get(src) ?? null, [src]);
  const bindLayerRef = useCallback((layerSrc: string) => (element: HTMLImageElement | null) => {
    if (element) layers.current.set(layerSrc, element);
    else layers.current.delete(layerSrc);
  }, []);

  const displayLayers = useMemo<DisplayLayerEntry[]>(() => {
    const bySrc = new Map(slots.map((entry) => [entry.src, entry.index]));
    bySrc.set(src, index);
    if (outgoing && outgoing.src !== src) bySrc.set(outgoing.src, outgoing.index);
    return [...bySrc].map(([layerSrc, layerIndex]) => ({ src: layerSrc, index: layerIndex,
      isCurrent: layerSrc === src, isOutgoing: layerSrc === outgoing?.src && layerSrc !== src }));
  }, [slots, src, index, outgoing]);

  return { visit, outgoing, frozenBySrc: frozen, displayLayers, mainPainted, underlayPainted,
    markMainPainted, markUnderlayPainted, prepareNavigation, reveal, getMainEl, bindLayerRef };
}
