import { describe, expect, it } from 'vitest';
import { mergeStrings, resolveStrings } from '../src/components/ImagePreview/i18n/locale';

describe('resolveStrings', () => {
  it('returns English strings by default (no language)', () => {
    const t = resolveStrings(undefined);
    expect(t.zoomIn).toBe('Zoom in');
    expect(t.close).toBe('Close (Esc)');
  });

  it('returns English for "en"', () => {
    const t = resolveStrings('en');
    expect(t.zoomIn).toBe('Zoom in');
  });

  it('returns English for "en-US" (primary subtag match)', () => {
    const t = resolveStrings('en-US');
    expect(t.zoomIn).toBe('Zoom in');
  });

  it('returns Chinese strings for "zh"', () => {
    const t = resolveStrings('zh');
    expect(t.zoomIn).toBe('放大');
  });

  it('returns Chinese strings for "zh-CN"', () => {
    const t = resolveStrings('zh-CN');
    expect(t.zoomIn).toBe('放大');
  });

  it('falls back to English for unknown locale', () => {
    const t = resolveStrings('fr');
    expect(t.zoomIn).toBe('Zoom in');
  });

  it('falls back to English for empty string', () => {
    const t = resolveStrings('');
    expect(t.zoomIn).toBe('Zoom in');
  });

  it('fitApprox formats the percentage', () => {
    const t = resolveStrings('en');
    expect(t.fitApprox(75)).toBe('Fit (75%)');
  });
});

describe('mergeStrings', () => {
  it('returns base unchanged when overrides is undefined', () => {
    const base = resolveStrings('en');
    const result = mergeStrings(base, undefined);
    expect(result).toBe(base);
  });

  it('overrides individual fields', () => {
    const base = resolveStrings('en');
    const result = mergeStrings(base, { close: 'Dismiss' });
    expect(result.close).toBe('Dismiss');
    expect(result.zoomIn).toBe('Zoom in');
  });

  it('does not mutate the base object', () => {
    const base = resolveStrings('en');
    const original = base.close;
    mergeStrings(base, { close: 'Dismiss' });
    expect(base.close).toBe(original);
  });

  it('overrides function-typed fields', () => {
    const base = resolveStrings('en');
    const result = mergeStrings(base, { fitApprox: (pct) => `~${pct}%` });
    expect(result.fitApprox(80)).toBe('~80%');
    expect(base.fitApprox(80)).toBe('Fit (80%)');
  });

  it('can supply a completely different locale', () => {
    const base = resolveStrings('en');
    const zh = resolveStrings('zh');
    const result = mergeStrings(base, zh);
    expect(result.zoomIn).toBe('放大');
  });
});

describe('Traditional Chinese locale', () => {
  it.each(['zh-TW', 'zh_HK', 'zh-MO', 'zh-Hant', ' zh-Hant-TW '])('%s resolves Traditional Chinese', (tag) => {
    expect(resolveStrings(tag).imagePreview).toBe('圖片預覽');
  });
  it('honors explicit Simplified script and retains complete locale catalogs', () => {
    expect(resolveStrings('zh-Hans-HK').imagePreview).toBe('图片预览');
    expect(Object.keys(resolveStrings('zh-TW')).sort()).toEqual(Object.keys(resolveStrings('en')).sort());
    expect(resolveStrings('zh-TW').dragToPan).toBe('拖曳以平移');
  });
});
