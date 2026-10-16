import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ZoomMode } from '../types';
import type { ThumbPaceHoldDir } from './useThumbPacedNavigation';
import { previewPhysicalKey, resolvePreviewShortcut } from './previewShortcuts';

export interface UseImagePreviewKeyboardParams {
  resetHideTimer(): void;
  onClose?: () => void;
  zoomIn(fitEq?: number): void;
  zoomOut(fitEq?: number): void;
  fit(): void;
  setNative(percent: number): void;
  mode: ZoomMode;
  cycleZoom?(): void;
  first?(): void;
  last?(): void;
  canPan?: boolean;
  toggleFullscreen?(): void;
  showShortcuts?(): void;
  toggleExif?(): void;
  prev(): void;
  next(): void;
  prevGroup(): void;
  nextGroup(): void;
  rotateCW(): void;
  rotateCCW(): void;
  panByDelta(dx: number, dy: number): void;
  keyboardPanStepPx: number;
  fitEquivalentNativePercent: number | undefined;
  /** When set, Delete / Backspace removes the current image. */
  onDeleteImage?: () => void;
  /**
   * When false, ignore all keys (e.g. `presentation="contained"` while focus is outside).
   * Default true.
   */
  keyboardActive?: boolean;
  /**
   * When true (browser fullscreen owned by the preview), Esc exits fullscreen instead of closing.
   */
  isFullscreen?: () => boolean;
  exitFullscreen?: () => void | Promise<void>;
  /**
   * Thumb-paced ←/→ hold (optional). When set, ArrowLeft/Right (without mod/shift)
   * use begin/end hold instead of calling prev/next on every key-repeat.
   */
  beginNavHold?: (dir: ThumbPaceHoldDir) => void;
  endNavHold?: (dir?: ThumbPaceHoldDir) => void;
}

/** Stable listeners keep held navigation alive across image/thumbnail renders. */
export function useImagePreviewKeyboard(p: UseImagePreviewKeyboardParams): void {
  const params = useRef(p);
  const heldPan = useRef(new Map<string, readonly [number, number]>());
  const heldNav = useRef(new Map<string, ThumbPaceHoldDir>());
  useLayoutEffect(() => { params.current = p; });
  useEffect(() => {
    if (p.keyboardActive === false || p.canPan === false) heldPan.current.clear();
    if (p.keyboardActive === false) { heldNav.current.clear(); params.current.endNavHold?.(); }
  }, [p.keyboardActive, p.canPan]);
  useEffect(() => {
    const clear = () => { heldPan.current.clear(); heldNav.current.clear(); params.current.endNavHold?.(); };
    const down = (event: KeyboardEvent) => {
      const p = params.current;
      if (p.keyboardActive === false || event.defaultPrevented) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input,textarea,select,[contenteditable]')) return;
      p.resetHideTimer();
      const shortcut = resolvePreviewShortcut(event, { navigation: true, groups: true,
        exif: !!p.toggleExif, delete: !!p.onDeleteImage, shortcuts: !!p.showShortcuts }, p.canPan ?? p.mode === 'native');
      if (!shortcut) return;
      if (shortcut.physicalKey === 'Space' && target instanceof Element && target.closest('button,[role="button"]')) return;
      event.preventDefault();
      if (shortcut.action === 'previous' || shortcut.action === 'next') {
        if (!event.repeat && !heldNav.current.has(shortcut.physicalKey)) {
          const dir = shortcut.action === 'previous' ? 'prev' : 'next';
          heldNav.current.set(shortcut.physicalKey, dir);
          if (p.beginNavHold) p.beginNavHold(dir);
          else if (dir === 'prev') p.prev(); else p.next();
        }
        return;
      }
      if (shortcut.pan) {
        p.endNavHold?.(); heldNav.current.clear();
        heldPan.current.set(shortcut.physicalKey, shortcut.pan);
        let x = 0, y = 0;
        for (const vector of heldPan.current.values()) { x += vector[0]; y += vector[1]; }
        const length = Math.hypot(x, y);
        if (length) p.panByDelta(x / length * p.keyboardPanStepPx, y / length * p.keyboardPanStepPx);
        return;
      }
      if (event.repeat && !shortcut.repeat) return;
      switch (shortcut.action) {
        case 'zoomIn': p.zoomIn(p.fitEquivalentNativePercent); break;
        case 'zoomOut': p.zoomOut(p.fitEquivalentNativePercent); break;
        case 'fit': p.fit(); break;
        case 'actualSize': p.setNative(100); break;
        case 'cycleZoom':
          if (p.cycleZoom) p.cycleZoom(); else if (p.mode === 'fit') p.setNative(100); else p.fit();
          break;
        case 'rotateCW': p.rotateCW(); break;
        case 'rotateCCW': p.rotateCCW(); break;
        case 'first': clear(); p.first?.(); break;
        case 'last': clear(); p.last?.(); break;
        case 'previousGroup': p.prevGroup(); break;
        case 'nextGroup': p.nextGroup(); break;
        case 'fullscreen': clear(); p.toggleFullscreen?.(); break;
        case 'shortcuts': clear(); p.showShortcuts?.(); break;
        case 'exif': p.toggleExif?.(); break;
        case 'delete': p.onDeleteImage?.(); break;
        case 'close':
          clear();
          if (p.isFullscreen?.()) void p.exitFullscreen?.(); else p.onClose?.();
          break;
      }
    };
    const up = (event: KeyboardEvent) => {
      const key = previewPhysicalKey(event);
      heldPan.current.delete(key);
      const wasHeld = heldNav.current.delete(key);
      if (wasHeld) {
        const remaining = Array.from(heldNav.current.values());
        if (!remaining.length) params.current.endNavHold?.();
        else params.current.beginNavHold?.(remaining[remaining.length - 1]);
      }
    };
    const visibility = () => { if (document.hidden) clear(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up, true); window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up, true); window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', visibility); clear();
    };
  }, []);
}
