/**
 * All user-visible strings in the ImagePreview component.
 * Add new entries here when new UI text is introduced.
 */
export interface LocaleStrings {
  // Zoom input / toolbar label shown when mode === 'fit'
  fit: string;
  /** @param pct – rounded fit-equivalent percentage, e.g. 42 */
  fitApprox(pct: number): string;

  // Toolbar button tooltips / aria-labels
  fitToViewport: string;
  actualSize: string;
  zoomIn: string;
  zoomOut: string;
  lockZoom: string;
  unlockZoom: string;
  rotateCW: string;
  rotateCCW: string;
  flipH: string;
  flipV: string;

  // Navigation
  prev: string;
  next: string;
  prevGroup: string;
  nextGroup: string;

  // Overlay / misc
  imagePreview: string;
  toolbar: string;
  close: string;
  loadingImage: string;
}

const EN: LocaleStrings = {
  fit:           'Fit',
  fitApprox:     (pct) => `Fit (~${pct}%)`,
  fitToViewport: 'Fit to viewport',
  actualSize:    'Actual size (100%)',
  zoomIn:        'Zoom in',
  zoomOut:       'Zoom out',
  lockZoom:      'Lock zoom (preserve zoom when switching images)',
  unlockZoom:    'Unlock zoom (preserve zoom when switching images)',
  rotateCW:      'Rotate 90° clockwise',
  rotateCCW:     'Rotate 90° counter-clockwise',
  flipH:         'Flip horizontal',
  flipV:         'Flip vertical',
  prev:          'Previous',
  next:          'Next',
  prevGroup:     'Previous group',
  nextGroup:     'Next group',
  imagePreview:  'Image preview',
  toolbar:       'Image preview toolbar',
  close:         'Close (Esc)',
  loadingImage:  'Loading image',
};

const ZH: LocaleStrings = {
  fit:           '适应',
  fitApprox:     (pct) => `适应 (约 ${pct}%)`,
  fitToViewport: '适应视口',
  actualSize:    '原始比例 (100%)',
  zoomIn:        '放大',
  zoomOut:       '缩小',
  lockZoom:      '锁定缩放（切图时保持当前比例）',
  unlockZoom:    '解锁缩放（切图时保持当前比例）',
  rotateCW:      '顺时针旋转 90°',
  rotateCCW:     '逆时针旋转 90°',
  flipH:         '水平翻转',
  flipV:         '垂直翻转',
  prev:          '上一张',
  next:          '下一张',
  prevGroup:     '上一组',
  nextGroup:     '下一组',
  imagePreview:  '图片预览',
  toolbar:       '图片预览工具栏',
  close:         '关闭 (Esc)',
  loadingImage:  '图片加载中',
};

/** Built-in locale map. Extend or override via the `language` prop. */
const LOCALES: Record<string, LocaleStrings> = { en: EN, zh: ZH };

/**
 * Resolve a {@link LocaleStrings} object from a BCP 47 language tag.
 *
 * Matching is done on the primary subtag only (`zh-CN` → `zh`).
 * Falls back to English for any unrecognised locale.
 *
 * @param language – e.g. `"en"`, `"en-US"`, `"zh"`, `"zh-CN"`
 */
export function resolveStrings(language?: string): LocaleStrings {
  if (!language) return EN;
  const primary = language.split(/[-_]/)[0].toLowerCase();
  return LOCALES[primary] ?? EN;
}
