import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImagePreview } from '../src/components/ImagePreview';
import type { ImagePreviewProps, ImagePreviewRef } from '../src/components/ImagePreview';
import { resolveZoomStops } from '../src/components/ImagePreview/transform/zoomStops';

const stops = [10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 600, 800];
const smallImageZoom = { maxEdge: 64, maxNativePercent: 1600 };
const rect = { left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0 } as DOMRect;
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect);
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

function open(props: Partial<ImagePreviewProps> = {}) {
  const ref = createRef<ImagePreviewRef>();
  const base = { images: [{ src: 'test:small.svg' }, { src: 'test:large.png' }], visible: true,
    preloadRadius: 0, progressiveMain: false, stops, smallImageZoom, fitMaxNativePercent: 100, ...props };
  const view = render(<ImagePreview {...base} ref={ref} />);
  return { ...view, ref, base };
}
async function load(image: HTMLImageElement, width: number, height = width) {
  Object.defineProperties(image, { naturalWidth: { value: width, configurable: true },
    naturalHeight: { value: height, configurable: true }, complete: { value: true } });
  image.decode = vi.fn().mockResolvedValue(undefined);
  await act(async () => { fireEvent.load(image); await vi.advanceTimersByTimeAsync(60); });
}
function pointer(element: Element, type: string, id: number, x: number) {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: 300 });
  Object.defineProperties(event, { pointerId: { value: id }, pointerType: { value: 'touch' } });
  fireEvent(element, event);
}

describe('finite per-image zoom policy', () => {
  it.each([[16, 16, 1600], [64, 64, 1600], [65, 16, 800], [16, 65, 800], [0, 16, 800], [NaN, 16, 800]])(
    'resolves %s × %s originals to %s without intermediate presets', (naturalWidth, naturalHeight, maximum) => {
      const ladder = resolveZoomStops(stops, smallImageZoom, { naturalWidth, naturalHeight });
      expect(ladder.at(-1)).toBe(maximum);
      expect(ladder).not.toContain(1000);
      expect(ladder).not.toContain(1200);
    });
  it('keeps the ordinary ladder for unknown dimensions and invalid options', () => {
    expect(resolveZoomStops(stops, smallImageZoom)).toEqual(stops);
    expect(resolveZoomStops(stops, { maxEdge: Infinity, maxNativePercent: 1600 },
      { naturalWidth: 16, naturalHeight: 16 })).toEqual(stops);
    expect(resolveZoomStops([NaN, -1, 100, 100])).toEqual([100]);
  });
  it.each([[16, 1600], [64, 1600], [65, 800]])('shares one cap for %spx images across ref, wheel, toolbar and input', async (edge, maximum) => {
    const { ref, container } = open();
    await load(container.querySelector('img[src="test:small.svg"]')!, edge);
    act(() => ref.current!.setNative(800));
    fireEvent.wheel(screen.getByRole('dialog'), { deltaY: -1, deltaMode: 1, clientX: 400, clientY: 300 });
    expect(ref.current!.getState().nativePercent).toBe(maximum);
    expect((screen.getByRole('button', { name: 'Zoom in' }) as HTMLButtonElement).disabled).toBe(true);
    act(() => ref.current!.setNative(9000));
    expect(ref.current!.getState().nativePercent).toBe(maximum);
    fireEvent.click(screen.getByRole('button', { name: `${maximum}%` }));
    expect(screen.queryByRole('button', { name: '1000%' })).toBeNull();
    expect(screen.queryByRole('button', { name: '1200%' })).toBeNull();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '9999' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(ref.current!.getState().nativePercent).toBe(maximum);
    // One step down from the only extra small-image stop goes directly back to 800.
    if (maximum === 1600) {
      fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
      expect(ref.current!.getState().nativePercent).toBe(800);
    }
  });
  it.each([[16, 1600], [65, 800]])('caps repeated pinch sessions at %s px, without multiplying the ceiling', async (edge, maximum) => {
    const { ref, container } = open();
    await load(container.querySelector('img[src="test:small.svg"]')!, edge);
    const root = screen.getByRole('dialog');
    act(() => ref.current!.setNative(800));
    for (let session = 0; session < 3; session++) {
      pointer(root, 'pointerdown', 1, 350); pointer(root, 'pointerdown', 2, 450);
      pointer(root, 'pointermove', 2, 2000);
      pointer(root, 'pointerup', 1, 350); pointer(root, 'pointerup', 2, 2000);
      expect(ref.current!.getState().nativePercent).toBe(maximum);
    }
  });
  it('uses current original dimensions and clamps locked zoom before a large image loads', async () => {
    const { ref, container } = open({ initialZoomLocked: true });
    await load(container.querySelector('img[src="test:small.svg"]')!, 16);
    act(() => ref.current!.setNative(1600));
    act(() => ref.current!.next());
    expect(ref.current!.getState().nativePercent).toBe(800);
    act(() => ref.current!.setNative(1600));
    expect(ref.current!.getState().nativePercent).toBe(800);
    await load(container.querySelector('img[src="test:large.png"]')!, 1024);
    act(() => ref.current!.prev());
    expect(ref.current!.getState().nativePercent).toBe(800);
    // Without neighbor retention, returning to A must wait for A's original to load again.
    await load(container.querySelector('img[src="test:small.svg"]')!, 16);
    expect(ref.current!.getState().nativePercent).toBe(800);
    act(() => ref.current!.setNative(1600));
    expect(ref.current!.getState().nativePercent).toBe(1600);
  });
  it('cancels a held pinch when navigation changes the original', async () => {
    const { ref, container } = open();
    await load(container.querySelector('img[src="test:small.svg"]')!, 16);
    const dialog = screen.getByRole('dialog');
    pointer(dialog, 'pointerdown', 1, 350); pointer(dialog, 'pointerdown', 2, 450);
    act(() => ref.current!.next());
    expect(ref.current!.getState().mode).toBe('fit');
    pointer(dialog, 'pointermove', 2, 2000);
    expect(ref.current!.getState().mode).toBe('fit');
  });
  it('does not classify an EXIF or thumbnail layout as a small original', () => {
    const { ref } = open({ images: [{ src: 'test:main', minimapSrc: 'test:tiny-thumb', exif: { width: 16, height: 16 } }] });
    act(() => ref.current!.setNative(1600));
    expect(ref.current!.getState().nativePercent).toBe(800);
  });
});
