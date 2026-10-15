import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePreviewFullscreen } from '../src/components/ImagePreview/shell/usePreviewFullscreen';
import { ImagePreview } from '../src/components/ImagePreview';
import type { FullscreenAdapter } from '../src/components/ImagePreview/types';

let active: Element | null;
const original = Object.getOwnPropertyDescriptor(document, 'fullscreenElement');
const enabled = Object.getOwnPropertyDescriptor(document, 'fullscreenEnabled');
beforeEach(() => {
  active = null;
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => active });
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.useRealTimers();
  if (original) Object.defineProperty(document, 'fullscreenElement', original);
  else delete (document as { fullscreenElement?: Element }).fullscreenElement;
  if (enabled) Object.defineProperty(document, 'fullscreenEnabled', enabled);
  else delete (document as { fullscreenEnabled?: boolean }).fullscreenEnabled;
});

function open(adapter?: FullscreenAdapter, onError = vi.fn()) {
  const root = document.createElement('div');
  const rootRef = { current: root };
  return { root, onError, ...renderHook(({ adapter }) => usePreviewFullscreen({ rootRef, adapter, onError }),
    { initialProps: { adapter } }) };
}

describe('host fullscreen adapters', () => {
  it('controlled state, methods and Escape remain exclusively host owned', async () => {
    const read = vi.fn(() => { throw new Error('DOM fullscreen must not be read in host mode'); });
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: read });
    const enter = vi.fn(), exit = vi.fn(), onClose = vi.fn();
    const base = { src: 'test:fs', visible: true, progressiveMain: false, preloadRadius: 0, onClose };
    const { rerender } = render(<ImagePreview {...base} fullscreen={{ isFullscreen: false, enter, exit }} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen' })); });
    expect(enter).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Exit fullscreen' })).toBeNull();
    rerender(<ImagePreview {...base} fullscreen={{ isFullscreen: true, enter, exit }} />);
    expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toBeTruthy();
    await act(async () => { fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); });
    expect(exit).toHaveBeenCalledTimes(1); expect(onClose).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });
  it('toggle-only buttons never invent active state or call explicit enter/exit', async () => {
    const toggle = vi.fn();
    render(<ImagePreview src="test:fs" visible preloadRadius={0} fullscreen={{ toggle }}
      strings={{ toggleFullscreen: 'Toggle VS Code window fullscreen' }} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Toggle VS Code window fullscreen' })); });
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Toggle VS Code window fullscreen' })).toBeTruthy();
    const hook = open({ toggle });
    await act(async () => { expect(await hook.result.current.requestFullscreen()).toBe(false); });
    expect(hook.onError).toHaveBeenCalledWith(expect.any(Error));
    expect(hook.result.current.isFullscreen()).toBe(false);
  });
  it('deduplicates pending requests and reports host errors', async () => {
    let reject!: (reason: Error) => void;
    const enter = vi.fn(() => new Promise<void>((_, failure) => { reject = failure; }));
    const { result, onError } = open({ isFullscreen: false, enter, exit: vi.fn() });
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.requestFullscreen(); });
    expect(await result.current.requestFullscreen()).toBe(false);
    expect(enter).toHaveBeenCalledTimes(1);
    const error = new Error('host rejected');
    await act(async () => { reject(error); expect(await pending).toBe(false); });
    expect(onError).toHaveBeenCalledWith(error);
  });
});

describe('browser fullscreen fallback', () => {
  it('requires API and fullscreenchange confirmation, then supports exit', async () => {
    const { root, result } = open();
    root.requestFullscreen = vi.fn(async () => { active = root; fireEvent(document, new Event('fullscreenchange')); });
    document.exitFullscreen = vi.fn(async () => { active = null; fireEvent(document, new Event('fullscreenchange')); });
    await act(async () => { expect(await result.current.requestFullscreen()).toBe(true); });
    expect(result.current.fullscreenActive).toBe(true);
    await act(async () => { await result.current.exitFullscreen(); });
    expect(result.current.fullscreenActive).toBe(false);
    delete (document as { exitFullscreen?: unknown }).exitFullscreen;
  });
  it('reports denied policy without calling the browser API', async () => {
    const { root, result, onError } = open();
    root.requestFullscreen = vi.fn(); document.exitFullscreen = vi.fn();
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
    await act(async () => { expect(await result.current.requestFullscreen()).toBe(false); });
    expect(root.requestFullscreen).not.toHaveBeenCalled(); expect(onError).toHaveBeenCalledTimes(1);
    delete (document as { exitFullscreen?: unknown }).exitFullscreen;
  });
  it('times out even if a browser API promise never settles and allows retry', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { root, result, onError } = open();
    root.requestFullscreen = vi.fn(() => new Promise<void>(() => {})); document.exitFullscreen = vi.fn();
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.requestFullscreen(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); expect(await pending).toBe(false); });
    expect(onError).toHaveBeenCalledTimes(1);
    root.requestFullscreen = vi.fn(async () => { active = root; fireEvent(document, new Event('fullscreenchange')); });
    await act(async () => { expect(await result.current.requestFullscreen()).toBe(true); });
    delete (document as { exitFullscreen?: unknown }).exitFullscreen;
  });
  it('cleans up an in-flight browser handshake on unmount without reporting an error', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { root, result, unmount, onError } = open();
    root.requestFullscreen = vi.fn(() => new Promise<void>(() => {})); document.exitFullscreen = vi.fn();
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.requestFullscreen(); });
    unmount(); expect(await pending).toBe(false);
    expect(onError).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
    delete (document as { exitFullscreen?: unknown }).exitFullscreen;
  });
});
