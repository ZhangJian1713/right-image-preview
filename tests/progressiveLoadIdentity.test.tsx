import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ImagePreview } from '../src/components/ImagePreview';
import type { ImagePreviewRef, MainImageLoadStage } from '../src/components/ImagePreview/types';

// Image() probes are separate from the real DOM <img> elements rendered by ImagePreview.
class ImageProbe {
  static instances: ImageProbe[] = [];
  src = '';
  naturalWidth = 0;
  naturalHeight = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() { ImageProbe.instances.push(this); }
  load(width: number, height: number) {
    this.naturalWidth = width;
    this.naturalHeight = height;
    this.onload?.();
  }
}

const images = ['a', 'b', 'c'].map((id) => ({ src: `test:main-${id}`,
  minimapSrc: `test:mini-${id}`, thumbnailSrc: `test:strip-${id}`,
  exif: { width: 3200, height: 2400 } }));
const tick = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(100); }); };
const probe = (src: string) => {
  const image = ImageProbe.instances.findLast((entry) => entry.src === src);
  expect(image).toBeDefined();
  return image!;
};

beforeEach(() => {
  ImageProbe.instances = [];
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date', 'performance'] });
  vi.stubGlobal('Image', ImageProbe);
  vi.stubGlobal('createImageBitmap', undefined);
});
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function open() {
  const ref = createRef<ImagePreviewRef>();
  const stage = vi.fn<(value: MainImageLoadStage) => void>();
  const error = vi.fn();
  const view = render(<ImagePreview ref={ref} images={images} visible progressiveMain
    progressivePlaceholderMinMs={0} preloadRadius={0} preloadDisplaySlots={0}
    showThumbnails onMainImageLoadStageChange={stage} onImageError={error} />);
  const layer = () => view.container.querySelector('[data-rip-stage-layer="current"]')!;
  const main = () => layer().querySelector<HTMLImageElement>('img[src^="test:main-"]')!;
  const mini = () => layer().querySelector<HTMLImageElement>('img[src^="test:mini-"]')!;
  const held = () => view.container.querySelector('[data-rip-stage-layer="outgoing"] img');
  const loader = () => view.container.querySelector('[data-rip-loader]')!.getAttribute('data-rip-loader');
  return { ...view, ref, stage, error, layer, main, mini, held, loader };
}
type Viewer = ReturnType<typeof open>;

function domLoad(image: HTMLImageElement, width: number, height: number, decode = vi.fn().mockResolvedValue(undefined)) {
  expect(image).not.toBeNull();
  Object.defineProperties(image, { complete: { value: true, configurable: true },
    naturalWidth: { value: width, configurable: true }, naturalHeight: { value: height, configurable: true } });
  image.decode = decode;
  fireEvent.load(image);
}
async function readyFirst(view: Viewer) {
  act(() => { probe(images[0].minimapSrc).load(200, 150); probe(images[0].src).load(3200, 2400); });
  act(() => { domLoad(view.main(), 3200, 2400); });
  await tick();
  expect(view.loader()).toBe('off');
  expect(view.stage).toHaveBeenLastCalledWith('full-ready');
  view.stage.mockClear();
}
function deferredDecode() {
  let finish!: () => void;
  const decode = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  return { decode, finish: () => finish() };
}

it.each([false, true])('thumbnail loads cannot complete the original (navigating: %s)', async (navigating) => {
  const view = open();
  if (navigating) {
    await readyFirst(view);
    act(() => { view.ref.current!.goTo(1); });
  }
  const index = navigating ? 1 : 0;
  const original = view.main();
  const decode = deferredDecode();
  original.decode = decode.decode;
  act(() => { probe(images[index].minimapSrc).load(200, 150); });
  const underlay = view.mini();
  expect(view.container.querySelector(`img[src="${images[index].thumbnailSrc}"]`)).not.toBeNull();
  act(() => {
    domLoad(underlay, 200, 150);
    // Both the filmstrip and navigation minimap can reuse thumbnail URLs.
    for (const thumbnail of view.container.querySelectorAll<HTMLImageElement>(`img[src="${images[index].thumbnailSrc}"], img[src="${images[index].minimapSrc}"]`)) {
      if (thumbnail !== underlay) domLoad(thumbnail, 200, 150);
    }
  });
  await tick();
  expect(decode.decode).not.toHaveBeenCalled();
  expect(view.stage).not.toHaveBeenCalledWith('full-ready');
  expect(view.loader()).toBe('on');
  if (navigating) expect(view.held()!.getAttribute('src')).toBe(images[0].src);
  else expect(underlay.style.opacity).toBe('1');

  // Even an off-DOM probe of the *original* is not the viewport original's load/decode.
  act(() => { probe(images[index].src).load(3200, 2400); });
  await tick();
  expect(decode.decode).not.toHaveBeenCalled();
  expect(view.loader()).toBe('on');
  act(() => { domLoad(original, 3200, 2400, decode.decode); });
  await tick();
  expect(decode.decode).toHaveBeenCalled();
  expect(view.stage).not.toHaveBeenCalledWith('full-ready');
  expect(view.loader()).toBe('on');
  if (navigating) expect(view.held()).not.toBeNull();

  await act(async () => { decode.finish(); await vi.advanceTimersByTimeAsync(100); });
  expect(view.stage.mock.calls.filter(([value]) => value === 'full-ready')).toHaveLength(1);
  expect(view.held()).toBeNull();
  expect(view.loader()).toBe('off');
  expect(view.mini().style.opacity).toBe('0');
});

