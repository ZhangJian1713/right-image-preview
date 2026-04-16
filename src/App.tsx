import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePreview } from './components/ImagePreview';
import type { ImageGroup, ImageItem, ImagePreviewRef, ZoomState } from './components/ImagePreview';

// ── Demo locale (page + ImagePreview `language`) ────────────────────────────

type DemoLocale = 'en' | 'zh';

const DEMO_LANG_STORAGE_KEY = 'right-image-preview-demo-lang';

function readInitialLocale(): DemoLocale {
  try {
    const v = localStorage.getItem(DEMO_LANG_STORAGE_KEY);
    if (v === 'en' || v === 'zh') return v;
  } catch {
    /* ignore */
  }
  return 'en';
}

interface DemoStrings {
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

const STRINGS: Record<DemoLocale, DemoStrings> = {
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
      'Travel-style album: three folders, ten images. With the `groups` prop, the toolbar shows folder name, in-folder index (X/Y), and global index (M/N).',
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
      '旅行相册场景，共 3 个文件夹 · 10 张图片。预览工具栏通过 `groups` 同时显示：文件夹名称、在文件夹内的序号（X/Y）以及全局序号（M/N）。',
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

// ── Demo 1：单组图片 ────────────────────────────────────────────────────────

const SINGLE_GALLERY: ImageItem[] = [
  { src: 'https://picsum.photos/seed/sg-mtn/1920/1280', alt: '山间云雾', name: 'mountain-mist.jpg' },
  {
    src: 'https://picsum.photos/seed/sg-fst/1280/1920',
    alt: '竖幅树林',
    name: 'forest-portrait-this-is-a-very-very-long-long-file-name-so-that-it-can-be-tested-with-a-very-long-file-name.jpg',
  },
  { src: 'https://picsum.photos/seed/sg-cst/2400/1600', alt: '海岸线', name: 'coastline.jpg' },
  { src: 'https://picsum.photos/seed/sg-town/1600/1200', alt: '古镇街道', name: 'old-town.jpg' },
  { src: 'https://picsum.photos/seed/sg-sun/3000/2000', alt: '草原日落', name: 'grassland-sunset.jpg' },
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const CITY_IMAGES: ImageItem[] = [
  { src: 'https://picsum.photos/seed/city-bld/1600/1000', alt: '现代楼群', name: 'buildings-01.jpg' },
  { src: 'https://picsum.photos/seed/city-sky/2000/1200', alt: '夜间天际线', name: 'skyline-night.jpg' },
  { src: 'https://picsum.photos/seed/city-aly/800/1200', alt: '街道小巷', name: 'alley.jpg' },
];

const NATURE_IMAGES: ImageItem[] = [
  { src: 'https://picsum.photos/seed/nat-vly/2400/1600', alt: '山谷晨雾', name: 'valley-mist.jpg' },
  { src: 'https://picsum.photos/seed/nat-wfl/1800/1200', alt: '瀑布', name: 'waterfall.jpg' },
  { src: 'https://picsum.photos/seed/nat-fld/3200/2000', alt: '花田', name: 'flower-field.jpg' },
];

const OCEAN_IMAGES: ImageItem[] = [
  { src: 'https://picsum.photos/seed/sea-wide/3000/1500', alt: '海天一色', name: 'ocean-wide.jpg' },
  { src: 'https://picsum.photos/seed/sea-rock/1200/1600', alt: '礁石近景（竖）', name: 'rocks-close.jpg' },
  { src: 'https://picsum.photos/seed/sea-bch/2000/1400', alt: '沙滩', name: 'beach.jpg' },
  { src: 'https://picsum.photos/seed/sea-fs/1600/1000', alt: '渔船日落', name: 'fishing-sunset.jpg' },
];

interface FolderGroup {
  name: string;
  images: ImageItem[];
}

const FOLDER_GROUP_NAMES: Record<DemoLocale, [string, string, string]> = {
  zh: ['🏙 城市建筑', '🌿 自然风光', '🌊 海洋沙滩'],
  en: ['🏙 City', '🌿 Nature', '🌊 Ocean & beach'],
};

function buildFolderData(locale: DemoLocale): {
  folderGroups: FolderGroup[];
  multiFolderImages: ImageItem[];
  folderGroupDefs: ImageGroup[];
} {
  const names = FOLDER_GROUP_NAMES[locale];
  const folderGroups: FolderGroup[] = [
    { name: names[0], images: CITY_IMAGES },
    { name: names[1], images: NATURE_IMAGES },
    { name: names[2], images: OCEAN_IMAGES },
  ];
  const multiFolderImages = folderGroups.flatMap((g) => g.images);
  let offset = 0;
  const folderGroupDefs: ImageGroup[] = folderGroups.map((g) => {
    const start = offset;
    const end = offset + g.images.length - 1;
    offset = end + 1;
    return { name: g.name, start, end };
  });
  return { folderGroups, multiFolderImages, folderGroupDefs };
}

function getFlatIndex(folderGroups: FolderGroup[], folderIdx: number, imgIdx: number): number {
  let o = 0;
  for (let i = 0; i < folderIdx; i++) o += folderGroups[i].images.length;
  return o + imgIdx;
}

function largeGallery(locale: DemoLocale): ImageItem[] {
  const mbZh = '（18.6 MB）';
  const mbEn = ' (18.6 MB)';
  const mb2Zh = '（13.6 MB）';
  const mb2En = ' (13.6 MB)';
  const z = locale === 'zh';
  return [
    {
      src: `${BASE}/test-images/seagull-nebula.jpg`,
      alt: 'Seagull Nebula',
      name: `seagull-nebula.jpg${z ? mbZh : mbEn}`,
    },
    {
      src: `${BASE}/test-images/eagle-nebula.jpg`,
      alt: 'Eagle Nebula',
      name: `eagle-nebula.jpg${z ? mb2Zh : mb2En}`,
    },
  ];
}

// ── 通用样式 ────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'none',
  border: '2px solid transparent',
  borderRadius: 10,
  padding: 0,
  cursor: 'pointer',
  overflow: 'hidden',
  transition: 'border-color 0.15s, transform 0.15s',
  outline: 'none',
  textAlign: 'left',
};

const thumbImgStyle: React.CSSProperties = {
  width: '100%',
  height: 140,
  objectFit: 'cover',
  display: 'block',
};

const thumbLabelStyle: React.CSSProperties = {
  padding: '7px 10px',
  fontSize: 12,
  color: '#aaa',
  background: '#161822',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 10,
};

const sectionHeadStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  margin: '0 0 6px',
};

const sectionDescStyle: React.CSSProperties = {
  margin: '0 0 16px',
  color: '#888',
  fontSize: 13,
  lineHeight: 1.6,
};

const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #2a2d3a',
  margin: '44px 0',
};

