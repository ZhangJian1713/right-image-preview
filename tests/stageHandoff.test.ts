import { describe, expect, it } from 'vitest';
import { createStageHandoff, stageHandoff } from '../src/components/ImagePreview/stage/stageHandoff';
import type { OutgoingFrame } from '../src/components/ImagePreview/model/stage';

const frame = (src: string, index: number): OutgoingFrame => ({ src, index,
  dims: { naturalWidth: 3200, naturalHeight: 2400 }, cssTransform: 'translate(80px, 20px) scale(1)' });

describe('stage handoff transitions', () => {
  it('keeps the displayed A across an unpresented B and C without mutating previous snapshots', () => {
    const a = frame('a', 0);
    const initial = { ...createStageHandoff('a', 0), presented: a };
    const b = stageHandoff(initial, { type: 'select', src: 'b', index: 1 });
    const c = stageHandoff(b, { type: 'select', src: 'c', index: 2 });
    expect(c.outgoing).toBe(a);
    expect(c.frozen.get('a')).toEqual({ dims: a.dims, cssTransform: a.cssTransform });
    expect(initial.frozen.size).toBe(0);
    expect(initial.outgoing).toBeNull();
    expect(b.visit.src).toBe('b');
    expect(stageHandoff(c, { type: 'reveal', visit: b.visit })).toBe(c);
    expect(stageHandoff(c, { type: 'reveal', visit: c.visit }).outgoing).toBeNull();
  });
  it('distinguishes A → B → A visits and rejects old paint/reveal results', () => {
    const a = { ...createStageHandoff('a', 0), presented: frame('a', 0) };
    const b = stageHandoff(a, { type: 'select', src: 'b', index: 1 });
    const a2 = stageHandoff(b, { type: 'select', src: 'a', index: 0 });
    expect(a2.visit).not.toBe(a.visit);
    expect(a2.outgoing).toBeNull();
    expect(stageHandoff(a2, { type: 'paint', layer: 'main', visit: a.visit })).toBe(a2);
    expect(stageHandoff(a2, { type: 'paint', layer: 'underlay', visit: b.visit })).toBe(a2);
    const painted = stageHandoff(a2, { type: 'paint', layer: 'main', visit: a2.visit });
    expect(painted.mainPainted).toBe(true);
    expect(painted.underlayPainted).toBe(false);
    expect(stageHandoff(painted, { type: 'paint', layer: 'main', visit: a2.visit })).toBe(painted);
  });
  it('bounds retained presentation metadata and preserves the most recent held frame', () => {
    let state = createStageHandoff('0', 0);
    for (let index = 1; index <= 100; index++) {
      state = stageHandoff(state, { type: 'present', visit: state.visit, frame: frame(String(index - 1), index - 1) });
      state = stageHandoff(state, { type: 'select', src: String(index), index });
      state = stageHandoff(state, { type: 'reveal', visit: state.visit });
    }
    expect(state.frozen.size).toBeLessThanOrEqual(24);
    expect(state.frozen.has('99')).toBe(true);
    expect(state.frozen.has('0')).toBe(false);
  });
});
