import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';

interface GestureOptions {
  enabled: boolean;
  resourceKey: string;
  mode: 'fit' | 'native';
  onCycle(point: { x: number; y: number }): void;
  onPanStart(event: ReactPointerEvent): void;
  onPanMove(event: ReactPointerEvent): void;
  onPanEnd(event?: ReactPointerEvent): void;
}
interface Session {
  id: number;
  down: ReactPointerEvent;
  phase: 'zoomed' | 'pending' | 'dragging';
  suppressZoom: boolean;
}

/** Mouse click/drag ownership; touch and pen retain the existing pan/pinch path. */
export function useClickZoomGesture(options: GestureOptions) {
  const latest = useRef(options);
  useLayoutEffect(() => { latest.current = options; });
  const session = useRef<Session | undefined>(undefined);
  const lastPress = useRef<{ time: number; x: number; y: number } | undefined>(undefined);
  const consumedAt = useRef(0);
  const scope = useMemo(() => ({ resourceKey: options.resourceKey, enabled: options.enabled }),
    [options.resourceKey, options.enabled]);
  const [draggingScope, setDraggingScope] = useState<object | null>(null);
  const dragging = options.enabled && draggingScope === scope;

  const finish = useCallback((event?: PointerEvent | ReactPointerEvent, cancelled = true) => {
    const current = session.current;
    if (!current || (event && event.pointerId !== current.id)) return;
    session.current = undefined;
    if (current.phase === 'dragging') latest.current.onPanEnd((event || current.down) as ReactPointerEvent);
    else if (!cancelled && current.phase === 'pending' && !current.suppressZoom) {
      latest.current.onCycle({ x: current.down.clientX, y: current.down.clientY });
    }
    consumedAt.current = Date.now();
    const target = current.down.currentTarget as HTMLElement;
    if (target.hasPointerCapture?.(current.id)) target.releasePointerCapture(current.id);
  }, []);

  useEffect(() => {
    const up = (event: PointerEvent) => { finish(event, false); setDraggingScope(null); };
    const cancel = (event: PointerEvent) => { finish(event); setDraggingScope(null); };
    const blur = () => { finish(); setDraggingScope(null); };
    const hide = () => { if (document.hidden) blur(); };
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', cancel, true);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', hide);
    return () => {
      finish(undefined, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', cancel, true);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [finish]);
  useEffect(() => {
    finish(undefined, true);
    lastPress.current = undefined;
    return () => finish(undefined, true);
  }, [options.resourceKey, options.enabled, finish]);

  return {
    dragging,
    onPointerDown(event: ReactPointerEvent) {
      if (!latest.current.enabled || event.pointerType !== 'mouse') {
        latest.current.onPanStart(event);
        return;
      }
      if (event.button !== 0 || event.isPrimary === false) return;
      finish();
      setDraggingScope(null);
      event.preventDefault();
      event.stopPropagation();
      const previous = lastPress.current;
      const suppressZoom = !!previous && Date.now() - previous.time < 350 &&
        Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <= 4;
      lastPress.current = { time: Date.now(), x: event.clientX, y: event.clientY };
      // SyntheticEvent.currentTarget is cleared after dispatch; retain its original identity.
      const down = { ...event, currentTarget: event.currentTarget, target: event.currentTarget,
        nativeEvent: event.nativeEvent } as ReactPointerEvent;
      session.current = { id: event.pointerId, down,
        phase: latest.current.mode === 'fit' ? 'zoomed' : 'pending', suppressZoom };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      if (latest.current.mode === 'fit' && !suppressZoom) {
        latest.current.onCycle({ x: event.clientX, y: event.clientY });
      }
      consumedAt.current = Date.now();
    },
    onPointerMove(event: ReactPointerEvent) {
      const current = session.current;
      if (!current) {
        if (!latest.current.enabled || event.pointerType !== 'mouse') latest.current.onPanMove(event);
        return;
      }
      if (event.pointerId !== current.id) return;
      if (!(event.buttons & 1)) { finish(event); setDraggingScope(null); return; }
      event.preventDefault();
      event.stopPropagation();
      if (current.phase === 'pending' && Math.hypot(event.clientX - current.down.clientX,
        event.clientY - current.down.clientY) > 4) {
        current.phase = 'dragging';
        lastPress.current = undefined;
        latest.current.onPanStart(current.down);
        setDraggingScope(scope);
      }
      if (current.phase === 'dragging') latest.current.onPanMove(event);
    },
    onPointerUp(event: ReactPointerEvent) {
      if (session.current) finish(event, false);
      else if (!latest.current.enabled || event.pointerType !== 'mouse') latest.current.onPanEnd(event);
    },
    onPointerCancel(event: ReactPointerEvent) {
      finish(event);
      setDraggingScope(null);
      if (!latest.current.enabled || event.pointerType !== 'mouse') latest.current.onPanEnd(event);
    },
    onClickCapture(event: ReactMouseEvent) {
      if (Date.now() - consumedAt.current < 500 &&
        !(event.target as HTMLElement).closest('button,input,select,textarea,a,[role="button"]')) {
        consumedAt.current = 0;
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}
