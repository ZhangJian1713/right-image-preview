import { StrictMode, createElement, useLayoutEffect } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProgressiveMainImage } from '../src/components/ImagePreview/stage/useProgressiveMainImage';
import type { UseProgressiveMainImageResult } from '../src/components/ImagePreview/stage/useProgressiveMainImage';

class MockImage {
  static instances: MockImage[] = [];
  static onSource: ((image: MockImage) => void) | undefined;
  onload: ((this: GlobalEventHandlers, ev: Event) => unknown) | null = null;
  onerror: ((this: GlobalEventHandlers, ev: Event) => unknown) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;
  private _src = '';

  constructor() {
    MockImage.instances.push(this);
  }

  get src() {
    return this._src;
  }

  set src(v: string) {
    this._src = v;
    MockImage.onSource?.(this);
  }

  removeAttribute(name: string) { if (name === 'src') this._src = ''; }

  completeLoad(w = 100, h = 80) {
    this.naturalWidth = w;
    this.naturalHeight = h;
    this.onload?.call(this as unknown as GlobalEventHandlers, new Event('load'));
  }
}

describe('useProgressiveMainImage', () => {
  const OriginalImage = globalThis.Image;

  beforeEach(() => {
    MockImage.instances = [];
    MockImage.onSource = undefined;
    // @ts-expect-error test mock
    globalThis.Image = MockImage;
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    globalThis.Image = OriginalImage;
    vi.useRealTimers();
  });

  it('ignores a decode callback from an earlier selection with the same URL', () => {
    const onStageChange = vi.fn();
    const onImageLayout = vi.fn();
    const { result, rerender } = renderHook(({ selection }) => useProgressiveMainImage({
      mainSrc: 'test:a', minimapSrc: undefined, minimapCustom: false, enabled: false,
      placeholderMinVisibleMs: 0, selection, onImageLayout, onStageChange,
    }), { initialProps: { selection: {} } });
    const oldDecoded = result.current.onMainImgDecoded;
    rerender({ selection: {} });
    act(() => oldDecoded());
    expect(result.current.fullDecoded).toBe(false);
    expect(onStageChange).not.toHaveBeenCalled();
    act(() => result.current.onMainImgDecoded());
    expect(result.current.fullDecoded).toBe(true);
    expect(onStageChange).toHaveBeenCalledOnce();
  });

  it('enters thumb-only without claiming the original decoded after its probe fails', () => {
    const { result } = renderHook(() => useProgressiveMainImage({
      mainSrc: 'test:full', minimapSrc: 'test:thumb', minimapCustom: false,
      enabled: true, placeholderMinVisibleMs: 0, onImageLayout: vi.fn(),
    }));
    const full = MockImage.instances.find((image) => image.src === 'test:full')!;
    act(() => { full.onerror?.call(full as unknown as GlobalEventHandlers, new Event('error')); });
    const fallback = MockImage.instances.filter((image) => image.src === 'test:thumb').at(-1)!;
    act(() => fallback.completeLoad(200, 150));
    expect(result.current.preloadStage).toBe('thumb-only');
    expect(result.current.fullDecoded).toBe(false);
    expect(result.current.showMinimapUnderlay).toBe(true);
  });

  it.each(['load', 'error', 'timeout'])('DOM-first completion cannot be reversed by a late probe %s', async (late) => {
    const onImageLayout = vi.fn();
    const onStageChange = vi.fn();
    const { result } = renderHook(() => useProgressiveMainImage({
      mainSrc: 'test:full', minimapSrc: 'test:thumb', minimapCustom: false,
      enabled: true, placeholderMinVisibleMs: 0, onImageLayout, onStageChange,
    }));
    const full = MockImage.instances.find((image) => image.src === 'test:full')!;
    const thumb = MockImage.instances.find((image) => image.src === 'test:thumb')!;
    const lateLoad = full.onload;
    const lateError = full.onerror;
    act(() => thumb.completeLoad(200, 150));
    act(() => result.current.onMainImgDecoded());
    expect(result.current.fullDecoded).toBe(true);
    expect(full.onload).toBeNull();
    expect(full.onerror).toBeNull();
    expect(full.src).toBe('');
    expect(vi.getTimerCount()).toBe(0);
    onImageLayout.mockClear();
    await act(async () => {
      if (late === 'load') lateLoad?.call(full as unknown as GlobalEventHandlers, new Event('load'));
      if (late === 'error') lateError?.call(full as unknown as GlobalEventHandlers, new Event('error'));
      await vi.advanceTimersByTimeAsync(180001);
      thumb.completeLoad(200, 150);
    });
    expect(result.current.fullDecoded).toBe(true);
    expect(onStageChange).toHaveBeenLastCalledWith('full-ready');
    expect(onStageChange).not.toHaveBeenCalledWith('thumb-only');
    expect(onImageLayout).not.toHaveBeenCalled();
  });

  it('DOM decode can finish before either probe provides layout', () => {
    const onStageChange = vi.fn();
    const { result } = renderHook(() => useProgressiveMainImage({
      mainSrc: 'test:full', minimapSrc: 'test:thumb', minimapCustom: false,
      enabled: true, placeholderMinVisibleMs: 0, onImageLayout: vi.fn(), onStageChange,
    }));
    act(() => result.current.onMainImgDecoded());
    expect(result.current.fullDecoded).toBe(true);
    expect(onStageChange).toHaveBeenLastCalledWith('full-ready');
  });

  it('releases only owned probes on selection changes, unmount and StrictMode replay', () => {
    const { rerender, unmount } = renderHook(({ selection }) => useProgressiveMainImage({
      mainSrc: 'test:full', minimapSrc: 'test:thumb', minimapCustom: false,
      enabled: true, placeholderMinVisibleMs: 300, onImageLayout: vi.fn(), selection,
    }), { initialProps: { selection: {} }, wrapper: ({ children }) => createElement(StrictMode, null, children) });
    const old = [...MockImage.instances];
    rerender({ selection: {} });
    for (const image of old) {
      expect(image.onload).toBeNull(); expect(image.onerror).toBeNull(); expect(image.src).toBe('');
    }
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    for (const image of MockImage.instances) {
      expect(image.onload).toBeNull(); expect(image.onerror).toBeNull(); expect(image.src).toBe('');
    }
  });

  it('does not leave a deadline when an original probe loads synchronously from cache', () => {
    MockImage.onSource = (image) => { if (image.src === 'test:full') image.completeLoad(800, 600); };
    const { result, unmount } = renderHook(() => useProgressiveMainImage({
      mainSrc: 'test:full', minimapSrc: 'test:thumb', minimapCustom: false,
      enabled: true, placeholderMinVisibleMs: 0, onImageLayout: vi.fn(),
    }));
    expect(result.current.preloadStage).toBe('thumbnail-placeholder');
    expect(vi.getTimerCount()).toBe(0);
    unmount();
  });

  it('ignores queued thumbnail load after that probe has failed', () => {
    const onImageLayout = vi.fn();
    const { result } = renderHook(() => useProgressiveMainImage({
      mainSrc: 'test:full', minimapSrc: 'test:thumb', minimapCustom: false,
      enabled: true, placeholderMinVisibleMs: 0, onImageLayout,
    }));
    const full = MockImage.instances.find((image) => image.src === 'test:full')!;
    const thumb = MockImage.instances.find((image) => image.src === 'test:thumb')!;
    const queued = thumb.onload!;
    act(() => { thumb.onerror?.call(thumb as unknown as GlobalEventHandlers, new Event('error')); });
    act(() => { full.onerror?.call(full as unknown as GlobalEventHandlers, new Event('error')); });
    expect(result.current.preloadStage).toBe('error');
    act(() => { queued.call(thumb as unknown as GlobalEventHandlers, new Event('load')); });
    expect(result.current.preloadStage).toBe('error');
    expect(onImageLayout).not.toHaveBeenCalled();
  });

  it('cached DOM decode before passive effects preserves dwell through StrictMode replay', async () => {
    const onStageChange = vi.fn();
    const { result, unmount } = renderHook(() => {
      const api = useProgressiveMainImage({
        mainSrc: 'test:full', minimapSrc: 'test:thumb', minimapCustom: false,
        enabled: true, placeholderMinVisibleMs: 300, onImageLayout: vi.fn(), onStageChange,
      });
      const { onMainImgDecoded } = api;
      useLayoutEffect(() => onMainImgDecoded(), [onMainImgDecoded]);
      return api;
    }, { wrapper: ({ children }) => createElement(StrictMode, null, children) });
    expect(result.current.fullDecoded).toBe(false);
    expect(MockImage.instances).toHaveLength(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(301); });
    expect(result.current.fullDecoded).toBe(true);
    expect(onStageChange.mock.calls.filter(([stage]) => stage === 'full-ready')).toHaveLength(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('fast-reveal with known dims skips main Image probe and reveals without waiting on it', async () => {
    const onImageLayout = vi.fn();
    const { result } = renderHook(() =>
      useProgressiveMainImage({
        mainSrc: 'https://example.com/full.jpg',
        minimapSrc: 'https://example.com/mini.jpg',
        minimapCustom: false,
        enabled: true,
        placeholderMinVisibleMs: 400,
        preferFastReveal: true,
        knownDimensions: { naturalWidth: 6000, naturalHeight: 4000 },
        onImageLayout,
      }),
    );

    expect(result.current.pipelineActive).toBe(true);
    expect(result.current.fullDecoded).toBe(false);
    expect(result.current.showMinimapUnderlay).toBe(true);
    expect(onImageLayout).toHaveBeenCalledWith({
      naturalWidth: 6000,
      naturalHeight: 4000,
    });

    // Minimap underlay may still preload; full-size probe must not (avoids ~1s re-decode).
    const mini = MockImage.instances.find((i) => i.src.includes('mini'));
    expect(mini).toBeTruthy();
    expect(MockImage.instances.find((i) => i.src.includes('full'))).toBeUndefined();

    await act(async () => {
      mini!.completeLoad(240, 160);
    });
    expect(result.current.showMinimapUnderlay).toBe(true);
    expect(result.current.fullDecoded).toBe(false);

    await act(async () => {
      result.current.onMainImgDecoded();
      await vi.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(result.current.fullDecoded).toBe(true);
    });
  });

  it('drains pending when known dims enter placeholder (layout microtask race)', async () => {
    let api!: UseProgressiveMainImageResult;
    const { result, rerender } = renderHook(
      ({ mainSrc, minimapSrc }) => {
        api = useProgressiveMainImage({
          mainSrc,
          minimapSrc,
          minimapCustom: false,
          enabled: true,
          placeholderMinVisibleMs: 0,
          preferFastReveal: true,
          knownDimensions: { naturalWidth: 6000, naturalHeight: 4000 },
          onImageLayout: vi.fn(),
          onStageChange: (stage) => {
            // Simulate viewport decode microtask while stage is still `preloading`.
            if (stage === 'preloading') api.onMainImgDecoded();
          },
        });
        return api;
      },
      {
        initialProps: {
          mainSrc: 'https://example.com/a.jpg',
          minimapSrc: 'https://example.com/a-mini.jpg',
        },
      },
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.fullDecoded).toBe(true);

    MockImage.instances = [];
    await act(async () => {
      rerender({
        mainSrc: 'https://example.com/b.jpg',
        minimapSrc: 'https://example.com/b-mini.jpg',
      });
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Must not be stuck waiting for a skipped / never-fired main probe.
    expect(result.current.fullDecoded).toBe(true);
    expect(MockImage.instances.find((i) => i.src.includes('b.jpg'))).toBeUndefined();
  });

  it('reveals after src switch even if previous revealCompleted was true (cached neighbor)', async () => {
    const onImageLayout = vi.fn();
    const { result, rerender } = renderHook(
      ({ mainSrc, minimapSrc }) =>
        useProgressiveMainImage({
          mainSrc,
          minimapSrc,
          minimapCustom: false,
          enabled: true,
          placeholderMinVisibleMs: 0,
          preferFastReveal: true,
          knownDimensions: { naturalWidth: 6000, naturalHeight: 4000 },
          onImageLayout,
        }),
      {
        initialProps: {
          mainSrc: 'https://example.com/a.jpg',
          minimapSrc: 'https://example.com/a-mini.jpg',
        },
      },
    );

    const miniA = MockImage.instances.find((i) => i.src.includes('a-mini'));
    await act(async () => {
      miniA!.completeLoad(240, 160);
      result.current.onMainImgDecoded();
      await vi.runAllTimersAsync();
    });
    expect(result.current.fullDecoded).toBe(true);

    MockImage.instances = [];
    await act(async () => {
      rerender({
        mainSrc: 'https://example.com/b.jpg',
        minimapSrc: 'https://example.com/b-mini.jpg',
      });
    });

    expect(result.current.fullDecoded).toBe(false);

    await act(async () => {
      result.current.onMainImgDecoded();
      await vi.runAllTimersAsync();
    });
    expect(result.current.fullDecoded).toBe(true);
  });

  it('applies placeholder dwell when not preferFastReveal', async () => {
    const { result } = renderHook(() =>
      useProgressiveMainImage({
        mainSrc: 'https://example.com/full.jpg',
        minimapSrc: 'https://example.com/mini.jpg',
        minimapCustom: false,
        enabled: true,
        placeholderMinVisibleMs: 300,
        preferFastReveal: false,
        onImageLayout: vi.fn(),
      }),
    );

    const mini = MockImage.instances.find((i) => i.src.includes('mini'));
    const full = MockImage.instances.find((i) => i.src.includes('full'));
    await act(async () => {
      mini!.completeLoad(240, 160);
      full!.completeLoad(6000, 4000);
    });

    await act(async () => {
      result.current.onMainImgDecoded();
    });
    expect(result.current.fullDecoded).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });
    expect(result.current.fullDecoded).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2);
    });
    expect(result.current.fullDecoded).toBe(true);
  });
});


it('cached ref decode notifications settle without committing repeatedly', () => {
  let commits = 0;
  const onStageChange = vi.fn();
  const { result, rerender, unmount } = renderHook(({ mainSrc }) => {
    const api = useProgressiveMainImage({ mainSrc, minimapSrc: undefined,
      minimapCustom: false, enabled: false, placeholderMinVisibleMs: 0,
      onImageLayout: vi.fn(), onStageChange });
    useLayoutEffect(() => { commits++; });
    return api;
  }, { initialProps: { mainSrc: 'test:first' } });
  act(() => result.current.onMainImgDecoded());
  expect(result.current.fullDecoded).toBe(true);
  const settledCommits = commits;
  const departedDecode = result.current.onMainImgDecoded;
  for (let i = 0; i < 8; i++) act(() => result.current.onMainImgDecoded());
  expect(commits).toBe(settledCommits);
  expect(onStageChange).toHaveBeenCalledTimes(1);
  rerender({ mainSrc: 'test:second' });
  expect(result.current.fullDecoded).toBe(false);
  act(() => departedDecode());
  expect(result.current.fullDecoded).toBe(false);
  expect(onStageChange).toHaveBeenCalledTimes(1);
  unmount();
});
