/**
 * Strings for the Vite demo page only (titles, descriptions, ref buttons, etc.).
 * This file is not part of the published library bundle.
 *
 * ImagePreview component UI (toolbar, aria-labels, …) lives in
 * `src/components/ImagePreview/locale.ts` and is controlled via the `language` prop.
 */

export type DemoLocale = 'en' | 'zh';

export const DEMO_LANG_STORAGE_KEY = 'right-image-preview-demo-lang';

export function readInitialLocale(): DemoLocale {
  try {
    const v = localStorage.getItem(DEMO_LANG_STORAGE_KEY);
    if (v === 'en' || v === 'zh') return v;
  } catch {
    /* ignore */
  }
  return 'en';
}

export interface DemoStrings {
  title: string;
  subtitle: string;
  langLabel: string;
  langSwitchHint: string;
  shortcuts: [string, string][];
  demo1Title: string;
  demo1Desc: string;
  demo2Title: string;
  demo2Desc: string;
  demo3Title: string;
  demo3Desc: string;
  photosBadge: (n: number) => string;
  refSectionTitle: string;
  refZoomIn: string;
  refZoomOut: string;
  refFit: string;
  ref100: string;
  ref200: string;
  refPrev: string;
  refNext: string;
  refRotateCW: string;
  refFlipH: string;
  refReadState: string;
  thumbAria: (label: string) => string;
}

export const STRINGS: Record<DemoLocale, DemoStrings> = {
  en: {
    title: 'ImagePreview demo',
    subtitle:
      'Dependency-free React image preview · discrete zoom stops · multi-image · keyboard, wheel, double-click',
    langLabel: 'Language',
    langSwitchHint: 'Demo page language (preview UI follows this)',
    shortcuts: [
      ['Esc', 'Close'],
      ['+', 'Zoom in'],
      ['−', 'Zoom out'],
      ['0', 'Fit'],
      ['1', '100%'],
      ['← →', 'Prev / next image'],
    ],
    demo1Title: 'Demo 1 · Single gallery',
    demo1Desc:
      'Album-style set of five images with mixed aspect ratios (including portrait). The toolbar shows global index only (e.g. 2/5), no folder row.',
    demo2Title: 'Demo 2 · Folder groups',
    demo2Desc:
      'Travel-style album: three folders, ten images. With `groupedImages`, the toolbar shows folder name, in-folder index (X/Y), and global index (M/N).',
    demo3Title: 'Demo 3 · High resolution',
    demo3Desc:
      'Local deep-sky samples (~tens of MB each) for first paint, fit-to-viewport, wheel zoom, and pan. The label shows uncompressed file size.',
    photosBadge: (n) => `${n} photos`,
    refSectionTitle: 'Programmatic control via ref (available while preview is open)',
    refZoomIn: 'Zoom in',
    refZoomOut: 'Zoom out',
    refFit: 'Fit',
    ref100: '100%',
    ref200: '200%',
    refPrev: 'Previous',
    refNext: 'Next',
    refRotateCW: 'Rotate 90° CW',
    refFlipH: 'Flip H',
    refReadState: 'Read state',
    thumbAria: (label) => `Open preview: ${label}`,
  },
  zh: {
    title: 'ImagePreview 演示',
    subtitle: '通用 React 图片预览组件 · 固定档位缩放 · 多图切换 · 键盘 / 滚轮 / 双击',
    langLabel: '语言',
    langSwitchHint: '演示页语言（预览组件界面与之同步）',
    shortcuts: [
      ['Esc', '关闭'],
      ['+', '放大'],
      ['−', '缩小'],
      ['0', '适应'],
      ['1', '100%'],
      ['← →', '切换图片'],
    ],
    demo1Title: 'Demo 1 · 单组图片',
    demo1Desc:
      '适合相册、作品集等场景。5 张图片，比例各不相同（含竖图）。工具栏仅显示全局序号（2/5 这样），无文件夹信息。',
    demo2Title: 'Demo 2 · 多文件夹图片',
    demo2Desc:
      '旅行相册场景，共 3 个文件夹 · 10 张图片。预览工具栏通过 `groupedImages` 同时显示：文件夹名称、在文件夹内的序号（X/Y）以及全局序号（M/N）。',
    demo3Title: 'Demo 3 · 超高分辨率图片',
    demo3Desc:
      '使用本地深空摄影样张（单文件十余 MB 级）测试首次加载、适应视口与滚轮缩放/平移。文件名括号内为压缩前文件体积。',
    photosBadge: (n) => `${n} 张`,
    refSectionTitle: '通过 ref 程序化控制（预览打开后可用）',
    refZoomIn: '放大',
    refZoomOut: '缩小',
    refFit: '适应',
    ref100: '100%',
    ref200: '200%',
    refPrev: '上一张',
    refNext: '下一张',
    refRotateCW: '顺时针旋转',
    refFlipH: '水平翻转',
    refReadState: '读取状态',
    thumbAria: (label) => `预览图片：${label}`,
  },
};
