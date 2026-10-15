import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getPreviewShortcutHelp, resolvePreviewShortcut } from '../src/components/ImagePreview/previewShortcuts';
import { useImagePreviewKeyboard, type UseImagePreviewKeyboardParams } from '../src/components/ImagePreview/useImagePreviewKeyboard';

const all = { navigation: true, groups: true, shortcuts: true, exif: true, delete: true };
const event = (key: string, code = '', extra: KeyboardEventInit = {}) => new KeyboardEvent('keydown', { key, code, ...extra });
describe('fixed image shortcuts', () => {
  it('maps shared aliases, rotation, fullscreen, and help without modified host shortcuts', () => {
    for (const [key, code, action, extra] of [
      ['q', 'KeyQ', 'previous', {}], ['e', 'KeyE', 'next', {}], ['r', 'KeyR', 'rotateCW', {}],
      ['R', 'KeyR', 'rotateCCW', { shiftKey: true }], ['f', 'KeyF', 'fullscreen', {}],
      ['?', 'Slash', 'shortcuts', { shiftKey: true }], ['Home', 'Home', 'first', {}], ['End', 'End', 'last', {}],
    ] as const) expect(resolvePreviewShortcut(event(key, code, extra), all, true)?.action).toBe(action);
    for (const extra of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }]) {
      expect(resolvePreviewShortcut(event('f', 'KeyF', extra), all, true)).toBeNull();
      expect(resolvePreviewShortcut(event(' ', 'Space', extra), all, true)).toBeNull();
    }
    expect(resolvePreviewShortcut(event('ArrowLeft', 'ArrowLeft', { ctrlKey: true }), all, true)?.action).toBe('rotateCCW');
    expect(resolvePreviewShortcut(event('+', 'Equal', { shiftKey: true }), all, true)?.action).toBe('zoomIn');
    expect(resolvePreviewShortcut(event('+', 'Unknown'), all, true)?.action).toBe('zoomIn');
  });
  it('keeps keypad identity with NumLock off and gates pan on overflow', () => {
    expect(resolvePreviewShortcut(event('End', 'Numpad1'), all, true)?.pan).toEqual([1, -1]);
    expect(resolvePreviewShortcut(event('Insert', 'Numpad0'), all, false)?.action).toBe('cycleZoom');
    expect(resolvePreviewShortcut(event('End', 'Numpad1'), all, false)).toBeNull();
    expect(resolvePreviewShortcut(event('w', 'KeyW'), all, false)).toBeNull();
    expect(resolvePreviewShortcut(event('1'), all, false)?.action).toBe('actualSize');
  });
  it('omits unsupported features from the read-only reference', () => {
    const entries = getPreviewShortcutHelp({ navigation: true, shortcuts: true });
    expect(entries.find((entry) => entry.action === 'previous')?.keys).toEqual(['←', 'Q']);
    expect(entries.some((entry) => ['delete', 'exif', 'previousGroup', 'nextGroup'].includes(entry.action))).toBe(false);
  });
});
function params(): UseImagePreviewKeyboardParams {
  return { resetHideTimer: vi.fn(), onClose: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn(), fit: vi.fn(), setNative: vi.fn(),
    mode: 'native', prev: vi.fn(), next: vi.fn(), prevGroup: vi.fn(), nextGroup: vi.fn(), rotateCW: vi.fn(), rotateCCW: vi.fn(),
    panByDelta: vi.fn(), keyboardPanStepPx: 100, fitEquivalentNativePercent: 25, canPan: true,
    beginNavHold: vi.fn(), endNavHold: vi.fn(), showShortcuts: vi.fn(), toggleFullscreen: vi.fn() };
}
function Harness({ value }: { value: UseImagePreviewKeyboardParams }) { useImagePreviewKeyboard(value); return <input aria-label="editing" />; }
it('retains held navigation across renders, ends on blur, and pauses for a host modal', () => {
  const value = params();
  const { rerender, getByLabelText } = render(<Harness value={value} />);
  fireEvent.keyDown(window, { key: 'q', code: 'KeyQ' });
  fireEvent.keyDown(window, { key: 'q', code: 'KeyQ', repeat: true });
  rerender(<Harness value={{ ...value }} />);
  expect(value.beginNavHold).toHaveBeenCalledTimes(1);
  fireEvent.keyUp(window, { key: 'q', code: 'KeyQ' });
  expect(value.endNavHold).toHaveBeenCalled();
  fireEvent.keyDown(window, { key: 'w', code: 'KeyW' });
  fireEvent.keyDown(window, { key: 'd', code: 'KeyD' });
  const diagonal = vi.mocked(value.panByDelta).mock.lastCall!;
  expect(diagonal[0]).toBeCloseTo(-Math.SQRT1_2 * 100);
  expect(diagonal[1]).toBeCloseTo(Math.SQRT1_2 * 100);
  fireEvent.blur(window);
  fireEvent.keyDown(window, { key: 'd', code: 'KeyD' });
  expect(value.panByDelta).toHaveBeenLastCalledWith(-100, 0);
  fireEvent.keyDown(getByLabelText('editing'), { key: 'f', code: 'KeyF' });
  expect(value.toggleFullscreen).not.toHaveBeenCalled();
  rerender(<Harness value={{ ...value, keyboardActive: false }} />);
  act(() => { window.dispatchEvent(event('f', 'KeyF')); });
  expect(value.toggleFullscreen).not.toHaveBeenCalled();
});
