/**
 * Strings for the Vite demo page only (titles, descriptions, ref buttons, etc.).
 * This file is not part of the published library bundle.
 *
 * ImagePreview component UI (toolbar, aria-labels, …) lives in
 * `src/components/ImagePreview/locale.ts` and is controlled via the `language` prop.
 */

export type DemoLocale = 'en' | 'zh';

export const DEMO_LANG_STORAGE_KEY = 'right-image-preview-demo-lang';

/** Public site + repo (GitHub Pages, npm). */
export const DEMO_REPO_URL = 'https://github.com/ZhangJian1713/right-image-preview';

export function readInitialLocale(): DemoLocale {
  try {
    const v = localStorage.getItem(DEMO_LANG_STORAGE_KEY);
    if (v === 'en' || v === 'zh') return v;
  } catch {
    /* ignore */
  }
  return 'en';
}

export interface DemoFeature {
  readonly title: string;
  readonly body: string;
}

export interface DemoStrings {
  title: string;
  heroTagline: string;
  heroLead: string;
  heroCtaTry: string;
  heroCtaGitHub: string;
  heroCtaScroll: string;
  featuresTitle: string;
  features: readonly DemoFeature[];
  opsTitle: string;
  opsRows: [string, string][];
  usageTitle: string;
  usageLead: string;
  usageNpm: string;
  usageDocHint: string;
  liveDemoTitle: string;
  liveDemoSubtitle: string;
  thumbClickHint: string;
  langLabel: string;
  langSwitchHint: string;
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
    title: 'right-image-preview',
    heroTagline: 'A lightweight, full-featured image viewer for the web.',
    heroLead:
      'Fullscreen dialog, discrete zoom stops, drag to pan, wheel & double-click zoom, multi-image and folder groups, corner minimap, and keyboard shortcuts — zero runtime dependencies beyond React.',
    heroCtaTry: 'Open sample image',
    heroCtaGitHub: 'GitHub',
    heroCtaScroll: 'More demos below',
    featuresTitle: 'What you get',
    features: [
      {
        title: 'Fullscreen immersive viewer',
        body: 'Modal dialog with focus trap and polished toolbar — feels like a desktop photo app, not a bare lightbox.',
      },
      {
        title: 'Smooth zoom & pan',
        body: 'Fit vs native (100%) modes, discrete zoom stops, wheel zoom, double-click to zoom / restore, drag to pan when zoomed.',
      },
      {
        title: 'Gallery & folder navigation',
        body: 'Prev/next in the toolbar or on the sides; optional grouped “folders” with jump-between-groups controls.',
      },
      {
        title: 'Built-in minimap',
        body: 'When the image overflows, a corner map shows where you are and lets you drag the viewport frame.',
      },
      {
        title: 'Keyboard-first',
        body: 'Esc, arrows, Space, PageUp/Down, +/- and more — see the cheat sheet below.',
      },
      {
        title: 'Ships small',
        body: 'TypeScript-first API, tree-shakeable ESM/CJS, no extra UI libraries required.',
      },
    ],
    opsTitle: 'How to use the viewer',
    opsRows: [
      ['Click thumbnail', 'Open the fullscreen viewer on that image'],
      ['Esc', 'Close viewer'],
      ['← / →', 'Previous / next image'],
      ['Scroll wheel', 'Zoom in or out (when wheel zoom is enabled)'],
      ['Double-click', 'Zoom in; double-click again to restore (when enabled)'],
      ['Drag', 'Pan the image when zoomed in'],
      ['Click outside image', 'Close (when mask click is enabled)'],
    ],
    usageTitle: 'Install',
    usageLead: 'Add to your React app:',
    usageNpm: 'npm install right-image-preview',
    usageDocHint: 'Props, ref API, and keyboard list: see README and docs/ on GitHub.',
    liveDemoTitle: 'Live demo',
    liveDemoSubtitle: 'Click any image below to open the viewer — try zoom, minimap, and keyboard shortcuts.',
    thumbClickHint: 'Click to open',
    langLabel: 'Language',
    langSwitchHint: 'Demo page language (preview UI follows this)',
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
    title: 'right-image-preview',
    heroTagline: '轻量、功能齐全的全屏网页图片查看器。',
    heroLead:
      '全屏对话框、固定档位缩放、拖动平移、滚轮与双击缩放、多图与分组相册、角落小地图与完整快捷键支持 — 除 React 外无运行时依赖。',
    heroCtaTry: '打开示例图',
    heroCtaGitHub: 'GitHub',
    heroCtaScroll: '更多演示在下方',
    featuresTitle: '核心能力',
    features: [
      {
        title: '沉浸式全屏查看',
        body: '带焦点陷阱与完整工具栏的模态对话框，更接近桌面看图体验，而非简陋 lightbox。',
      },
      {
        title: '顺手的缩放与平移',
        body: '适应视口 / 原始比例（100%）、档位缩放、滚轮缩放、双击放大与还原（可开）、放大后可拖动平移。',
      },
      {
        title: '相册与分组导航',
        body: '工具栏或两侧箭头切换图片；可选分组（文件夹）并在组间跳转。',
      },
      {
        title: '内置导航小地图',
        body: '大图溢出时在角落显示缩略导航，可拖动取景框快速平移。',
      },
      {
        title: '键盘友好',
        body: 'Esc、方向键、空格、翻页、± 缩放等 — 详见下方操作说明。',
      },
      {
        title: '体积小、易集成',
        body: 'TypeScript 优先，ESM/CJS 双构建，无需额外 UI 框架。',
      },
    ],
    opsTitle: '查看器操作说明',
    opsRows: [
      ['点击缩略图', '全屏打开该图'],
      ['Esc', '关闭查看器'],
      ['← / →', '上一张 / 下一张'],
      ['滚轮', '缩放（开启滚轮缩放时）'],
      ['双击', '放大；再次双击还原（开启双击缩放时）'],
      ['拖动', '放大后可拖动平移画面'],
      ['点击遮罩外', '关闭（开启点击遮罩关闭时）'],
    ],
    usageTitle: '安装',
    usageLead: '在 React 项目中安装：',
    usageNpm: 'npm install right-image-preview',
    usageDocHint: 'Props、ref API 与键盘列表见 GitHub 上 README 与 docs/ 目录。',
    liveDemoTitle: '在线演示',
    liveDemoSubtitle: '点击下方任意图片打开查看器，可尝试缩放、小地图与快捷键。',
    thumbClickHint: '点击打开',
    langLabel: '语言',
    langSwitchHint: '演示页语言（预览组件界面与之同步）',
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