// ── 缩略图卡片 ──────────────────────────────────────────────────────────────

function ThumbCard({
  src,
  alt,
  label,
  ariaLabel,
  onClick,
}: {
  src: string;
  alt: string;
  label: string;
  ariaLabel: string;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      style={{
        ...cardStyle,
        borderColor: hover ? '#5865f2' : 'transparent',
        transform: hover ? 'scale(1.02)' : 'scale(1)',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <img src={src} alt={alt} style={thumbImgStyle} />
      <div style={thumbLabelStyle}>{label}</div>
    </button>
  );
}

function RefBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 12px',
        borderRadius: 6,
        border: '1px solid #3a3d4a',
        background: '#1a1d27',
        color: '#c8d0e8',
        cursor: 'pointer',
        fontSize: 12,
      }}
    >
      {label}
    </button>
  );
}

function RefControls({
  previewRef,
  t,
}: {
  previewRef: React.RefObject<ImagePreviewRef | null>;
  t: DemoStrings;
}) {
  const [zoomInfo, setZoomInfo] = useState<ZoomState | null>(null);

  return (
    <section style={{ marginTop: 32 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#aaa', marginBottom: 10 }}>{t.refSectionTitle}</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <RefBtn label={t.refZoomIn} onClick={() => previewRef.current?.zoomIn()} />
        <RefBtn label={t.refZoomOut} onClick={() => previewRef.current?.zoomOut()} />
        <RefBtn label={t.refFit} onClick={() => previewRef.current?.fit()} />
        <RefBtn label={t.ref100} onClick={() => previewRef.current?.setNative(100)} />
        <RefBtn label={t.ref200} onClick={() => previewRef.current?.setNative(200)} />
        <RefBtn label={t.refPrev} onClick={() => previewRef.current?.prev()} />
        <RefBtn label={t.refNext} onClick={() => previewRef.current?.next()} />
        <RefBtn label={t.refRotateCW} onClick={() => previewRef.current?.rotateCW()} />
        <RefBtn label={t.refFlipH} onClick={() => previewRef.current?.flipHorizontal()} />
        <RefBtn label={t.refReadState} onClick={() => setZoomInfo(previewRef.current?.getState() ?? null)} />
      </div>
      {zoomInfo && (
        <pre
          style={{
            marginTop: 10,
            padding: '10px 14px',
            borderRadius: 8,
            background: '#1a1d27',
            border: '1px solid #2a2d3a',
            fontFamily: 'monospace',
            fontSize: 12,
            color: '#8ec7ff',
            overflowX: 'auto',
          }}
        >
          {JSON.stringify(zoomInfo, null, 2)}
        </pre>
      )}
    </section>
  );
}

function LangSwitch({
  locale,
  onChange,
  t,
}: {
  locale: DemoLocale;
  onChange: (l: DemoLocale) => void;
  t: DemoStrings;
}) {
  const seg = (active: boolean, edge: 'left' | 'right'): React.CSSProperties => ({
    padding: '6px 14px',
    border: 'none',
    borderRight: edge === 'left' ? '1px solid #3a3d4a' : undefined,
    borderRadius: edge === 'left' ? '7px 0 0 7px' : '0 7px 7px 0',
    background: active ? 'rgba(88,101,242,0.45)' : '#1a1d27',
    color: '#c8d0e8',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
  });

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
      role="group"
      aria-label={t.langSwitchHint}
    >
      <span style={{ fontSize: 12, color: '#888' }}>{t.langLabel}</span>
      <div style={{ display: 'inline-flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #3a3d4a' }}>
        <button type="button" style={seg(locale === 'en', 'left')} onClick={() => onChange('en')} aria-pressed={locale === 'en'}>
          EN
        </button>
        <button type="button" style={seg(locale === 'zh', 'right')} onClick={() => onChange('zh')} aria-pressed={locale === 'zh'}>
          中文
        </button>
      </div>
    </div>
  );
}

// ── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [locale, setLocale] = useState<DemoLocale>(readInitialLocale);
  const t = STRINGS[locale];
  const previewLanguage = locale === 'zh' ? 'zh-CN' : 'en';

  const { folderGroups, multiFolderImages, folderGroupDefs } = useMemo(
    () => buildFolderData(locale),
    [locale],
  );

  const largeGalleryItems = useMemo(() => largeGallery(locale), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    document.title = locale === 'zh' ? 'right-image-preview 演示' : 'right-image-preview demo';
    try {
      localStorage.setItem(DEMO_LANG_STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  const [demo1Visible, setDemo1Visible] = useState(false);
  const [demo1Index, setDemo1Index] = useState(0);
  const demo1Ref = useRef<ImagePreviewRef>(null);

  const [demo2Visible, setDemo2Visible] = useState(false);
  const [demo2Index, setDemo2Index] = useState(0);

  const [demo3Visible, setDemo3Visible] = useState(false);
  const [demo3Index, setDemo3Index] = useState(0);

  const openDemo1 = (idx: number) => {
    setDemo1Index(idx);
    setDemo1Visible(true);
  };
  const openDemo2 = (idx: number) => {
    setDemo2Index(idx);
    setDemo2Visible(true);
  };

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#0f1117',
        color: '#e8e8e8',
        fontFamily: '"Inter", "PingFang SC", system-ui, sans-serif',
        padding: '40px 32px',
        maxWidth: 1200,
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 36,
          right: 32,
          zIndex: 2,
        }}
      >
        <LangSwitch locale={locale} onChange={setLocale} t={t} />
      </div>

      <header style={{ marginBottom: 40, paddingRight: 200 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{t.title}</h1>
        <p style={{ margin: '8px 0 0', color: '#666', fontSize: 14 }}>{t.subtitle}</p>
      </header>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 44 }}>
        {t.shortcuts.map(([key, desc]) => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: '#1a1d27',
              borderRadius: 6,
              padding: '3px 10px',
              fontSize: 12,
            }}
          >
            <kbd
              style={{
                background: '#252836',
                border: '1px solid #3a3d4a',
                borderRadius: 4,
                padding: '1px 6px',
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#c8d0e8',
              }}
            >
              {key}
            </kbd>
            <span style={{ color: '#777' }}>{desc}</span>
          </div>
        ))}
      </div>

      <section>
        <h2 style={sectionHeadStyle}>{t.demo1Title}</h2>
        <p style={sectionDescStyle}>{t.demo1Desc}</p>
        <div style={gridStyle}>
          {SINGLE_GALLERY.map((img, i) => (
            <ThumbCard
              key={img.src}
              src={img.src}
              alt={img.alt ?? ''}
              label={img.name ?? img.alt ?? ''}
              ariaLabel={t.thumbAria(img.name ?? img.alt ?? '')}
              onClick={() => openDemo1(i)}
            />
          ))}
        </div>
        <RefControls previewRef={demo1Ref} t={t} />
      </section>

      <hr style={dividerStyle} />

      <section>
        <h2 style={sectionHeadStyle}>{t.demo2Title}</h2>
        <p style={sectionDescStyle}>{t.demo2Desc}</p>

        {folderGroups.map((group, gi) => (
          <div key={group.name} style={{ marginBottom: 28 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600 }}>{group.name}</span>
              <span
                style={{
                  fontSize: 12,
                  color: '#666',
                  background: '#1a1d27',
                  borderRadius: 20,
                  padding: '2px 8px',
                }}
              >
                {t.photosBadge(group.images.length)}
              </span>
            </div>
            <div style={gridStyle}>
              {group.images.map((img, ii) => (
                <ThumbCard
                  key={img.src}
                  src={img.src}
                  alt={img.alt ?? ''}
                  label={img.name ?? img.alt ?? ''}
                  ariaLabel={t.thumbAria(img.name ?? img.alt ?? '')}
                  onClick={() => openDemo2(getFlatIndex(folderGroups, gi, ii))}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      <hr style={dividerStyle} />

      <section>
        <h2 style={sectionHeadStyle}>{t.demo3Title}</h2>
        <p style={sectionDescStyle}>{t.demo3Desc}</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {largeGalleryItems.map((img, idx) => (
            <button
              key={img.src}
              type="button"
              style={{
                ...cardStyle,
                background: '#1a1d27',
                border: '1px solid #2a2d3a',
                padding: '10px 18px',
              }}
              onClick={() => {
                setDemo3Index(idx);
                setDemo3Visible(true);
              }}
            >
              <span style={{ color: '#8ec7ff', fontSize: 13 }}>{img.name}</span>
            </button>
          ))}
        </div>
      </section>

      <ImagePreview
        ref={demo1Ref}
        images={SINGLE_GALLERY}
        visible={demo1Visible}
        defaultIndex={demo1Index}
        initialMode="fit"
        firstZoomInStrategy="above-fit"
        zoomOutBelowMinBehaviour="noop"
        arrows="both"
        closeOnMaskClick
        wheelEnabled
        doubleClickEnabled
        switchImageResetTransform
        language={previewLanguage}
        onClose={() => setDemo1Visible(false)}
      />

      <ImagePreview
        images={multiFolderImages}
        groups={folderGroupDefs}
        visible={demo2Visible}
        defaultIndex={demo2Index}
        initialMode="fit"
        firstZoomInStrategy="above-fit"
        zoomOutBelowMinBehaviour="noop"
        arrows="side"
        wheelEnabled
        doubleClickEnabled
        switchImageResetTransform
        showFlip
        language={previewLanguage}
        onClose={() => setDemo2Visible(false)}
      />

      <ImagePreview
        images={largeGalleryItems}
        visible={demo3Visible}
        defaultIndex={demo3Index}
        initialMode="fit"
        firstZoomInStrategy="above-fit"
        zoomOutBelowMinBehaviour="noop"
        arrows="both"
        closeOnMaskClick
        wheelEnabled
        doubleClickEnabled
        language={previewLanguage}
        onClose={() => setDemo3Visible(false)}
      />
    </div>
  );
}
