import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useZoomState } from '../src/components/ImagePreview/useZoomState';

const DEFAULT_OPTS = {
  stops: [25, 50, 100, 200, 400],
  initialMode: 'fit' as const,
  firstZoomInStrategy: 'above-fit' as const,
  zoomOutBelowMinBehaviour: 'fit' as const,
  zoomInAtMaxBehaviour: 'noop' as const,
};

describe('useZoomState', () => {
  describe('initial state', () => {
    it('starts in fit mode by default', () => {
      const { result } = renderHook(() => useZoomState(DEFAULT_OPTS));
      expect(result.current.mode).toBe('fit');
    });

    it('starts in native mode when initialMode=native', () => {
      const { result } = renderHook(() =>
        useZoomState({ ...DEFAULT_OPTS, initialMode: 'native', initialNativePercent: 100 }),
      );
      expect(result.current.mode).toBe('native');
      expect(result.current.nativePercent).toBe(100);
    });

    it('clamps initialNativePercent to nearest stop', () => {
      const { result } = renderHook(() =>
        useZoomState({ ...DEFAULT_OPTS, initialMode: 'native', initialNativePercent: 80 }),
      );
      // Nearest to 80 among [25,50,100,200,400] is 100
      expect(result.current.nativePercent).toBe(100);
    });
  });

  describe('zoomIn from fit mode', () => {
    it('strategy=above-fit: enters native at smallest stop above fit-equivalent', () => {
      const { result } = renderHook(() => useZoomState(DEFAULT_OPTS));
      expect(result.current.mode).toBe('fit');

      act(() => {
        // fitEquivalentNativePercent = 60% (e.g., image is wider than viewport)
        result.current.zoomIn(60);
      });

      expect(result.current.mode).toBe('native');
      // smallest stop > 60 is 100
      expect(result.current.nativePercent).toBe(100);
    });

    it('strategy=above-fit: falls back to maxStop when fit-equivalent is above all stops', () => {
      const { result } = renderHook(() => useZoomState(DEFAULT_OPTS));
      act(() => {
        result.current.zoomIn(500); // above all stops
      });
      expect(result.current.nativePercent).toBe(400);
    });

    it('strategy=first-stop: always enters at first stop', () => {
      const { result } = renderHook(() =>
        useZoomState({ ...DEFAULT_OPTS, firstZoomInStrategy: 'first-stop' }),
      );
      act(() => {
        result.current.zoomIn(60);
      });
      expect(result.current.nativePercent).toBe(25);
    });

    it('strategy=hundred: always enters at 100%', () => {
      const { result } = renderHook(() =>
        useZoomState({ ...DEFAULT_OPTS, firstZoomInStrategy: 'hundred' }),
      );
      act(() => {
        result.current.zoomIn(60);
      });
      expect(result.current.nativePercent).toBe(100);
    });
  });

  describe('zoomIn from native mode', () => {
    it('advances to the next stop', () => {
      const { result } = renderHook(() =>
        useZoomState({ ...DEFAULT_OPTS, initialMode: 'native', initialNativePercent: 50 }),
      );
      act(() => result.current.zoomIn());
      expect(result.current.nativePercent).toBe(100);
    });

    it('does nothing at max stop when behaviour=noop', () => {
      const { result } = renderHook(() =>
        useZoomState({ ...DEFAULT_OPTS, initialMode: 'native', initialNativePercent: 400 }),
      );
      act(() => result.current.zoomIn());
      expect(result.current.nativePercent).toBe(400);
    });

    it('calls onMaxStopReached when behaviour=notify', () => {
      const onMaxStopReached = vi.fn();
      const { result } = renderHook(() =>
        useZoomState({
          ...DEFAULT_OPTS,
          initialMode: 'native',
          initialNativePercent: 400,
          zoomInAtMaxBehaviour: 'notify',
          onMaxStopReached,
        }),
      );
      act(() => result.current.zoomIn());
      expect(onMaxStopReached).toHaveBeenCalledOnce();
    });
  });

  describe('zoomOut from native mode', () => {
    it('goes to the previous stop', () => {
      const { result } = renderHook(() =>
        useZoomState({ ...DEFAULT_OPTS, initialMode: 'native', initialNativePercent: 200 }),
      );
      act(() => result.current.zoomOut());
      expect(result.current.nativePercent).toBe(100);
    });

    it('switches to fit when below min stop and behaviour=fit', () => {
      const { result } = renderHook(() =>
        useZoomState({ ...DEFAULT_OPTS, initialMode: 'native', initialNativePercent: 25 }),
      );
      act(() => result.current.zoomOut());
      expect(result.current.mode).toBe('fit');
    });

    it('does nothing at min stop when behaviour=noop', () => {
      const { result } = renderHook(() =>
        useZoomState({
          ...DEFAULT_OPTS,
          initialMode: 'native',
          initialNativePercent: 25,
          zoomOutBelowMinBehaviour: 'noop',
        }),
      );
      act(() => result.current.zoomOut());
      expect(result.current.mode).toBe('native');
      expect(result.current.nativePercent).toBe(25);
    });
  });

  describe('zoomOut from fit mode', () => {
    it('is a noop', () => {
      const { result } = renderHook(() => useZoomState(DEFAULT_OPTS));
      act(() => result.current.zoomOut());
      expect(result.current.mode).toBe('fit');
    });
  });

  describe('fit()', () => {
    it('switches to fit mode from native', () => {
      const { result } = renderHook(() =>
        useZoomState({ ...DEFAULT_OPTS, initialMode: 'native', initialNativePercent: 100 }),
      );
      act(() => result.current.fit());
      expect(result.current.mode).toBe('fit');
    });
  });

  describe('setNative()', () => {
    it('enters native mode at given percent', () => {
      const { result } = renderHook(() => useZoomState(DEFAULT_OPTS));
      act(() => result.current.setNative(200));
      expect(result.current.mode).toBe('native');
      expect(result.current.nativePercent).toBe(200);
    });

    it('snaps to nearest stop when percent not in stops', () => {
      const { result } = renderHook(() => useZoomState(DEFAULT_OPTS));
      act(() => result.current.setNative(130)); // nearest to 100
      expect(result.current.nativePercent).toBe(100);
    });
  });

  describe('sequential zoom round-trip', () => {
    it('fit → zoomIn → zoomIn → zoomOut → zoomOut → fit', () => {
      const { result } = renderHook(() => useZoomState(DEFAULT_OPTS));

      act(() => result.current.zoomIn(60)); // fit → native 100
      expect(result.current.mode).toBe('native');
      expect(result.current.nativePercent).toBe(100);

      act(() => result.current.zoomIn()); // 100 → 200
      expect(result.current.nativePercent).toBe(200);

      act(() => result.current.zoomOut()); // 200 → 100
      expect(result.current.nativePercent).toBe(100);

      act(() => result.current.zoomOut()); // 100 → 50
      expect(result.current.nativePercent).toBe(50);

      act(() => result.current.zoomOut()); // 50 → 25
      expect(result.current.nativePercent).toBe(25);

      act(() => result.current.zoomOut()); // 25 → fit (below min)
      expect(result.current.mode).toBe('fit');
    });
  });

  describe('onZoomChange callback', () => {
    it('is called on each zoom action with correct state', () => {
      const onZoomChange = vi.fn();
      const { result } = renderHook(() =>
        useZoomState({ ...DEFAULT_OPTS, onZoomChange }),
      );
      act(() => result.current.zoomIn(60));
      expect(onZoomChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ mode: 'native', nativePercent: 100 }),
      );
      act(() => result.current.fit());
      expect(onZoomChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ mode: 'fit' }),
      );
    });
  });

  describe('reset()', () => {
    it('restores initial state', () => {
      const { result } = renderHook(() => useZoomState(DEFAULT_OPTS));
      act(() => {
        result.current.zoomIn(60);
        result.current.zoomIn();
      });
      act(() => result.current.reset());
      expect(result.current.mode).toBe('fit');
    });
  });

  describe('boundary stops', () => {
    it('stops at max stop boundary', () => {
      const { result } = renderHook(() =>
        useZoomState({ ...DEFAULT_OPTS, initialMode: 'native', initialNativePercent: 400 }),
      );
      act(() => result.current.zoomIn()); // already at max
      expect(result.current.nativePercent).toBe(400);
    });
  });
});
