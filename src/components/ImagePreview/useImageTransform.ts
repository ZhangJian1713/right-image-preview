import { useCallback, useEffect, useRef, useState } from 'react';
import type { ZoomMode } from './types';

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

export interface UseImageTransformOptions {
  mode: ZoomMode;
  nativePercent: number;
  fitResetPan: boolean;
}

export interface UseImageTransformResult {
  transform: TransformState;
  /** True while the user is actively dragging (disable CSS transition during pan). */
  isPanning: boolean;
  /** Fit-equivalent native% (undefined until both image and container are measured). */
  fitEquivalentNativePercent: number | undefined;
  /** Callback ref – pass as `ref={setContainerEl}` on the viewport div. */
  setContainerEl: (el: HTMLDivElement | null) => void;
  onImageLoad(dims: ImageDimensions): void;
  resetImageDims(): void;
  onPanStart(e: React.PointerEvent): void;
  onPanMove(e: React.PointerEvent): void;
  onPanEnd(e?: React.PointerEvent): void;
  resetPan(): void;
  rotateCW(): void;
  rotateCCW(): void;
  flipHorizontal(): void;
  flipVertical(): void;
  /** Reset rotation and flip to their initial state. */
  resetOrientation(): void;
  imageDims: ImageDimensions | null;
  containerSize: ContainerSize | null;
}

function computeFitScale(dims: ImageDimensions, container: ContainerSize): number {
  if (container.width === 0 || container.height === 0) return 1;
  return Math.min(container.width / dims.naturalWidth, container.height / dims.naturalHeight);
}

function buildCssTransform(
  tx: number,
  ty: number,
  rotation: Rotation,
  flipH: boolean,
  flipV: boolean,
  scale: number,
): string {
  const parts: string[] = [`translate(${tx}px, ${ty}px)`, `rotate(${rotation}deg)`];
  if (flipH) parts.push('scaleX(-1)');
  if (flipV) parts.push('scaleY(-1)');
  parts.push(`scale(${scale})`);
  return parts.join(' ');
}

export function useImageTransform(options: UseImageTransformOptions): UseImageTransformResult {
  const { mode, nativePercent, fitResetPan } = options;

  const [imageDims, setImageDims] = useState<ImageDimensions | null>(null);
  const [containerSize, setContainerSize] = useState<ContainerSize | null>(null);

  // Translate — kept in both state (drives render) and ref (sync read in event handlers).
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const translateRef = useRef({ x: 0, y: 0 });

  const [rotation, setRotation] = useState<Rotation>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);

  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const pointersRef = useRef<Map<number, PointerEvent>>(new Map());

  const applyTranslate = useCallback((x: number, y: number) => {
    translateRef.current = { x, y };
    setTranslateX(x);
    setTranslateY(y);
  }, []);

  // ── Container measurement ─────────────────────────────────────────────────

  useEffect(() => {
    if (!containerEl) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setContainerSize({ width: rect.width, height: rect.height });
    });
    ro.observe(containerEl);
    return () => ro.disconnect();
  }, [containerEl]);

  // ── Image dims ────────────────────────────────────────────────────────────

  const onImageLoad = useCallback((dims: ImageDimensions) => {
    setImageDims((prev) => {
      if (
        prev &&
        prev.naturalWidth === dims.naturalWidth &&
        prev.naturalHeight === dims.naturalHeight
      ) {
        return prev;
      }
      return dims;
    });
  }, []);

  const resetImageDims = useCallback(() => setImageDims(null), []);

  // ── Pan reset on fit ──────────────────────────────────────────────────────

  const prevModeRef = useRef(mode);
  useEffect(() => {
    if (prevModeRef.current !== 'fit' && mode === 'fit' && fitResetPan) {
      applyTranslate(0, 0);
    }
    prevModeRef.current = mode;
  }, [mode, fitResetPan, applyTranslate]);

  const resetPan = useCallback(() => applyTranslate(0, 0), [applyTranslate]);

  // ── Rotation & flip ───────────────────────────────────────────────────────

  // Do NOT wrap with % 360. Keeping an ever-increasing (or decreasing) value
  // ensures the CSS transition always interpolates in the correct direction.
  // Wrapping 270 → 0 would make the browser animate -270° (backwards).
  const rotateCW = useCallback(() => setRotation((r) => r + 90), []);
  const rotateCCW = useCallback(() => setRotation((r) => r - 90), []);
  const flipHorizontal = useCallback(() => setFlipH((v) => !v), []);
  const flipVertical = useCallback(() => setFlipV((v) => !v), []);
  const resetOrientation = useCallback(() => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  }, []);

  // ── Pointer-drag pan ──────────────────────────────────────────────────────

  const onPanStart = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pointersRef.current.set(e.pointerId, e.nativeEvent);
    if (pointersRef.current.size === 1) {
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        tx: translateRef.current.x,
        ty: translateRef.current.y,
      };
      setIsPanning(true);
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPanMove = useCallback((e: React.PointerEvent) => {
    if (e.buttons === 0) {
      pointersRef.current.clear();
      panStartRef.current = null;
      setIsPanning(false);
      return;
    }
    pointersRef.current.set(e.pointerId, e.nativeEvent);
    if (pointersRef.current.size === 1 && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      applyTranslate(panStartRef.current.tx + dx, panStartRef.current.ty + dy);
    }
  }, [applyTranslate]);

  const onPanEnd = useCallback((e?: React.PointerEvent) => {
    if (e) pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 0) {
      panStartRef.current = null;
      setIsPanning(false);
    }
  }, []);

  // ── Derive scale & transform ──────────────────────────────────────────────

  let scale = 1;
  let fitEquivalentNativePercent: number | undefined;

  if (imageDims && containerSize) {
    // Normalise to 0-359 for the swap check (rotation may be negative or > 360).
    const normDeg = ((rotation % 360) + 360) % 360;
    const isSwapped = normDeg === 90 || normDeg === 270;
    const fitDims = isSwapped
      ? { naturalWidth: imageDims.naturalHeight, naturalHeight: imageDims.naturalWidth }
      : imageDims;
    const fitScale = computeFitScale(fitDims, containerSize);
    fitEquivalentNativePercent = fitScale * 100;
    scale = mode === 'fit' ? fitScale : nativePercent / 100;
  }

  const effectiveTx = mode === 'fit' ? 0 : translateX;
  const effectiveTy = mode === 'fit' ? 0 : translateY;
  const cssTransform = buildCssTransform(effectiveTx, effectiveTy, rotation, flipH, flipV, scale);

  return {
    transform: { scale, translateX: effectiveTx, translateY: effectiveTy, rotation, flipH, flipV, cssTransform },
    isPanning,
    fitEquivalentNativePercent,
    setContainerEl,
    onImageLoad,
    resetImageDims,
    onPanStart,
    onPanMove,
    onPanEnd,
    resetPan,
    rotateCW,
    rotateCCW,
    flipHorizontal,
    flipVertical,
    resetOrientation,
    imageDims,
    containerSize,
  };
}
