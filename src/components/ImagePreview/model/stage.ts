import type { ImageDimensions } from './geometry';

export interface LayerPresentation {
  dims: ImageDimensions;
  /** Frozen CSS transform string (`translate … rotate … scale …`). */
  cssTransform: string;
}

export interface DisplayLayerEntry {
  index: number;
  src: string;
  isCurrent: boolean;
  /**
   * Previous frame held **full-size** (above / covering) until the incoming current layer
   * has painted full-size sharp. Only then may this layer shrink to keep-alive size.
   */
  isOutgoing?: boolean;
}

/** An image's complete retained pose. */
export interface OutgoingFrame extends LayerPresentation {
  src: string;
  index: number;
}

/** Identity of one selection, even when a later selection returns to the same URL. */
export interface StageVisit { src: string; index: number }
