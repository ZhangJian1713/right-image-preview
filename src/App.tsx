import React, { useRef, useState } from 'react';
import { ImagePreview } from './components/ImagePreview';
import type { ImageGroup, ImageItem, ImagePreviewRef, ZoomState } from './components/ImagePreview';

// ── Demo 1：单组图片（风景摄影集） ──────────────────────────────────────────
const SINGLE_GALLERY: ImageItem[] = [
  { src: 'https://picsum.photos/seed/sg-mtn/1920/1280', alt: '山间云雾', name: 'mountain-mist.jpg' },
  { src: 'https://picsum.photos/seed/sg-fst/1280/1920', alt: '竖幅树林', name: 'forest-portrait-this-is-a-very-very-long-long-file-name-so-that-it-can-be-tested-with-a-very-long-file-name.jpg' },
  { src: 'https://picsum.photos/seed/sg-cst/2400/1600', alt: '海岸线', name: 'coastline.jpg' },
  { src: 'https://picsum.photos/seed/sg-town/1600/1200', alt: '古镇街道', name: 'old-town.jpg' },
  { src: 'https://picsum.photos/seed/sg-sun/3000/2000', alt: '草原日落', name: 'grassland-sunset.jpg' },
];

// ── Demo 2：多文件夹图片（旅行相册） ────────────────────────────────────────
interface FolderGroup {
  name: string;
  images: ImageItem[];
}

const FOLDER_GROUPS: FolderGroup[] = [
  {
    name: '🏙 城市建筑',
    images: [
      { src: 'https://picsum.photos/seed/city-bld/1600/1000', alt: '现代楼群', name: 'buildings-01.jpg' },
      { src: 'https://picsum.photos/seed/city-sky/2000/1200', alt: '夜间天际线', name: 'skyline-night.jpg' },
      { src: 'https://picsum.photos/seed/city-aly/800/1200', alt: '街道小巷', name: 'alley.jpg' },
    ],
  },
  {
    name: '🌿 自然风光',
    images: [
      { src: 'https://picsum.photos/seed/nat-vly/2400/1600', alt: '山谷晨雾', name: 'valley-mist.jpg' },
      { src: 'https://picsum.photos/seed/nat-wfl/1800/1200', alt: '瀑布', name: 'waterfall.jpg' },
      { src: 'https://picsum.photos/seed/nat-fld/3200/2000', alt: '花田', name: 'flower-field.jpg' },
    ],
  },
  {
    name: '🌊 海洋沙滩',
    images: [
      { src: 'https://picsum.photos/seed/sea-wide/3000/1500', alt: '海天一色', name: 'ocean-wide.jpg' },
      { src: 'https://picsum.photos/seed/sea-rock/1200/1600', alt: '礁石近景（竖）', name: 'rocks-close.jpg' },
      { src: 'https://picsum.photos/seed/sea-bch/2000/1400', alt: '沙滩', name: 'beach.jpg' },
      { src: 'https://picsum.photos/seed/sea-fs/1600/1000', alt: '渔船日落', name: 'fishing-sunset.jpg' },
    ],
  },
];

// 将文件夹组展平为一维数组（只需要 ImageItem，不需要附加元数据）
const MULTI_FOLDER_IMAGES: ImageItem[] = FOLDER_GROUPS.flatMap((group) => group.images);

// 计算某文件夹第 imgIdx 张图片在展平数组中的全局下标
function getFlatIndex(folderIdx: number, imgIdx: number): number {
  let offset = 0;
  for (let i = 0; i < folderIdx; i++) offset += FOLDER_GROUPS[i].images.length;
  return offset + imgIdx;
}

// 从 FOLDER_GROUPS 生成 groups prop
const FOLDER_GROUP_DEFS: ImageGroup[] = FOLDER_GROUPS.map((group, gi) => ({
  name: group.name,
  start: getFlatIndex(gi, 0),
  end: getFlatIndex(gi, group.images.length - 1),
}));

// ── 通用样式常量 ────────────────────────────────────────────────────────────
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

