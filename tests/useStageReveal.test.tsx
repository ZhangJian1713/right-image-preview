import { StrictMode, type ReactNode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useStageReveal } from '../src/components/ImagePreview/stage/useStageReveal';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); });

it('keeps the stage visible when uncovering and restores transform easing afterwards', async () => {
  const image = document.createElement('img');
  Object.defineProperties(image, { complete: { value: true }, naturalWidth: { value: 800 } });
  const options = { visit: { src: 'test:a', index: 0 }, ready: true,
    dims: { naturalWidth: 800, naturalHeight: 600 }, preferFastReveal: false,
    getMainEl: () => image, onDecoded: vi.fn(), reveal: vi.fn() };
  const { result, rerender, unmount } = renderHook(({ holding, hideMainUntilDecoded }) =>
    useStageReveal({ ...options, holding, hideMainUntilDecoded }),
  { initialProps: { holding: true, hideMainUntilDecoded: true } });
  expect(result.current.imageShowReady).toBe(true);
  expect(result.current.suppressTransformForSrcSwitch).toBe(true);
  expect(options.reveal).not.toHaveBeenCalled();
  rerender({ holding: true, hideMainUntilDecoded: false });
  expect(options.reveal).toHaveBeenCalledOnce();
  rerender({ holding: false, hideMainUntilDecoded: false });
  expect(result.current.imageShowReady).toBe(true);
  await act(async () => { await vi.advanceTimersByTimeAsync(50); });
  expect(result.current.suppressTransformForSrcSwitch).toBe(false);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it('cancels presentation frames across visits, unmount and StrictMode replay', async () => {
  const options = { ready: true, holding: false, dims: null, preferFastReveal: false,
    getMainEl: () => null, onDecoded: vi.fn(), reveal: vi.fn(), hideMainUntilDecoded: false };
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
