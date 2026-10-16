import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useNeighborPreload } from '../src/components/ImagePreview/useNeighborPreload';

describe('useNeighborPreload', () => {
  const images = [
    { src: 'https://example.com/0.jpg' },
    { src: 'https://example.com/1.jpg' },
    { src: 'https://example.com/2.jpg' },
    { src: 'https://example.com/3.jpg' },
  ];

  const created: HTMLImageElement[] = [];
  const OriginalImage = globalThis.Image;

  beforeEach(() => {
    created.length = 0;
    globalThis.Image = class extends OriginalImage {
      constructor() {
        super();
        created.push(this);
      }
    } as unknown as typeof Image;
  });

  afterEach(() => {
    globalThis.Image = OriginalImage;
  });

  it('keeps byte loads and the settle deadline when only filmstrip metadata changes', () => {
    vi.useFakeTimers();
    try {
      const { rerender, unmount } = renderHook(({ items }) => useNeighborPreload({
        images: items, currentIndex: 1, radius: 1, settleMs: 600,
      }), { initialProps: { items: images } });
      act(() => { vi.advanceTimersByTime(400); });
      rerender({ items: images.map((item) => ({ ...item, thumbnailSrc: 'cache:first' })) });
      act(() => { vi.advanceTimersByTime(200); });
      expect(created).toHaveLength(2);
      const pending = [...created];
      rerender({ items: images.map((item) => ({ ...item, thumbnailSrc: 'cache:second' })) });
      expect(pending.every((image) => image.onload !== null && image.src !== '')).toBe(true);
      act(() => { vi.advanceTimersByTime(600); });
      expect(created).toHaveLength(2);
      act(() => { pending.forEach((image) => image.onload?.(new Event('load') as never)); });
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });

  it('retries a replaced URL even if the old resource at that index failed', () => {
    vi.useFakeTimers();
    try {
      const { rerender, unmount } = renderHook(({ items }) => useNeighborPreload({
        images: items, currentIndex: 1, radius: 1, settleMs: 600,
      }), { initialProps: { items: images } });
      act(() => { vi.advanceTimersByTime(600); });
      act(() => { created[0].onerror?.(new Event('error') as never); });
      const replacement = images.map((item, index) => index === 0 ? { src: 'https://example.com/new.jpg' } : item);
      rerender({ items: replacement });
      act(() => { vi.advanceTimersByTime(600); });
      expect(created.some((image) => image.src === replacement[0].src)).toBe(true);
      unmount();
    } finally { vi.useRealTimers(); }
  });

  it('reports empty indexes when radius is 0', async () => {
    const onPreloadIndexesChange = vi.fn();
    renderHook(() =>
      useNeighborPreload({
        images,
        currentIndex: 1,
        radius: 0,
        onPreloadIndexesChange,
      }),
    );
    expect(onPreloadIndexesChange).toHaveBeenCalledWith([]);
    expect(created).toHaveLength(0);
  });

  it('reports loading then ready for neighbors in the active window', async () => {
    const onPreloadIndexesChange = vi.fn();
    const onPreloadStatusChange = vi.fn();
    renderHook(() =>
      useNeighborPreload({
        images,
        currentIndex: 1,
        radius: 1,
        onPreloadIndexesChange,
        onPreloadStatusChange,
      }),
    );
    await waitFor(() => {
      expect(onPreloadIndexesChange).toHaveBeenCalledWith([0, 2]);
      expect(created.length).toBeGreaterThanOrEqual(2);
    });

    act(() => {
      for (const img of created) img.onload?.(new Event('load') as never);
    });

    await waitFor(() => {
      const last = onPreloadStatusChange.mock.calls.at(-1)?.[0] as Record<
        number,
        { phase: string; progress?: number }
      >;
      expect(last[0]).toEqual({ phase: 'ready', progress: 1 });
      expect(last[2]).toEqual({ phase: 'ready', progress: 1 });
    });
  });

  it('downgrades ready to warm when leaving the active window', async () => {
    const onPreloadStatusChange = vi.fn();
    const { rerender } = renderHook(
      ({ index }) =>
        useNeighborPreload({
          images,
          currentIndex: index,
          radius: 1,
          onPreloadStatusChange,
        }),
      { initialProps: { index: 1 } },
    );

    await waitFor(() => expect(created.length).toBeGreaterThanOrEqual(2));
    act(() => {
      for (const img of created) img.onload?.(new Event('load') as never);
    });
    await waitFor(() => {
      const last = onPreloadStatusChange.mock.calls.at(-1)?.[0] as Record<
        number,
        { phase: string }
      >;
      expect(last[0]?.phase).toBe('ready');
    });

    // Jump far enough that index 0 leaves radius-1 around current.
    rerender({ index: 3 });

    await waitFor(() => {
      const last = onPreloadStatusChange.mock.calls.at(-1)?.[0] as Record<
        number,
        { phase: string; progress?: number }
      >;
      expect(last[0]).toEqual({ phase: 'warm', progress: 1 });
      // Neighbors of 3: only 2 (radius 1).
      expect(last[2]?.phase === 'ready' || last[2]?.phase === 'loading').toBe(true);
    });
  });

  it('omits the current image from strip status, then warm after leaving', async () => {
    const onPreloadStatusChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ index }) =>
        useNeighborPreload({
          images,
          currentIndex: index,
          radius: 0,
          onPreloadStatusChange,
        }),
      { initialProps: { index: 0 } },
    );

    act(() => result.current.markSrcReady('https://example.com/0.jpg'));
    await waitFor(() => {
      const last = onPreloadStatusChange.mock.calls.at(-1)?.[0] as Record<
        number,
        { phase: string }
      >;
      // Current tile: no preload bar / phase.
      expect(last[0]).toBeUndefined();
    });

    // After navigating away (radius 0 → no ready window), becomes warm.
    rerender({ index: 2 });
    await waitFor(() => {
      const last = onPreloadStatusChange.mock.calls.at(-1)?.[0] as Record<
        number,
        { phase: string }
      >;
      expect(last[0]).toEqual({ phase: 'warm', progress: 1 });
    });
  });
});

describe('failed neighbor scheduling', () => {
  it('does not retry a failed source indefinitely or starve another neighbor', async () => {
    const OriginalImage = globalThis.Image;
    const created: HTMLImageElement[] = [];
    globalThis.Image = class extends OriginalImage {
      constructor() { super(); created.push(this); }
    } as typeof Image;
    try {
      const dataset = [{ src: 'test:bad' }, { src: 'test:current' }, { src: 'test:good' }];
      const { result, unmount } = renderHook(() => useNeighborPreload({
        images: dataset,
        currentIndex: 1, radius: 1, maxConcurrent: 1, settleMs: 0,
      }));
      await waitFor(() => expect(created).toHaveLength(1));
      act(() => created[0].onerror?.(new Event('error') as never));
      expect(created).toHaveLength(2);
      act(() => created[1].onload?.(new Event('load') as never));
      expect(created).toHaveLength(2);
      expect(result.current.status[0].phase).toBe('error');
      expect(result.current.status[2].phase).toBe('ready');
      unmount();
    } finally { globalThis.Image = OriginalImage; }
  });
});
