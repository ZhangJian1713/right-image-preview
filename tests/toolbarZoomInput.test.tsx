import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ZoomInput } from '../src/components/ImagePreview/toolbar/ZoomInput';
import { resolveStrings } from '../src/components/ImagePreview/locale';

beforeEach(() => vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] }));
afterEach(() => { cleanup(); vi.useRealTimers(); });
function open() {
  const onSetNative = vi.fn();
  const view = render(<ZoomInput mode="fit" nativePercent={100} fitEquivalentNativePercent={25}
    stops={[25, 100, 800]} onFit={vi.fn()} onSetNative={onSetNative} strings={resolveStrings('en')}
    zoomLabelSlotPx={48} zoomDropdownWidthPx={140} />);
  return { ...view, onSetNative };
}
it('opens from the keyboard without scrolling, focuses the input and clamps submitted percentages', () => {
  const { onSetNative } = open();
  const trigger = screen.getByRole('button', { name: '25%' });
  expect(fireEvent.keyDown(trigger, { key: ' ', cancelable: true })).toBe(false);
  act(() => { vi.advanceTimersToNextFrame(); });
  const input = screen.getByRole('textbox');
  expect(document.activeElement).toBe(input);
  fireEvent.change(input, { target: { value: '900%' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onSetNative).toHaveBeenCalledWith(800);
  expect(screen.queryByRole('textbox')).toBeNull();
});
it('cancels drafts and cleans up focus work if closed or unmounted before the next frame', () => {
  const { onSetNative, unmount } = open();
  fireEvent.click(screen.getByRole('button', { name: '25%' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '400' } });
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
  expect(onSetNative).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: '25%' }));
  fireEvent.mouseDown(document.body);
  expect(screen.queryByRole('textbox')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '25%' }));
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