// ── 缩略图卡片组件 ─────────────────────────────────────────────────────────
function ThumbCard({
  src,
  alt,
  label,
  onClick,
}: {
  src: string;
  alt: string;
  label: string;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      style={{
        ...cardStyle,
        borderColor: hover ? '#5865f2' : 'transparent',
        transform: hover ? 'scale(1.02)' : 'scale(1)',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      aria-label={`预览图片：${alt}`}
    >
      <img src={src} alt={alt} style={thumbImgStyle} />
      <div style={thumbLabelStyle}>{label}</div>
    </button>
  );
}

// ── ref 控制按钮行 ─────────────────────────────────────────────────────────
function RefBtn({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
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

function RefControls({ previewRef }: { previewRef: React.RefObject<ImagePreviewRef | null> }) {
  const [zoomInfo, setZoomInfo] = useState<ZoomState | null>(null);

  return (
    <section style={{ marginTop: 32 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#aaa', marginBottom: 10 }}>
        通过 ref 程序化控制（预览打开后可用）
      </h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <RefBtn label="放大" onClick={() => previewRef.current?.zoomIn()} />
        <RefBtn label="缩小" onClick={() => previewRef.current?.zoomOut()} />
        <RefBtn label="适应" onClick={() => previewRef.current?.fit()} />
        <RefBtn label="100%" onClick={() => previewRef.current?.setNative(100)} />
        <RefBtn label="200%" onClick={() => previewRef.current?.setNative(200)} />
        <RefBtn label="上一张" onClick={() => previewRef.current?.prev()} />
        <RefBtn label="下一张" onClick={() => previewRef.current?.next()} />
        <RefBtn label="顺时针旋转" onClick={() => previewRef.current?.rotateCW()} />
        <RefBtn label="水平翻转" onClick={() => previewRef.current?.flipHorizontal()} />
        <RefBtn
          label="读取状态"
          onClick={() => setZoomInfo(previewRef.current?.getState() ?? null)}
        />
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

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  // Demo 1 state
  const [demo1Visible, setDemo1Visible] = useState(false);
  const [demo1Index, setDemo1Index] = useState(0);
  const demo1Ref = useRef<ImagePreviewRef>(null);

  // Demo 2 state
  const [demo2Visible, setDemo2Visible] = useState(false);
  const [demo2Index, setDemo2Index] = useState(0);

  const openDemo1 = (idx: number) => { setDemo1Index(idx); setDemo1Visible(true); };
  const openDemo2 = (idx: number) => { setDemo2Index(idx); setDemo2Visible(true); };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f1117',
        color: '#e8e8e8',
        fontFamily: '"Inter", "PingFang SC", system-ui, sans-serif',
        padding: '40px 32px',
        maxWidth: 1200,
        margin: '0 auto',
      }}
    >
      {/* ── 页面标题 ─────────────────────────────────────────────────────── */}
      <header style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>ImagePreview 演示</h1>
        <p style={{ margin: '8px 0 0', color: '#666', fontSize: 14 }}>
          通用 React 图片预览组件 · 固定档位缩放 · 多图切换 · 键盘 / 滚轮 / 双击
        </p>
      </header>

      {/* ── 快捷键 ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 44 }}>
        {([
          ['Esc', '关闭'],
          ['+', '放大'],
          ['−', '缩小'],
          ['0', '适应'],
          ['1', '100%'],
          ['← →', '切换图片'],
        ] as [string, string][]).map(([key, desc]) => (
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

      {/* ════════════════════════════════════════════════════════════════════
          Demo 1：单组图片
      ════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 style={sectionHeadStyle}>Demo 1 · 单组图片</h2>
        <p style={sectionDescStyle}>
          适合相册、作品集等场景。5 张图片，比例各不相同（含竖图）。
          工具栏仅显示全局序号（2/5 这样），无文件夹信息。
        </p>
        <div style={gridStyle}>
          {SINGLE_GALLERY.map((img, i) => (
            <ThumbCard
              key={img.src}
              src={img.src}
              alt={img.alt ?? ''}
              label={img.name ?? img.alt ?? ''}
              onClick={() => openDemo1(i)}
            />
          ))}
        </div>

        {/* ref 控制面板只放在 Demo 1 */}
        <RefControls previewRef={demo1Ref} />
      </section>

      <hr style={dividerStyle} />

      {/* ════════════════════════════════════════════════════════════════════
          Demo 2：多文件夹图片
      ════════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 style={sectionHeadStyle}>Demo 2 · 多文件夹图片</h2>
        <p style={sectionDescStyle}>
          旅行相册场景，共 3 个文件夹 · 10 张图片。
          预览工具栏通过 <code style={{ color: '#8ec7ff' }}>countRender</code> 同时显示：
          文件夹名称、在文件夹内的序号（X/Y）以及全局序号（M/N）。
        </p>

        {/* 按文件夹分组展示缩略图 */}
        {FOLDER_GROUPS.map((group, gi) => (
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
                {group.images.length} 张
              </span>
            </div>
            <div style={gridStyle}>
              {group.images.map((img, ii) => (
                <ThumbCard
                  key={img.src}
                  src={img.src}
                  alt={img.alt ?? ''}
                  label={img.name ?? img.alt ?? ''}
                  onClick={() => openDemo2(getFlatIndex(gi, ii))}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── ImagePreview 实例 ─────────────────────────────────────────────── */}

      {/* Demo 1：单组，两侧 + 工具栏箭头，点击遮罩关闭 */}
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
        onClose={() => setDemo1Visible(false)}
      />

      {/* Demo 2：多文件夹，仅侧边箭头 + 分组导航，显示翻转按钮 */}
      <ImagePreview
        images={MULTI_FOLDER_IMAGES}
        groups={FOLDER_GROUP_DEFS}
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
        onClose={() => setDemo2Visible(false)}
      />
    </div>
  );
}
