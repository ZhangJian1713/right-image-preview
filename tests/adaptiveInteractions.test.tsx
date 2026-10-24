import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImagePreview } from '../src/components/ImagePreview';
import type { ImagePreviewProps, ImagePreviewRef } from '../src/components/ImagePreview/types';
import { resolveStrings } from '../src/components/ImagePreview/i18n/locale';

const rect = { x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 600,
  width: 800, height: 600, toJSON() {} } as DOMRect;
const images = [{ src: 'test:a', name: 'a.png' }, { src: 'test:b', name: 'b.png' }];
const stops = [10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 600, 800];

beforeEach(() => {
  // jsdom has no compositor; explicitly advance decode/presentation frames instead of
  // racing its interval-backed requestAnimationFrame with React's async act queue.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date', 'performance'] });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect);
  Object.defineProperty(HTMLImageElement.prototype, 'decode', { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

async function open(width = 3200, height = 2400, props: Partial<ImagePreviewProps> = {}) {
  const ref = createRef<ImagePreviewRef>();
  const base = { images, visible: true, progressiveMain: false, preloadRadius: 0,
    stops, ...props } satisfies ImagePreviewProps;
  const view = render(<ImagePreview {...base} ref={ref} />);
  const image = view.container.querySelector('img[src="test:a"]')!;
  Object.defineProperties(image, { naturalWidth: { value: width }, naturalHeight: { value: height },
    complete: { value: true } });
  await act(async () => { fireEvent.load(image); await vi.advanceTimersByTimeAsync(100); });
  expect(ref.current!.getState().fitEquivalentNativePercent).toBeDefined();
  const hit = view.container.querySelector('[data-rip-floor="hit"]') as HTMLDivElement;
  hit.setPointerCapture = vi.fn(); hit.hasPointerCapture = () => false;
  return { ...view, ref, hit, image, base };
}

function pointer(target: Element | Window, type: string, x = 600, y = 300, extra = {}) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0,
    buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: y });
  Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: 'mouse' },
    isPrimary: { value: true } });
  for (const [key, value] of Object.entries(extra)) Object.defineProperty(event, key, { value, configurable: true });
  act(() => { target.dispatchEvent(event); });
}

