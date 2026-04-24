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
  thumbAria: (label: string) => string;
}

export const STRINGS: Record<DemoLocale, DemoStrings> = {
  en: {
    title: 'right-image-preview',
    heroTagline: 'Big full-screen photos for the web — zoom, browse, easy keys.',
    heroLead:
      'Photos open over the page. Zoom with the wheel or a double-click. Drag to move when zoomed. Step through many photos or jump between folders. A small corner map when the picture is huge. Lots of keyboard shortcuts. You only need React — no extra UI kits.',
    heroCtaTry: 'Open sample image',
    heroCtaGitHub: 'GitHub',
    heroCtaScroll: 'More to try below',
    featuresTitle: 'What it does',
    features: [
      {
        title: 'Full-screen photos',
        body: 'Pictures fill the screen with a simple bar at the bottom — like a phone or computer photo app.',
      },
      {
        title: 'Zoom and drag',
        body: 'Show the whole picture on screen, or real size. Zoom in steps with the mouse wheel. Double-click to zoom; double-click again to go back. Drag the photo when it is zoomed in.',
      },
      {
        title: 'Browse photos',
        body: 'Use the bar or side arrows. You can also split photos into folders and jump from one folder to the next.',
      },
      {
        title: 'Little corner map',
        body: 'When the photo is larger than the screen, a small map shows where you are. Drag the box on the map to move around.',
      },
      {
        title: 'Keys on the keyboard',
        body: 'Esc, arrows, space, page up/down, + and −, and more. See the short list below.',
      },
      {
        title: 'Small download',
        body: 'Written for TypeScript. The package is small. You do not need other UI libraries.',
      },
    ],
    opsTitle: 'How to use it',
    opsRows: [
      ['Click a small picture', 'Opens that photo full screen'],
      ['Esc', 'Closes the viewer'],
      ['← / →', 'Previous photo / next photo'],
      ['Mouse wheel', 'Zoom in or out (if wheel zoom is on)'],
      ['Double-click', 'Zoom in; double-click again to undo (if on)'],
      ['Drag', 'Move the photo when you are zoomed in'],
      ['Click the dark area', 'Closes (if click-outside-to-close is on)'],
    ],
    usageTitle: 'Install',
    usageLead: 'In your React project, run:',
    usageNpm: 'npm install right-image-preview',
    usageDocHint: 'All options, the key list, and developer notes are in the README and docs folder on GitHub.',
    liveDemoTitle: 'Try it',
    liveDemoSubtitle: 'Click any picture below. Then try zoom, the little map, and the keyboard.',
    thumbClickHint: 'Click to open',
    langLabel: 'Language',
    langSwitchHint: 'This page’s language. The viewer uses the same one.',
    demo1Title: 'Demo 1 · One set of photos',
    demo1Desc:
      'Five photos: wide ones, tall ones, mixed sizes. The counter shows where you are (like 2 of 5). No folders in this demo.',
    demo2Title: 'Demo 2 · Photos in folders',
    demo2Desc:
      'Ten photos in three folders, like a trip album. The bar can show the folder name, your place in the folder, and your place in the whole set.',
    demo3Title: 'Demo 3 · Very large photos',
    demo3Desc:
      'Two huge sky photos stored on this site. Good for testing load time, “fit whole photo,” wheel zoom, and drag. File size is in each name.',
    photosBadge: (n) => `${n} photos`,
    thumbAria: (label) => `Open photo: ${label}`,
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
    thumbAria: (label) => `预览图片：${label}`,
  },
};
