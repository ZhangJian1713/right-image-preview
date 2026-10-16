import type { LayerPresentation, OutgoingFrame, StageVisit } from '../model/stage';

export interface StageHandoffState {
  visit: StageVisit;
  outgoing: OutgoingFrame | null;
  presented: OutgoingFrame | null;
  frozen: ReadonlyMap<string, LayerPresentation>;
  mainPainted: boolean;
  underlayPainted: boolean;
}

export type StageHandoffEvent =
  | { type: 'select'; src: string; index: number }
  | { type: 'prepare'; visit: StageVisit; frame: OutgoingFrame }
  | { type: 'present'; visit: StageVisit; frame: OutgoingFrame }
  | { type: 'paint'; visit: StageVisit; layer: 'main' | 'underlay' }
  | { type: 'reveal'; visit: StageVisit };

export function createStageHandoff(src: string, index: number): StageHandoffState {
  return { visit: { src, index }, outgoing: null, presented: null, frozen: new Map(),
    mainPainted: false, underlayPainted: false };
}

function retainFrame(state: StageHandoffState, frame: OutgoingFrame | null) {
  if (!frame) return state.frozen;
  const frozen = new Map(state.frozen);
  // Refresh insertion order: keep recently displayed poses, rather than recently loaded bitmaps.
  frozen.delete(frame.src);
  frozen.set(frame.src, { dims: { ...frame.dims }, cssTransform: frame.cssTransform });
  if (frozen.size > 24) {
    for (const src of frozen.keys()) {
      if (frozen.size <= 16) break;
      if (src !== frame.src && src !== state.visit.src) frozen.delete(src);
    }
  }
  return frozen;
}

/** Pure transitions: no DOM reads, shared-ref writes, timers or React effects. */
export function stageHandoff(state: StageHandoffState, event: StageHandoffEvent): StageHandoffState {
  switch (event.type) {
    case 'select': {
      if (state.visit.src === event.src && state.visit.index === event.index) return state;
      // A covers an unpresented B: selecting C must keep A, even if B already loaded.
      const covered = state.outgoing && state.outgoing.src !== state.visit.src;
      const candidate = state.presented?.src === state.visit.src ? state.presented : null;
      const retained = covered ? state.outgoing : candidate ?? state.outgoing;
      return { visit: { src: event.src, index: event.index }, presented: state.presented,
        outgoing: retained?.src === event.src ? null : retained,
        frozen: retainFrame(state, retained), mainPainted: false, underlayPainted: false };
    }
    case 'present': {
      if (event.visit !== state.visit || state.outgoing) return state;
      const old = state.presented;
      const next = event.frame;
      if (old?.src === next.src && old.index === next.index && old.cssTransform === next.cssTransform &&
        old.dims.naturalWidth === next.dims.naturalWidth && old.dims.naturalHeight === next.dims.naturalHeight) return state;
      return { ...state, presented: next };
    }
    case 'prepare':
      if (event.visit !== state.visit || (state.outgoing && state.outgoing.src !== state.visit.src)) return state;
      return { ...state, outgoing: event.frame, frozen: retainFrame(state, event.frame) };
    case 'paint': {
      if (event.visit !== state.visit) return state;
      const key = event.layer === 'main' ? 'mainPainted' : 'underlayPainted';
      return state[key] ? state : { ...state, [key]: true };
    }
    case 'reveal':
      return event.visit !== state.visit || !state.outgoing ? state : { ...state, outgoing: null };
  }
}
