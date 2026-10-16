import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMainImageDecode } from '../src/components/ImagePreview/stage/useMainImageDecode';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('main decode visit lifetime', () => {
  it('allows only the current visit to finish when returning A → B → A', async () => {
    const image = document.createElement('img');
    image.src = 'test:a';
    Object.defineProperties(image, { complete: { value: true }, naturalWidth: { value: 800 }, naturalHeight: { value: 600 } });
    let decode!: () => void;
    image.decode = vi.fn(() => new Promise<void>((resolve) => { decode = resolve; }));
    const getMainEl = () => image;
    const onImageLoad = vi.fn();
    const onPainted = vi.fn();
    const firstDecoded = vi.fn();
    const latestDecoded = vi.fn();
    const first = { src: 'test:a', index: 0 };
    const options = { getMainEl, onImageLoad, onPainted, preferFastReveal: false };
    const { result, rerender, unmount } = renderHook(({ visit, onDecoded }) =>
      useMainImageDecode({ ...options, visit, onDecoded }),
    { initialProps: { visit: first, onDecoded: firstDecoded } });
    const retainedLoad = result.current;
    rerender({ visit: { src: 'test:b', index: 1 }, onDecoded: vi.fn() });
    rerender({ visit: { src: 'test:a', index: 0 }, onDecoded: latestDecoded });
    const loads = onImageLoad.mock.calls.length;
    act(() => retainedLoad(image));
    expect(onImageLoad).toHaveBeenCalledTimes(loads);
    await act(async () => { decode(); await vi.advanceTimersByTimeAsync(50); });
    expect(firstDecoded).not.toHaveBeenCalled();
    expect(latestDecoded).toHaveBeenCalledOnce();
    unmount();
    act(() => result.current(image));
    expect(onImageLoad).toHaveBeenCalledTimes(loads);
  });
});
