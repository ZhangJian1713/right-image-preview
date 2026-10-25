import { StrictMode, type ReactNode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useStageReveal } from '../src/components/ImagePreview/stage/useStageReveal';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

it('allows a loaded current image to display while frame callbacks are paused', () => {
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  const options = { visit: { src: 'test:a', index: 0 }, ready: true, holding: false,
    dims: { naturalWidth: 800, naturalHeight: 600 }, preferFastReveal: false,
    hideUntilReady: true, getRevealEl: () => null, onDecoded: vi.fn(), reveal: vi.fn() };
  const { result, rerender } = renderHook(({ contentLoaded }) => useStageReveal({ ...options, contentLoaded }),
    { initialProps: { contentLoaded: false } });
  expect(result.current.imageShowReady).toBe(false);
  rerender({ contentLoaded: true });
  expect(result.current.imageShowReady).toBe(true);
  expect(result.current.suppressTransformForSrcSwitch).toBe(true);
  expect(options.reveal).not.toHaveBeenCalled();
});

it('keeps the stage visible when uncovering and restores transform easing afterwards', async () => {
  const image = document.createElement('img');
  Object.defineProperties(image, { complete: { value: true }, naturalWidth: { value: 800 } });
  const options = { visit: { src: 'test:a', index: 0 }, ready: true, contentLoaded: true,
    dims: { naturalWidth: 800, naturalHeight: 600 }, preferFastReveal: false,
    getRevealEl: () => image, onDecoded: vi.fn(), reveal: vi.fn() };
  const { result, rerender, unmount } = renderHook(({ holding, hideUntilReady }) =>
    useStageReveal({ ...options, holding, hideUntilReady }),
  { initialProps: { holding: true, hideUntilReady: true } });
  expect(result.current.imageShowReady).toBe(true);
  expect(result.current.suppressTransformForSrcSwitch).toBe(true);
  expect(options.reveal).not.toHaveBeenCalled();
  rerender({ holding: true, hideUntilReady: false });
  expect(options.reveal).toHaveBeenCalledOnce();
  rerender({ holding: false, hideUntilReady: false });
  expect(result.current.imageShowReady).toBe(true);
  await act(async () => { await vi.advanceTimersByTimeAsync(50); });
  expect(result.current.suppressTransformForSrcSwitch).toBe(false);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it('cancels presentation frames across visits, unmount and StrictMode replay', async () => {
  const options = { ready: true, contentLoaded: false, holding: false, dims: null, preferFastReveal: false,
    getRevealEl: () => null, onDecoded: vi.fn(), reveal: vi.fn(), hideUntilReady: false };
  function Wrapper({ children }: { children: ReactNode }) { return <StrictMode>{children}</StrictMode>; }
  const { result, rerender, unmount } = renderHook(({ visit }) => useStageReveal({ ...options, visit }),
    { initialProps: { visit: { src: 'test:a', index: 0 } }, wrapper: Wrapper });
  await act(async () => { await vi.advanceTimersByTimeAsync(16); });
  rerender({ visit: { src: 'test:b', index: 1 } });
  expect(result.current.imageShowReady).toBe(false);
  await act(async () => { await vi.advanceTimersByTimeAsync(50); });
  expect(result.current.imageShowReady).toBe(true);
  expect(result.current.suppressTransformForSrcSwitch).toBe(false);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});


it.each([false, true])('rechecks unchanged layout after a delayed main load (fast: %s)', (fast) => {
  const image = document.createElement('img');
  let complete = false;
  Object.defineProperties(image, { complete: { get: () => complete },
    naturalWidth: { get: () => complete ? 800 : 0 } });
  const options = { visit: { src: 'test:b', index: 1 }, ready: true, holding: true,
    dims: { naturalWidth: 800, naturalHeight: 600 }, preferFastReveal: fast,
    hideUntilReady: false, getRevealEl: () => image, onDecoded: vi.fn(), reveal: vi.fn() };
  const { rerender } = renderHook(({ contentLoaded }) => useStageReveal({ ...options, contentLoaded }),
    { initialProps: { contentLoaded: false } });
  expect(options.reveal).not.toHaveBeenCalled();
  // The real load changes no layout or progressive flag; only this visit's load signal changes.
  complete = true;
  rerender({ contentLoaded: true });
  expect(options.reveal).toHaveBeenCalledOnce();
  expect(options.onDecoded).toHaveBeenCalledTimes(fast ? 1 : 0);
});

it('a main-load notification preserves the progressive decode gate', () => {
  const image = document.createElement('img');
  Object.defineProperties(image, { complete: { value: true }, naturalWidth: { value: 800 } });
  const options = { visit: { src: 'test:b', index: 1 }, ready: true, holding: true,
    dims: { naturalWidth: 800, naturalHeight: 600 }, preferFastReveal: false,
    getRevealEl: () => image, onDecoded: vi.fn(), reveal: vi.fn() };
  const { rerender } = renderHook(({ contentLoaded, hideUntilReady }) =>
    useStageReveal({ ...options, contentLoaded, hideUntilReady }),
  { initialProps: { contentLoaded: false, hideUntilReady: true } });
  rerender({ contentLoaded: true, hideUntilReady: true });
  expect(options.reveal).not.toHaveBeenCalled();
  rerender({ contentLoaded: true, hideUntilReady: false });
  expect(options.reveal).toHaveBeenCalledOnce();
});
