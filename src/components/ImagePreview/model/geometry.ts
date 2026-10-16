export interface ImageDimensions {
  naturalWidth: number;
  naturalHeight: number;
}

export interface ContainerSize {
  width: number;
  height: number;
}

/** Accumulated rotation in degrees (not wrapped to 0-360, intentionally). */
export type Rotation = number;

export interface TransformState {
  scale: number;
  translateX: number;
  translateY: number;
  rotation: Rotation;
  flipH: boolean;
  flipV: boolean;
  /** Precomputed CSS transform string — apply directly to the img element. */
  cssTransform: string;
}