describe('DOM adaptive interactions', () => {
  it.each([
    [{}, true, false],
    [{ clickZoomEnabled: true }, true, false],
    [{ clickZoomEnabled: true, doubleClickEnabled: false }, true, false],
    [{ doubleClickEnabled: true }, false, true],
    [{ doubleClickEnabled: false }, true, false],
    [{ clickZoomEnabled: false }, false, true],
    [{ clickZoomEnabled: true, doubleClickEnabled: true }, true, false],
    [{ clickZoomEnabled: false, doubleClickEnabled: false }, false, false],
    [{ clickZoomEnabled: false, doubleClickEnabled: true }, false, true],
  ] as const)('resolves single-click and legacy double-click settings %j', async (props, single, double) => {
    const { ref, hit } = await open(3200, 2400, props);
    pointer(hit, 'pointerdown'); pointer(hit, 'pointerup');
    expect(ref.current!.getState().mode).toBe(single ? 'native' : 'fit');
    if (single) {
      expect(ref.current!.getState().nativePercent).toBe(50);
      // A full double-click sequence advances only once while single-click mode owns the gesture.
      pointer(hit, 'pointerdown'); pointer(hit, 'pointerup');
      fireEvent.doubleClick(hit, { clientX: 600, clientY: 300 });
      expect(ref.current!.getState().nativePercent).toBe(50);
    } else {
      fireEvent.doubleClick(hit, { clientX: 600, clientY: 300 });
      expect(ref.current!.getState().mode).toBe(double ? 'native' : 'fit');
      if (double) expect(ref.current!.getState().nativePercent).toBe(100);
      fireEvent.doubleClick(hit, { clientX: 600, clientY: 300 });
      expect(ref.current!.getState().mode).toBe('fit');
    }
  });
  it.each([undefined, 0, -1, NaN, Infinity])('defaults small-image Fit to actual size for cap %s', async (cap) => {
    const { ref, hit } = await open(100, 100, { fitMaxNativePercent: cap, stops: undefined });
    expect(ref.current!.getState().fitEquivalentNativePercent).toBe(100);
    pointer(hit, 'pointerdown', 400, 300); pointer(hit, 'pointerup', 400, 300);
    expect(ref.current!.getState().nativePercent).toBe(200);
    expect(hit.style.cursor).toBe('zoom-out');
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    pointer(hit, 'pointerdown', 400, 300); pointer(hit, 'pointerup', 400, 300);
    expect(ref.current!.getState().mode).toBe('fit');
    expect(hit.style.cursor).toBe('zoom-in');
    act(() => ref.current!.setNative(100));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: ' ' });
    expect(ref.current!.getState().nativePercent).toBe(200);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: ' ' });
    expect(ref.current!.getState().mode).toBe('fit');
    act(() => ref.current!.setNative(150));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: ' ' });
    expect(ref.current!.getState().mode).toBe('fit');
  });
  it('honors a higher explicit Fit cap without zooming down on click', async () => {
    const { ref, hit } = await open(100, 100, { fitMaxNativePercent: 150 });
    expect(ref.current!.getState().fitEquivalentNativePercent).toBe(150);
    pointer(hit, 'pointerdown', 400, 300); pointer(hit, 'pointerup', 400, 300);
    expect(ref.current!.getState().nativePercent).toBe(200);
  });
  it('keeps default Fit and small-image observation within a lower configured ceiling', async () => {
    const { ref } = await open(100, 100, { stops: [10, 25, 50, 75] });
    expect(ref.current!.getState().fitEquivalentNativePercent).toBe(75);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: ' ' });
    expect(ref.current!.getState().nativePercent).toBe(75);
  });
  it('shares three-state Space cycle, ignores repeats and input/control focus', async () => {
    const { ref } = await open();
    const root = screen.getByRole('dialog');
    fireEvent.keyDown(root, { key: ' ' });
    expect(ref.current!.getState().nativePercent).toBe(50);
    fireEvent.keyDown(root, { key: ' ', repeat: true });
    fireEvent.keyDown(root, { key: ' ', ctrlKey: true });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Zoom in' }), { key: ' ' });
    expect(ref.current!.getState().nativePercent).toBe(50);
    fireEvent.keyDown(root, { key: ' ' });
    expect(ref.current!.getState().nativePercent).toBe(100);
    fireEvent.keyDown(root, { key: ' ' });
    expect(ref.current!.getState().mode).toBe('fit');
  });
  it.each([[false, false], [false, true], [true, false], [true, true]])('keeps the last painted frame across skipped selections (controlled: %s, bitmap loaded: %s)', async (controlled, bitmapLoaded) => {
    const items = [...images, { src: 'test:c', name: 'c.png' }];
    const { ref, image, container, rerender, base } = await open(3200, 2400, { images: items, index: controlled ? 0 : undefined });
    const navigate = (index: number) => {
      if (controlled) rerender(<ImagePreview {...base} ref={ref} index={index} />);
      else act(() => { ref.current!.goTo(index); });
    };
    act(() => { ref.current!.setNative(100); ref.current!.rotateCW(); });
    const leavingPose = image.parentElement!.style.transform;
    navigate(1);
    expect(image.closest('[data-rip-stage-layer]')!.getAttribute('data-rip-stage-layer')).toBe('outgoing');
    expect(image.parentElement!.style.transform).toBe(leavingPose);
    // b never reached the visible stage. Even a completed bitmap must not evict the held frame early.
    if (bitmapLoaded) {
      const intermediate = container.querySelector('img[src="test:b"]')!;
      Object.defineProperties(intermediate, { complete: { value: true }, naturalWidth: { value: 1600 }, naturalHeight: { value: 1200 } });
    }
    navigate(2);
    expect(container.querySelector('img[src="test:a"]')).toBe(image);
    expect(image.closest('[data-rip-stage-layer]')!.getAttribute('data-rip-stage-layer')).toBe('outgoing');
    expect(image.parentElement!.style.transform).toBe(leavingPose);
    const incoming = container.querySelector('img[src="test:c"]')!;
    Object.defineProperties(incoming, { complete: { value: true }, naturalWidth: { value: 2000 }, naturalHeight: { value: 1000 } });
    await act(async () => { fireEvent.load(incoming); await vi.advanceTimersByTimeAsync(100); });
    expect(container.querySelector('[data-rip-stage-layer="outgoing"]')).toBeNull();
    expect(incoming.closest('[data-rip-stage-layer]')!.getAttribute('data-rip-stage-layer')).toBe('current');
  });
  it.each([[false, false], [true, false], [false, true], [true, true]])(
    'unblocks a delayed load without a dimension change (controlled: %s, metadata: %s)',
    async (controlled, metadata) => {
      const width = metadata ? 2000 : 3200;
      const height = metadata ? 1000 : 2400;
      const items = [images[0], { ...images[1], ...(metadata ? { exif: { width, height } } : {}) }];
      const { ref, container, rerender, base } = await open(3200, 2400, { images: items, index: controlled ? 0 : undefined });
      if (controlled) rerender(<ImagePreview {...base} ref={ref} index={1} />);
      else act(() => { ref.current!.goTo(1); });
      // Settle the layout before load, so another effect commit cannot mask a missed notification.
      await act(async () => { await vi.advanceTimersByTimeAsync(100); });
      expect(container.querySelector('[data-rip-stage-layer="outgoing"]')).not.toBeNull();
      const incoming = container.querySelector('img[src="test:b"]')!;
      const pose = incoming.parentElement!.style.transform;
      Object.defineProperties(incoming, { complete: { value: true },
        naturalWidth: { value: width }, naturalHeight: { value: height } });
      await act(async () => { fireEvent.load(incoming); await vi.advanceTimersByTimeAsync(100); });
      expect(incoming.parentElement!.style.transform).toBe(pose);
      expect(container.querySelector('[data-rip-stage-layer="outgoing"]')).toBeNull();
      expect(container.querySelector('[data-rip-loader]')!.getAttribute('data-rip-loader')).toBe('off');
    },
  );
  it('returns to a retained cached image without requiring another load event', async () => {
    const { ref, image, container } = await open();
    act(() => { ref.current!.goTo(1); });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    act(() => { ref.current!.goTo(0); });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(container.querySelector('img[src="test:a"]')).toBe(image);
    expect(container.querySelector('[data-rip-stage-layer="outgoing"]')).toBeNull();
    expect(container.querySelector('[data-rip-loader]')!.getAttribute('data-rip-loader')).toBe('off');
  });
  it('preserves the pre-reset pose while a controlled host delays accepting navigation', async () => {
    const { ref, image, rerender, base } = await open(3200, 2400, { index: 0 });
    act(() => { ref.current!.setNative(100); ref.current!.rotateCW(); });
    const pose = image.parentElement!.style.transform;
    act(() => ref.current!.goTo(1));
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    // The host has not accepted index=1 yet; cached A must not clear its navigation snapshot.
    rerender(<ImagePreview {...base} ref={ref} index={1} />);
    expect(image.closest('[data-rip-stage-layer]')!.getAttribute('data-rip-stage-layer')).toBe('outgoing');
    expect(image.parentElement!.style.transform).toBe(pose);
  });
  it('caps small-image Fit independently and cycles to 200 percent', async () => {
    const { ref } = await open(100, 100);
    expect(ref.current!.getState().fitEquivalentNativePercent).toBe(100);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: ' ' });
    expect(ref.current!.getState().nativePercent).toBe(200);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: ' ' });
    expect(ref.current!.getState().mode).toBe('fit');
  });
  it('anchors press at the pointer, then Space at viewport center; one press never pans after zoom', async () => {
    const { ref, hit, image } = await open();
    pointer(hit, 'pointerdown');
    expect(ref.current!.getState().nativePercent).toBe(50);
    const frame = image.parentElement!;
    expect(frame.style.transform).toContain('translate(-200px, 0px)');
    pointer(hit, 'pointermove', 650, 350);
    pointer(window, 'pointerup', 650, 350);
    expect(frame.style.transform).toContain('translate(-200px, 0px)');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: ' ' });
    expect(ref.current!.getState().nativePercent).toBe(100);
    expect(frame.style.transform).toContain('translate(-400px, 0px)');
    expect(frame.style.transition).toBe('none');
  });
  it('starts Native pan only beyond 4px; release and blur never add a zoom step', async () => {
    const { ref, hit } = await open();
    act(() => ref.current!.setNative(100));
    pointer(hit, 'pointerdown', 400, 300);
    pointer(hit, 'pointermove', 402, 301);
    expect(ref.current!.getState().nativePercent).toBe(100);
    pointer(hit, 'pointermove', 420, 300);
    act(() => window.dispatchEvent(new Event('blur')));
    pointer(window, 'pointerup', 420, 300);
    expect(ref.current!.getState().nativePercent).toBe(100);
  });
  it('coalesces double-click and consumes its synthetic click without closing', async () => {
    const onClose = vi.fn();
    const { ref, hit } = await open(3200, 2400, { onClose, closeOnMaskClick: true });
    pointer(hit, 'pointerdown'); pointer(hit, 'pointerup');
    pointer(hit, 'pointerdown'); pointer(hit, 'pointerup');
    fireEvent.doubleClick(hit);
    fireEvent.click(hit);
    expect(ref.current!.getState().nativePercent).toBe(50);
    expect(onClose).not.toHaveBeenCalled();
  });
  it('preserves DOM, transform, active image and lock during language/strings updates', async () => {
    const { ref, image, rerender, base } = await open();
    act(() => { ref.current!.setNative(100); ref.current!.rotateCW(); ref.current!.flipHorizontal(); });
    fireEvent.click(screen.getByRole('button', { name: 'Lock zoom (preserve zoom when switching images)' }));
    const transform = image.parentElement!.style.transform;
    const state = ref.current!.getState();
    for (const language of ['zh-CN', 'zh-TW', 'en']) {
      rerender(<ImagePreview {...base} ref={ref} language={language} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', resolveStrings(language).imagePreview);
      expect(image.parentElement!.style.transform).toBe(transform);
      expect(ref.current!.getState()).toEqual(state);
      expect(document.querySelector('img[src="test:a"]')).toBe(image);
      expect(screen.getByRole('button', { name: resolveStrings(language).unlockZoom })).toBeTruthy();
    }
  });
  it('allows wheel-out directly from Fit and respects the configured maximum', async () => {
    const { ref } = await open();
    const root = screen.getByRole('dialog');
    expect(screen.getByRole('button', { name: 'Zoom out' })).not.toBeDisabled();
    fireEvent.wheel(root, { deltaY: 1, deltaMode: 1, clientX: 400, clientY: 300 });
    expect(ref.current!.getState().nativePercent).toBe(10);
    act(() => ref.current!.setNative(800));
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
    fireEvent.wheel(root, { deltaY: -1, deltaMode: 1, clientX: 400, clientY: 300 });
    expect(ref.current!.getState().nativePercent).toBe(800);
  });
  it('keeps observation zoom free of transient status overlays', async () => {
    const { ref, base, rerender } = await open();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: ' ' });
    expect(ref.current!.getState().nativePercent).toBe(50);
    expect(screen.queryByRole('status')).toBeNull();
    rerender(<ImagePreview {...base} ref={ref} clickZoomEnabled={false} />);
    expect(screen.queryByRole('status')).toBeNull();
    rerender(<ImagePreview {...base} ref={ref} clickZoomEnabled />);
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('preserves the legacy Space behavior when adaptive interaction is disabled', async () => {
    const { ref } = await open(3200, 2400, { clickZoomEnabled: false });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: ' ' });
    expect(ref.current!.getState().nativePercent).toBe(100);
  });
});

describe('DOM hit and error boundaries', () => {
  it('closes on genuine background click instead of starting an adaptive zoom', async () => {
    const onClose = vi.fn();
    const { hit, ref } = await open(100, 100, { onClose, closeOnMaskClick: true });
    pointer(hit, 'pointerdown', 10, 10); pointer(hit, 'pointerup', 10, 10);
    fireEvent.click(hit, { clientX: 10, clientY: 10 });
    expect(ref.current!.getState().mode).toBe('fit');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('reports an image failure and clears the error on controlled navigation', async () => {
    const onImageError = vi.fn();
    const { image, ref, rerender, base } = await open(3200, 2400, { index: 0,
      onImageError, errorFallback: () => <div role="alert">Unable to load</div> });
    fireEvent.error(image);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(onImageError).toHaveBeenCalledWith(0, 'test:a');
    rerender(<ImagePreview {...base} ref={ref} index={1} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
