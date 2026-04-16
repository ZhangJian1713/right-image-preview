import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ZoomMode } from './types';
import {
  clampNatural,
  containerToNatural,
  naturalToMinimapInner,
  panDeltaFromMinimapPointerDelta,
  rotatedRectExtents,
  type MinimapTransformParams,
} from './minimapMath';

const INNER = 152; // inner thumbnail box (px)
const BORDER = 2;
/** Flush to preview corner; bottom ~toolbar baseline (toolbar uses bottom: 20). */
const MINIMAP_RIGHT = 10;
const MINIMAP_BOTTOM = 22;

type PointerCapableElement = globalThis.Element & {
  setPointerCapture?: (pointerId: number) => void;
  hasPointerCapture?: (pointerId: number) => boolean;
  releasePointerCapture: (pointerId: number) => void;
};

function tryBeginPointerCapture(target: EventTarget | null, pointerId: number): { el: globalThis.Element; id: number } | null {
  if (!target) return null;
  const el = target as PointerCapableElement;
  if (typeof el.setPointerCapture !== 'function') return null;
  try {
    el.setPointerCapture(pointerId);
    return { el: target as globalThis.Element, id: pointerId };
  } catch {
    return null;
  }
}

function releasePointerCaptureIfActive(el: globalThis.Element, pointerId: number): void {
  const t = el as PointerCapableElement;
  try {
    if (typeof t.hasPointerCapture === 'function' && t.hasPointerCapture(pointerId)) {
      t.releasePointerCapture(pointerId);
    }
  } catch {
    /* ignore */
  }
}

export interface MinimapProps {
  imageSrc: string;
  imageAlt: string;
  nw: number;
  nh: number;
  cw: number;
  ch: number;
  /** Current CSS scale (same as main `transform.scale`). */
  scale: number;
  mode: ZoomMode;
  tx: number;
  ty: number;
  rotationDeg: number;
  flipH: boolean;
  flipV: boolean;
  controlsVisible: boolean;
  onPanByDelta: (dx: number, dy: number) => void;
  onUserActivity?: () => void;
  /** Fires when the user starts / ends dragging the viewport frame (for disabling main-image transition). */
  onDragChange?: (dragging: boolean) => void;
  ariaLabel: string;
}

/**
 * Renders the overflow minimap and handles viewport-frame dragging.
 *
 * **Pointer session:** After `preventDefault()` on `pointerdown`, Chromium may not emit `mouseup`. The drag
 * must end via `pointerup` / `pointercancel` on `window` (capture). See `docs/minimap.md`.
 *
 * **Pan mapping:** Uses `panDeltaFromMinimapPointerDelta` (Jacobian at viewport centre), not quad AABB ratios.
 */
