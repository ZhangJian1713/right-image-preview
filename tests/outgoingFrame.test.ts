import { describe, expect, it } from 'vitest';
import { captureOutgoingFrame } from '../src/components/ImagePreview/lib/outgoingFrame';

const live = { src: 'test:a', dims: { naturalWidth: 3200, naturalHeight: 2400 }, cssTransform: 'live-pan-and-rotation' };
const frozen = { dims: { naturalWidth: 800, naturalHeight: 600 }, cssTransform: 'old-fit' };
const image = { complete: true, naturalWidth: 1600, naturalHeight: 1200 };
const base = { src: 'test:a', index: 4, live, frozen, image, fallbackTransform: 'fallback-fit' };

describe('outgoing frame ownership', () => {
  it('keeps the final live pose ahead of an older neighbor freeze and copies dimensions', () => {
    const frame = captureOutgoingFrame(base)!;
    expect(frame).toEqual({ ...live, index: 4 });
    frame.dims.naturalWidth = 10;
    expect(live.dims.naturalWidth).toBe(3200);
  });
  it('ignores a live pose belonging to another resource, then falls back to the frozen pose', () => {
    expect(captureOutgoingFrame({ ...base, live: { ...live, src: 'test:other' } }))
      .toEqual({ ...frozen, src: 'test:a', index: 4 });
  });
  it('uses bitmap dimensions only when the bitmap has loaded', () => {
    expect(captureOutgoingFrame({ ...base, live: null, frozen: undefined }))
      .toEqual({ src: 'test:a', index: 4, dims: { naturalWidth: 1600, naturalHeight: 1200 }, cssTransform: 'fallback-fit' });
    expect(captureOutgoingFrame({ ...base, live: null, frozen: undefined, image: { ...image, complete: false } })).toBeNull();
    expect(captureOutgoingFrame({ ...base, live: null, frozen: undefined, image: undefined })).toBeNull();
  });
});
