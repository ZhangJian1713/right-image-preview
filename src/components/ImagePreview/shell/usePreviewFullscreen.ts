import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { FullscreenAdapter } from '../types';

interface Options {
  rootRef: RefObject<HTMLElement | null>;
  adapter?: FullscreenAdapter;
  onError?: (error: unknown) => void;
}

/** Host adapters are exclusive authorities; browser mode waits for API + event confirmation. */
export function usePreviewFullscreen({ rootRef, adapter, onError }: Options) {
  const [browserIsFullscreen, setBrowserIsFullscreen] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  const cancelBrowserAction = useRef<(() => void) | undefined>(undefined);
  const browserState = useCallback(() => !!rootRef.current && document.fullscreenElement === rootRef.current, [rootRef]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; cancelBrowserAction.current?.(); };
  }, []);

  useEffect(() => {
    if (adapter) return;
    const sync = () => { if (!busy.current) setBrowserIsFullscreen(browserState()); };
    // Subscribe and read the external browser state, including pre-existing fullscreen.
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, [adapter, browserState]);

  const browserAction = useCallback((expected: boolean, invoke: () => Promise<void>) =>
    new Promise<boolean>((resolve, reject) => {
      let settled = false;
      let apiConfirmed = false;
      let eventConfirmed = false;
      const finish = (confirmed: boolean, error?: unknown) => {
        if (settled) return;
        settled = true;
        document.removeEventListener('fullscreenchange', change);
        window.clearTimeout(timer);
        cancelBrowserAction.current = undefined;
        if (error !== undefined) reject(error);
        else resolve(confirmed);
      };
      const change = () => {
        eventConfirmed = browserState() === expected;
        if (eventConfirmed && apiConfirmed) finish(true);
      };
      // Bound the entire handshake, including browsers that never settle the API promise.
      const timer = window.setTimeout(() => finish(false), 2000);
      cancelBrowserAction.current = () => finish(false);
      document.addEventListener('fullscreenchange', change);
      try {
        Promise.resolve(invoke()).then(() => {
          apiConfirmed = true;
          if (eventConfirmed) finish(true);
        }, (error: unknown) => finish(false, error));
      } catch (error) { finish(false, error); }
    }), [browserState]);

  const isFullscreen = useCallback(() => adapter ? adapter.isFullscreen === true : browserState(), [adapter, browserState]);
  const toggleOnly = typeof adapter?.toggle === 'function';

  const perform = useCallback(async (action: 'enter' | 'exit' | 'toggle'): Promise<boolean> => {
    if (!mounted.current || busy.current) return false;
    busy.current = true;
    try {
      if (adapter) {
        const invoke = adapter[action];
        if (typeof invoke !== 'function') throw new Error(`The host only supports fullscreen toggling; explicit ${action} is unavailable.`);
        await invoke.call(adapter);
        return true;
      }
      const entering = action === 'enter';
      if (browserState() === entering) {
        setBrowserIsFullscreen(entering);
        return true;
      }
      const root = rootRef.current;
      if (!root || typeof root.requestFullscreen !== 'function' || typeof document.exitFullscreen !== 'function' || document.fullscreenEnabled === false) {
        throw new Error('Browser fullscreen is unavailable or disallowed. Supply a host fullscreen adapter.');
      }
      const confirmed = await browserAction(entering, () => entering ? root.requestFullscreen() : document.exitFullscreen());
      if (!mounted.current) return false;
      if (!confirmed) throw new Error('Browser fullscreen did not confirm the requested state within 2 seconds.');
      setBrowserIsFullscreen(entering);
      return true;
    } catch (error) {
      if (mounted.current) onError?.(error);
      return false;
    } finally { busy.current = false; }
  }, [adapter, rootRef, browserState, browserAction, onError]);

  const requestFullscreen = useCallback(() => perform('enter'), [perform]);
  const exitFullscreen = useCallback(async () => { await perform('exit'); }, [perform]);
  const toggleFullscreen = useCallback(() => {
    if (toggleOnly) void perform('toggle');
    else if (isFullscreen()) void exitFullscreen();
    else void requestFullscreen();
  }, [toggleOnly, perform, isFullscreen, exitFullscreen, requestFullscreen]);

  return { isFullscreen, requestFullscreen, exitFullscreen, toggleFullscreen, toggleOnly,
    fullscreenActive: adapter ? adapter.isFullscreen === true : browserIsFullscreen };
}
