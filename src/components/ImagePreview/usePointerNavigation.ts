import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import type { ThumbPaceHoldDir } from './useThumbPacedNavigation';

interface Params {
  beginHold(direction: ThumbPaceHoldDir): void;
  endHold(): void;
  prev(): void;
  next(): void;
}
type ArrowHandlers = Pick<ButtonHTMLAttributes<HTMLButtonElement>,
  'onPointerDown' | 'onPointerUp' | 'onPointerCancel' | 'onLostPointerCapture' | 'onClick'>;

/** Pointer ownership outlives a side arrow that disappears at the first/last image. */
export function usePointerNavigation(value: Params) {
  const params = useRef(value);
  useLayoutEffect(() => { params.current = value; });
  const pointer = useRef<number | null>(null);
  const cancel = useCallback(() => {
    pointer.current = null;
    params.current.endHold();
  }, []);
  const release = useCallback((event: { pointerId: number }) => {
    if (pointer.current !== null && event.pointerId === pointer.current) cancel();
  }, [cancel]);
  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (event.buttons === 0) release(event);
    };
    // Capture also sees releases outside the button, after unmount, or stopped by a child.
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', release, true);
    window.addEventListener('lostpointercapture', release, true);
    window.addEventListener('pointermove', move, true);
    window.addEventListener('blur', cancel);
    return () => {
      window.removeEventListener('pointerup', release, true);
      window.removeEventListener('pointercancel', release, true);
      window.removeEventListener('lostpointercapture', release, true);
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('blur', cancel);
      cancel();
    };
  }, [release, cancel]);
  const bind = useCallback((direction: ThumbPaceHoldDir): ArrowHandlers => ({
    onPointerDown(event) {
      if (event.button !== 0 || event.isPrimary === false) return;
      event.preventDefault();
      pointer.current = event.pointerId;
      try { event.currentTarget.setPointerCapture?.(event.pointerId); }
      catch { /* Window release listeners also cover unavailable/lost capture. */ }
      params.current.beginHold(direction);
    },
    onPointerUp: release,
    onPointerCancel: release,
    onLostPointerCapture: release,
    onClick(event) {
      // Pointer navigation already stepped on down. Keyboard/assistive clicks step once here.
      if (event.detail !== 0) return;
      cancel();
      if (direction === 'prev') params.current.prev(); else params.current.next();
    },
  }), [release, cancel]);
  return { bind, cancel };
}
