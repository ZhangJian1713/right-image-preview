import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ImagePreview } from '../src/components/ImagePreview';
import { enStrings } from '../src/components/ImagePreview/locales/en';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

it('keeps obvious actions accessible without hover text and retains explanatory hints', () => {
  render(<ImagePreview visible images={[
    { src: 'test:a' }, { src: 'test:b' }, { src: 'test:c' },
  ]} defaultIndex={1} initialMode="native" initialNativePercent={100}
    progressiveMain={false} preloadRadius={0} preloadDisplaySlots={0}
    showFlip showExif showDelete showThumbnailToggle />);
  for (const label of [enStrings.close, enStrings.prev, enStrings.next, enStrings.zoomIn, enStrings.zoomOut,
    enStrings.rotateCW, enStrings.rotateCCW, enStrings.deleteImage, enStrings.enterFullscreen]) {
    // Both side arrows and toolbar navigation must follow the same rule.
    for (const button of screen.getAllByRole('button', { name: label })) {
      expect(button).not.toHaveAttribute('title');
      fireEvent.mouseEnter(button);
      act(() => vi.advanceTimersByTime(1000));
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      fireEvent.mouseLeave(button);
    }
  }
  for (const [label, hint] of [
    [enStrings.lockZoom, enStrings.tipLockZoom], [enStrings.fitToViewport, enStrings.tipFitToViewport],
    [enStrings.flipH, enStrings.tipFlipH], [enStrings.showThumbnails, enStrings.showThumbnails],
  ]) {
    const button = screen.getByRole('button', { name: label });
    fireEvent.mouseEnter(button);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('tooltip')).toHaveTextContent(hint);
    fireEvent.mouseLeave(button);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  }
});

it('can hide counter-clockwise rotation without disabling its keyboard action', async () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, toJSON() {} });
  render(<ImagePreview src="test:rotation" visible showRotateCCW={false}
    progressiveMain={false} preloadRadius={0} preloadDisplaySlots={0} />);
  expect(screen.queryByRole('button', { name: enStrings.rotateCCW })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: enStrings.rotateCW })).toBeInTheDocument();
  // Observe the rendered transform because keyboard dispatch uses the internal action, not the ref method.
  const image = document.querySelector('img[src="test:rotation"]')!;
  Object.defineProperties(image, { naturalWidth: { value: 1600 }, naturalHeight: { value: 1200 }, complete: { value: true }, decode: { value: () => Promise.resolve() } });
  await act(async () => { fireEvent.load(image); await vi.advanceTimersByTimeAsync(100); });
  const before = image.parentElement!.style.transform;
  fireEvent.keyDown(window, { key: 'R', code: 'KeyR', shiftKey: true });
  expect(image.parentElement!.style.transform).not.toBe(before);
  expect(image.parentElement!.style.transform).toContain('rotate(-90deg)');
});