it('a late thumbnail cannot cover or resize an already-ready original', async () => {
  const view = open();
  act(() => { probe(images[0].src).load(3200, 2400); });
  act(() => { domLoad(view.main(), 3200, 2400); });
  await tick();
  expect(view.loader()).toBe('off');
  const state = view.ref.current!.getState();
  const pose = view.main().parentElement!.style.transform;
  act(() => { probe(images[0].minimapSrc).load(200, 150); });
  act(() => { domLoad(view.mini(), 200, 150); });
  await tick();
  expect(view.ref.current!.getState()).toEqual(state);
  expect(view.main().parentElement!.style.transform).toBe(pose);
  expect(view.mini().style.opacity).toBe('0');
  expect(view.loader()).toBe('off');
  expect(view.stage.mock.calls.filter(([value]) => value === 'full-ready')).toHaveLength(1);
});

it('late thumbnail probes and original decode from a departed selection cannot reveal the current image', async () => {
  const view = open();
  await readyFirst(view);
  act(() => { view.ref.current!.goTo(1); });
  const oldMain = probe(images[1].src);
  const oldMini = probe(images[1].minimapSrc);
  const decode = deferredDecode();
  act(() => { domLoad(view.main(), 3200, 2400, decode.decode); });
  expect(decode.decode).toHaveBeenCalled();
  act(() => { view.ref.current!.goTo(2); });
  const pending = view.main();
  view.stage.mockClear();
  await act(async () => {
    oldMain.load(3200, 2400);
    oldMini.load(200, 150);
    decode.finish();
    await vi.advanceTimersByTimeAsync(100);
  });
  expect(view.main().getAttribute('src')).toBe(images[2].src);
  expect(view.main()).toBe(pending);
  expect(view.stage).not.toHaveBeenCalledWith('full-ready');
  expect(view.held()!.getAttribute('src')).toBe(images[0].src);
  expect(view.loader()).toBe('on');
  act(() => { probe(images[2].minimapSrc).load(200, 150); });
  act(() => { domLoad(view.mini(), 200, 150); });
  await tick();
  expect(view.held()).not.toBeNull();
  act(() => { probe(images[2].src).load(3200, 2400); domLoad(pending, 3200, 2400); });
  await tick();
  expect(view.stage).toHaveBeenLastCalledWith('full-ready');
  expect(view.held()).toBeNull();
  expect(view.loader()).toBe('off');
});

it('an original failure reports thumbnail-only fallback, never original readiness', async () => {
  const view = open();
  act(() => { probe(images[0].minimapSrc).load(200, 150); });
  act(() => { domLoad(view.mini(), 200, 150); });
  act(() => { fireEvent.error(view.main()); probe(images[0].src).onerror?.(); });
  act(() => { probe(images[0].minimapSrc).load(200, 150); });
  await tick();
  expect(view.error).toHaveBeenCalledWith(0, images[0].src);
  expect(view.stage).toHaveBeenLastCalledWith('thumb-only');
  expect(view.stage).not.toHaveBeenCalledWith('full-ready');
});

it('bitmap confirmation receives only the viewport original, never its thumbnail or probe', async () => {
  const view = open();
  await readyFirst(view);
  act(() => { view.ref.current!.goTo(1); });
  const original = view.main();
  let finishBitmap!: (bitmap: { close(): void }) => void;
  const bitmap = vi.fn(() => new Promise<{ close(): void }>((resolve) => { finishBitmap = resolve; }));
  vi.stubGlobal('createImageBitmap', bitmap);
  act(() => { probe(images[1].minimapSrc).load(200, 150); });
  act(() => { domLoad(view.mini(), 200, 150); probe(images[1].src).load(3200, 2400); });
  await tick();
  expect(bitmap).not.toHaveBeenCalled();
  const originalDecode = vi.fn().mockResolvedValue(undefined);
  act(() => { domLoad(original, 3200, 2400, originalDecode); });
  await tick();
  expect(bitmap).toHaveBeenCalledExactlyOnceWith(original);
  expect(originalDecode).not.toHaveBeenCalled();
  expect(view.held()).not.toBeNull();
  expect(view.loader()).toBe('on');
  const close = vi.fn();
  await act(async () => { finishBitmap({ close }); await vi.advanceTimersByTimeAsync(100); });
  expect(close).toHaveBeenCalledOnce();
  expect(view.held()).toBeNull();
  expect(view.loader()).toBe('off');
  expect(view.stage).toHaveBeenLastCalledWith('full-ready');
});
