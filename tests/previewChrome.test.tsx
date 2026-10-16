import { StrictMode, useLayoutEffect, type ReactNode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePreviewControls } from '../src/components/ImagePreview/shell/usePreviewControls';
import { useDelayedIndicator } from '../src/components/ImagePreview/shell/useDelayedIndicator';

beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('hides chrome after 3s idle, keeps the deadline across renders, and restarts on activity', () => {
  const { result, rerender, unmount } = renderHook(() => usePreviewControls());
  const reset = result.current.resetHideTimer;
  act(() => { vi.advanceTimersByTime(1500); });
  rerender();
  expect(result.current.resetHideTimer).toBe(reset);
  act(() => { vi.advanceTimersByTime(1500); });
  expect(result.current.controlsVisible).toBe(false);
  act(() => { reset(); });
  expect(result.current.controlsVisible).toBe(true);
  expect(vi.getTimerCount()).toBe(1);
  act(() => { vi.advanceTimersByTime(2999); });
  expect(result.current.controlsVisible).toBe(true);
  act(() => { vi.advanceTimersByTime(1); });
  expect(result.current.controlsVisible).toBe(false);
  unmount();
  act(() => { reset(); });
  expect(vi.getTimerCount()).toBe(0);
});

it('delays only uninterrupted loading periods and hides immediately in the finishing commit', () => {
  const commits: boolean[] = [];
  const { result, rerender, unmount } = renderHook(({ active }) => {
    const visible = useDelayedIndicator(active, 300);
    useLayoutEffect(() => { commits.push(visible); }, [active, visible]);
    return visible;
  }, { initialProps: { active: false } });
  expect(vi.getTimerCount()).toBe(0);
  rerender({ active: true });
  act(() => { vi.advanceTimersByTime(299); });
  expect(result.current).toBe(false);
  act(() => { vi.advanceTimersByTime(1); });
  expect(result.current).toBe(true);
  const beforeFinish = commits.length;
  rerender({ active: false });
  expect(commits.slice(beforeFinish)).toEqual([false]);
  rerender({ active: true });
  expect(result.current).toBe(false);
  act(() => { vi.advanceTimersByTime(100); });
  rerender({ active: false });
  act(() => { vi.advanceTimersByTime(1000); });
  expect(result.current).toBe(false);
  rerender({ active: true });
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it('keeps only the current timers when StrictMode replays effects', () => {
  function Wrapper({ children }: { children: ReactNode }) { return <StrictMode>{children}</StrictMode>; }
  const { result, unmount } = renderHook(() => ({
    controls: usePreviewControls(), loading: useDelayedIndicator(true, 300),
  }), { wrapper: Wrapper });
  expect(vi.getTimerCount()).toBe(2);
  act(() => { vi.advanceTimersByTime(300); });
  expect(result.current.loading).toBe(true);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
