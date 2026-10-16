import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ImagePreview } from '../src/components/ImagePreview';

// Presentation timing is tested separately; every visited frame is ready in these input-lifecycle tests.
vi.mock('../src/components/ImagePreview/useHoldStagePresented', () => ({ useHoldStagePresented: () => true }));

const images = Array.from({ length: 5 }, (_, index) => ({ id: String(index), src: `test:nav-${index}`, thumbnailSrc: null }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date', 'performance'] });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, toJSON() {} });
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(1600);
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(1200);
  Object.defineProperty(HTMLImageElement.prototype, 'decode', { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });
const tick = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
function pointer(target: Element | Window, type: string, pointerId = 7, button = 0, buttons = type === 'pointerdown' ? 1 : 0) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button, buttons });
  Object.defineProperties(event, { pointerId: { value: pointerId }, isPrimary: { value: true } });
  act(() => { target.dispatchEvent(event); });
}
async function open(index: number) {
  const changed = vi.fn();
  render(<ImagePreview visible images={images} defaultIndex={index} showThumbnails arrows="side"
    progressiveMain={false} preloadRadius={0} preloadDisplaySlots={0} holdMinVisibleMs={300} onIndexChange={changed} />);
  await tick(100);
  return changed;
}

it('a plain thumbnail click selects one image and never starts continuous navigation', async () => {
  const changed = await open(0);
  fireEvent.click(screen.getByRole('button', { name: 'Image 3 of 5' }));
  await tick(2000);
  expect(changed.mock.calls.map(([index]) => index)).toEqual([2]);
});

it('release after the last-image arrow disappears must not resume next-hold when a thumbnail is clicked', async () => {
  const changed = await open(3);
  const next = screen.getByRole('button', { name: 'Next' });
  pointer(next, 'pointerdown');
  expect(changed).toHaveBeenLastCalledWith(4);
  expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  // The pressed node has unmounted; release is delivered at the window instead.
  pointer(window, 'pointerup');
  fireEvent.click(screen.getByRole('button', { name: 'Image 1 of 5' }));
  await tick(2000);
  expect(changed.mock.calls.map(([index]) => index)).toEqual([4, 0]);
});

it('selecting a thumbnail interrupts an active keyboard hold', async () => {
  const changed = await open(0);
  fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' });
  fireEvent.click(screen.getByRole('button', { name: 'Image 4 of 5' }));
  await tick(2000);
  expect(changed.mock.calls.map(([index]) => index)).toEqual([1, 3]);
  fireEvent.keyUp(window, { key: 'ArrowRight', code: 'ArrowRight' });
});

it('genuine pointer hold continues across renders and stops on window release without a duplicate click step', async () => {
  const changed = await open(0);
  const next = screen.getByRole('button', { name: 'Next' });
  pointer(next, 'pointerdown');
  await tick(350);
  expect(changed.mock.calls.map(([index]) => index)).toEqual([1, 2]);
  pointer(window, 'pointerup');
  fireEvent.click(next, { detail: 1 });
  await tick(1500);
  expect(changed.mock.calls.map(([index]) => index)).toEqual([1, 2]);
});

it.each(['pointercancel', 'lostpointercapture', 'pointermove'])('%s ends a pointer hold when the arrow does not receive pointerup', async (type) => {
  const changed = await open(0);
  pointer(screen.getByRole('button', { name: 'Next' }), 'pointerdown');
  pointer(window, type);
  await tick(1500);
  expect(changed.mock.calls.map(([index]) => index)).toEqual([1]);
});

it('ignores secondary mouse buttons and unrelated pointer releases', async () => {
  const changed = await open(0);
  const next = screen.getByRole('button', { name: 'Next' });
  pointer(next, 'pointerdown', 7, 2, 2);
  expect(changed).not.toHaveBeenCalled();
  pointer(next, 'pointerdown', 7);
  pointer(window, 'pointerup', 8);
  await tick(350);
  expect(changed.mock.calls.map(([index]) => index)).toEqual([1, 2]);
  pointer(window, 'pointerup', 7);
  await tick(1500);
  expect(changed.mock.calls.map(([index]) => index)).toEqual([1, 2]);
});
