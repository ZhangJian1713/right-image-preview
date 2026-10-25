import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scheduleRevealAfterDecode } from '../src/components/ImagePreview/stage/imagePreviewDecode';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });
const pending = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};
function image(src = 'test:a') {
  const img = document.createElement('img');
  img.src = src;
  const deferred = pending();
  img.decode = vi.fn(() => deferred.promise);
  return { img, deferred };
}

describe('decode subscriptions', () => {
  it.each([0, 1])('reveals a decoded image when frames pause after %s callbacks', async (allowed) => {
    let remaining = allowed;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      if (remaining-- > 0) queueMicrotask(() => callback(0));
      return 1;
    });
    const { img, deferred } = image();
    const reveal = vi.fn();
    scheduleRevealAfterDecode(img, reveal, 60_000);
    await vi.advanceTimersByTimeAsync(200);
    expect(reveal).not.toHaveBeenCalled();
    deferred.resolve();
    await vi.advanceTimersByTimeAsync(200);
    expect(reveal).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cleans up a paused presentation wait when its last subscriber leaves', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    const { img, deferred } = image();
    const reveal = vi.fn();
    const cancel = scheduleRevealAfterDecode(img, reveal, 1000);
    deferred.resolve();
    await vi.advanceTimersByTimeAsync(0);
    cancel();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(200);
    expect(reveal).not.toHaveBeenCalled();
    const cached = vi.fn();
    scheduleRevealAfterDecode(img, cached, 1000);
    await vi.advanceTimersByTimeAsync(0);
    expect(cached).toHaveBeenCalledOnce();
    expect(img.decode).toHaveBeenCalledOnce();
  });
  it('ignores old-source frame fallbacks after the element changes URL', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    const { img, deferred } = image();
    const old = vi.fn();
    scheduleRevealAfterDecode(img, old, 1000);
    deferred.resolve();
    await vi.advanceTimersByTimeAsync(0);
    img.src = 'test:b';
    const nextDecode = pending();
    img.decode = vi.fn(() => nextDecode.promise);
    const current = vi.fn();
    scheduleRevealAfterDecode(img, current, 1000);
    await vi.advanceTimersByTimeAsync(200);
    expect(old).not.toHaveBeenCalled();
    expect(current).not.toHaveBeenCalled();
    nextDecode.resolve();
    await vi.advanceTimersByTimeAsync(200);
    expect(current).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels one subscriber while preserving another consumer of the same decode', async () => {
    const { img, deferred } = image();
    const oldVisit = vi.fn();
    const currentVisit = vi.fn();
    const cancel = scheduleRevealAfterDecode(img, oldVisit, 1000);
    scheduleRevealAfterDecode(img, currentVisit, 1000);
    cancel();
    deferred.resolve();
    await vi.advanceTimersByTimeAsync(50);
    expect(oldVisit).not.toHaveBeenCalled();
    expect(currentVisit).toHaveBeenCalledOnce();
    expect(img.decode).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('clears the deadline when the last subscriber leaves, then reuses ongoing work', async () => {
    const { img, deferred } = image();
    const abandoned = vi.fn();
    const cancel = scheduleRevealAfterDecode(img, abandoned, 1000);
    cancel();
    expect(vi.getTimerCount()).toBe(0);
    const current = vi.fn();
    scheduleRevealAfterDecode(img, current, 1000);
    expect(img.decode).toHaveBeenCalledOnce();
    deferred.resolve();
    await vi.advanceTimersByTimeAsync(50);
    expect(abandoned).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledOnce();
  });
  it('does not reuse the decoded marker after an img element changes source', async () => {
    const { img, deferred } = image();
    scheduleRevealAfterDecode(img, vi.fn(), 1000);
    deferred.resolve();
    await vi.advanceTimersByTimeAsync(50);
    img.src = 'test:b';
    const nextDecode = pending();
    img.decode = vi.fn(() => nextDecode.promise);
    const notify = vi.fn();
    scheduleRevealAfterDecode(img, notify, 1000);
    await vi.advanceTimersByTimeAsync(0);
    expect(notify).not.toHaveBeenCalled();
    nextDecode.resolve();
    await vi.advanceTimersByTimeAsync(50);
    expect(notify).toHaveBeenCalledOnce();
  });
  it('does not mark a timed-out decode as cached and cancels an already-cached microtask', async () => {
    const { img, deferred } = image();
    const timeout = vi.fn();
    scheduleRevealAfterDecode(img, timeout, 10);
    await vi.advanceTimersByTimeAsync(10);
    expect(timeout).toHaveBeenCalledOnce();
    const next = vi.fn();
    const cancel = scheduleRevealAfterDecode(img, next, 1000);
    await vi.advanceTimersByTimeAsync(0);
    expect(img.decode).toHaveBeenCalledTimes(2);
    expect(next).not.toHaveBeenCalled();
    deferred.resolve();
    await vi.advanceTimersByTimeAsync(50);
    expect(next).toHaveBeenCalledOnce();
    cancel();
    const cached = vi.fn();
    const cancelCached = scheduleRevealAfterDecode(img, cached, 1000);
    cancelCached();
    await vi.advanceTimersByTimeAsync(0);
    expect(cached).not.toHaveBeenCalled();
  });
});
