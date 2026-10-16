import { useCallback, useEffect, useRef, useState } from 'react';
import { PREVIEW_CONTROLS_IDLE_MS } from '../imagePreviewTuning';

/** Owns only chrome visibility; user activity must not pause neighbor image preloading. */
export function usePreviewControls() {
  const [controlsVisible, setControlsVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const active = useRef(false);
  const armHideTimer = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setControlsVisible(false), PREVIEW_CONTROLS_IDLE_MS);
  }, []);
  const resetHideTimer = useCallback(() => {
    if (!active.current) return;
    setControlsVisible(true);
    armHideTimer();
  }, [armHideTimer]);

  useEffect(() => {
    active.current = true;
    armHideTimer();
    return () => {
      active.current = false;
      clearTimeout(timer.current);
      timer.current = undefined;
    };
  }, [armHideTimer]);

  return { controlsVisible, resetHideTimer };
}