export function Minimap({
  imageSrc,
  imageAlt,
  nw,
  nh,
  cw,
  ch,
  scale,
  mode,
  tx,
  ty,
  rotationDeg,
  flipH,
  flipV,
  controlsVisible,
  onPanByDelta,
  onUserActivity,
  onDragChange,
  ariaLabel,
}: MinimapProps) {
  const maskId = useId().replace(/:/g, '_');

  const mainP: MinimapTransformParams = useMemo(
    () => ({ cw, ch, nw, nh, scale, tx, ty, rotationDeg, flipH, flipV }),
    [cw, ch, nw, nh, scale, tx, ty, rotationDeg, flipH, flipV],
  );

  const { rw, rh } = useMemo(() => rotatedRectExtents(nw, nh, rotationDeg), [nw, nh, rotationDeg]);
  const thumbS = useMemo(() => Math.min(INNER / Math.max(rw, 1e-6), INNER / Math.max(rh, 1e-6)) * 0.98, [rw, rh]);

  const cornersNat = useMemo(() => {
    const c: { nx: number; ny: number }[] = [
      containerToNatural(0, 0, mainP),
      containerToNatural(cw, 0, mainP),
      containerToNatural(cw, ch, mainP),
      containerToNatural(0, ch, mainP),
    ].map((p) => clampNatural(p.nx, p.ny, nw, nh));
    return c;
  }, [mainP, cw, ch, nw, nh]);

  const polyPts = useMemo(() => {
    return cornersNat
      .map((p) => naturalToMinimapInner(p.nx, p.ny, INNER, INNER, nw, nh, thumbS, rotationDeg, flipH, flipV))
      .map((p) => `${p.mx.toFixed(2)},${p.my.toFixed(2)}`)
      .join(' ');
  }, [cornersNat, nw, nh, thumbS, rotationDeg, flipH, flipV]);

  /** Fresh `tx`/`ty` for each `pointermove` (updated in layout after `panByDelta`). */
  const dragTransformRef = useRef({ p: mainP, nw, nh, thumbS });
  useLayoutEffect(() => {
    dragTransformRef.current = { p: mainP, nw, nh, thumbS };
  }, [mainP, nw, nh, thumbS]);

  const [viewportDragging, setViewportDragging] = useState(false);
  const lastClientRef = useRef({ x: 0, y: 0 });

  const docSessionRef = useRef<{
    move: (e: PointerEvent) => void;
    up: (e: PointerEvent) => void;
    blur: () => void;
  } | null>(null);
  const pointerCaptureRef = useRef<{ el: globalThis.Element; id: number } | null>(null);

  const onPanByDeltaRef = useRef(onPanByDelta);
  onPanByDeltaRef.current = onPanByDelta;
  const onUserActivityRef = useRef(onUserActivity);
  onUserActivityRef.current = onUserActivity;
  const onDragChangeRef = useRef(onDragChange);
  onDragChangeRef.current = onDragChange;

  const teardownMinimapDrag = () => {
    const s = docSessionRef.current;
    if (!s) return;
    window.removeEventListener('blur', s.blur);
    window.removeEventListener('pointermove', s.move, true);
    window.removeEventListener('pointerup', s.up, true);
    window.removeEventListener('pointercancel', s.up, true);
    docSessionRef.current = null;

    const cap = pointerCaptureRef.current;
    if (cap) {
      pointerCaptureRef.current = null;
      releasePointerCaptureIfActive(cap.el, cap.id);
    }
  };

  const endMinimapDrag = () => {
    if (!docSessionRef.current) return;
    teardownMinimapDrag();
    setViewportDragging(false);
    onDragChangeRef.current?.(false);
    onUserActivityRef.current?.();
  };

  useEffect(
    () => () => {
      if (docSessionRef.current) {
        teardownMinimapDrag();
        onDragChangeRef.current?.(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount-only: no setState
    [],
  );

  const onViewportHandleDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (docSessionRef.current) endMinimapDrag();

    e.preventDefault();
    e.stopPropagation();

    dragTransformRef.current = { p: mainP, nw, nh, thumbS };

    const pointerId = e.pointerId;
    lastClientRef.current = { x: e.clientX, y: e.clientY };
    setViewportDragging(true);
    onDragChangeRef.current?.(true);
    onUserActivityRef.current?.();

    const applyClientDelta = (clientX: number, clientY: number) => {
      const dx = clientX - lastClientRef.current.x;
      const dy = clientY - lastClientRef.current.y;
      lastClientRef.current = { x: clientX, y: clientY };
      if (dx === 0 && dy === 0) return;

      const { p, nw: nw0, nh: nh0, thumbS: ts } = dragTransformRef.current;
      const { dtx, dty } = panDeltaFromMinimapPointerDelta(dx, dy, p, nw0, nh0, INNER, ts);
      const pan = onPanByDeltaRef.current;
      if (typeof pan === 'function' && Number.isFinite(dtx) && Number.isFinite(dty)) {
        pan(dtx, dty);
      }
      onUserActivityRef.current?.();
    };

    const onBlurWindow = () => endMinimapDrag();

    pointerCaptureRef.current = tryBeginPointerCapture(e.currentTarget, pointerId);

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      ev.preventDefault();
      applyClientDelta(ev.clientX, ev.clientY);
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      ev.preventDefault();
      endMinimapDrag();
    };

    docSessionRef.current = { move: onMove, up: onUp, blur: onBlurWindow };
    window.addEventListener('pointermove', onMove, { capture: true, passive: false });
    window.addEventListener('pointerup', onUp, { capture: true });
    window.addEventListener('pointercancel', onUp, { capture: true });
    window.addEventListener('blur', onBlurWindow);
  };

  const normDeg = ((rotationDeg % 360) + 360) % 360;
  const swapped = normDeg === 90 || normDeg === 270;
  const sw = (swapped ? nh : nw) * scale;
  const sh = (swapped ? nw : nh) * scale;
  const overflow = mode === 'native' && (sw > cw + 0.5 || sh > ch + 0.5);

  if (!overflow || nw <= 0 || nh <= 0 || cw <= 0 || ch <= 0) return null;

  const thumbTransform = `rotate(${rotationDeg}deg)${flipH ? ' scaleX(-1)' : ''}${flipV ? ' scaleY(-1)' : ''} scale(${thumbS})`;

  return (
    <div
      role="navigation"
      aria-label={ariaLabel}
      title={imageAlt}
      onWheel={(e) => {
        e.stopPropagation();
        onUserActivity?.();
      }}
      style={{
        position: 'absolute',
        right: MINIMAP_RIGHT,
        bottom: MINIMAP_BOTTOM,
        zIndex: 25,
        padding: BORDER,
        background: 'rgba(8,12,22,0.88)',
        border: '2px solid rgba(255,255,255,0.92)',
        borderRadius: 4,
        boxShadow: '0 4px 18px rgba(0,0,0,0.55)',
        opacity: controlsVisible ? 1 : 0.12,
        transition: controlsVisible ? 'opacity 0.12s ease' : 'opacity 1.6s ease',
        userSelect: 'none',
        touchAction: 'none',
        cursor: viewportDragging ? 'grabbing' : undefined,
      }}
    >
      <div
        style={{
          width: INNER,
          height: INNER,
          position: 'relative',
          overflow: 'hidden',
          background: 'rgba(0,0,0,0.35)',
        }}
      >
        <img
          src={imageSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: 'absolute',
            left: (INNER - nw) / 2,
            top: (INNER - nh) / 2,
            width: nw,
            height: nh,
            transform: thumbTransform,
            transformOrigin: 'center center',
            pointerEvents: 'none',
          }}
        />
        <svg
          width={INNER}
          height={INNER}
          style={{ position: 'absolute', left: 0, top: 0, display: 'block' }}
          aria-hidden="true"
        >
          <defs>
            <mask id={maskId}>
              <rect width={INNER} height={INNER} fill="white" />
              <polygon points={polyPts} fill="black" />
            </mask>
          </defs>
          <rect width={INNER} height={INNER} fill="rgba(0,0,0,0.52)" mask={`url(#${maskId})`} style={{ pointerEvents: 'none' }} />
          {/* Viewport frame: thin solid light stroke (Lightroom-style), single interactive layer */}
          <polygon
            points={polyPts}
            fill="rgba(255,255,255,0.06)"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={1}
            strokeLinejoin="miter"
            vectorEffect="non-scaling-stroke"
            style={{ cursor: viewportDragging ? 'grabbing' : 'grab', pointerEvents: 'all' }}
            onPointerDown={onViewportHandleDown}
          />
        </svg>
      </div>
    </div>
  );
}
