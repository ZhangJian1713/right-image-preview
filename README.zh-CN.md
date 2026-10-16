# right-image-preview

## DOM 渲染与自适应观察

使用 DOM `<img>` 渲染图片，通过 URL 形式的 `src` 接收主图资源，
通过可选的 `minimapSrc` 接收预览图或小地图资源。

```tsx
<ImagePreview
  src="/photo.jpg"
  visible={open}
  onClose={() => setOpen(false)}
  clickZoomEnabled
  fitMaxNativePercent={100}
  doubleClickEnabled={false}
  preloadRadius={0}
  language="zh-TW"
/>
```

`clickZoomEnabled` 默认关闭；开启后单击和 Space 共用 Fit → 有意义的 Detail
中间档 → 100% → Fit 循环。Fit 上限为 100% 的小图使用 Fit/100% → 200% → Fit。
鼠标缩放保持光标锚点，Space 保持视口中心。拖动与双击序列不会额外推进倍率。
Fit 上限是独立配置，省略或传入非法值时，使用当前有效最高档位作为上限。
滚轮及工具栏继续使用各自的固定档位。

内置英文、简体中文和繁体中文。更新 `language` 或 `strings` 保留当前图片及浏览状态，
短时缩放提示也支持文案覆盖。

邻图预加载保留为可选的尽力优化。`preloadRadius={0}` 关闭邻图工作；DOM 的
display-ready 记录不能保证浏览器仍保留解码位图。宿主未验证保活效果前，建议从关闭
预加载的基线接入。失败邻图不会在同一窗口内无限立即重试。

[English](./README.md) · **中文**

## 在线演示

**👉 [https://zhangjian1713.github.io/right-image-preview/](https://zhangjian1713.github.io/right-image-preview/)**

在浏览器中打开交互式演示（右上角可切换 **EN / 中文**），无需本地安装。

> 无 UI 库依赖的 React 图片预览组件，原生支持固定档位缩放（Lightroom 式）、多图/多组导航、翻转旋转、键盘快捷键与自动渐隐控件。

---

## ✨ 特性

| 能力 | 说明 |
|------|------|
| **Fit / Native 双模式** | `fit` 以 contain 语义完整显示图片；`native` 以原始像素为 100% 基准 |
| **固定档位缩放** | 放大/缩小只在离散档位间跳转（默认 10 %–200 %）；可用 **`stops`** 自定义 |
| **缩放输入** | 输入正整数 %；输入框、`ref` 和双指缩放统一受有效最高档位限制 |
| **多图 / 多组导航** | 支持单组图片列表，也支持按文件夹/分组组织的多组图片 |
| **翻转 & 旋转** | 水平/垂直翻转，90° 顺/逆时针旋转，带 CSS 动画 |
| **缩放锁定** | 切换图片时可选择保留或重置缩放状态 |
| **智能侧边箭头** | 不可导航时箭头完全隐藏；组边界自动变为跳组按钮（双箭头） |
| **控件自动渐隐** | 3 秒无操作后控件渐隐至约 10% 透明度，任意活动立即恢复 |
| **导航小地图** | 主图溢出视口时右下角缩略图 + 可拖视口框；可通过 `showMinimap` 关闭 |
| **缩略图条** | `showThumbnails` 开启底部横向缩略图（默认关）。`thumbnailsScope="group"`（默认）分组时仅当前组；`"flat"` 为整段扁平序列（过长时窗口虚拟化） |
| **嵌入式模式** | `presentation="contained"` 填满宿主容器；仅聚焦时响应键盘 |
| **相邻预加载** | `preloadRadius` 字节预热；`preloadDisplaySlots` 保持离屏 decode 就绪（槽位数由宿主按内存决定）。`display-ready` 切图快开（占位保留到视口可绘制）；仅字节就绪不会快开 |
| **控件密度** | `chrome="minimal"` 空闲时控件完全隐藏 |
| **全屏适配** | 默认使用浏览器全屏，也可通过 `fullscreen` 交给宿主；只有 toggle 的宿主不会伪造全屏状态 |
| **受控下标** | `index` + `onIndexChange`；ref `goTo(index)` |
| **小地图独立图源** | 每条 **`ImageItem`**（及单图 **`src`** 模式）可设 **`minimapSrc`** / **`minimap`**，用小缩略图或自定义节点；默认仍用主图 **`src`** |
| **触控双指捏合缩放** | 双指捏合/展开实现连续缩放；缩放锚点跟随双指中点；可用 **`pinchEnabled`** 关闭 |
| **界面语言** | `language` 内置英文、简体中文和繁体中文；`strings` 可覆盖文案，切换语言保留当前浏览状态 |
| **丰富的键盘快捷键** | Esc / ±方向键 / Space / PageUp-Down / R、Shift+R / WASD、小键盘 |
| **可访问性** | Overlay：`role="dialog"` + `aria-modal` 与焦点管理；`presentation="contained"`：`role="region"`（非整页模态），仅预览聚焦时响应键盘。控件带 `aria-label` |
| **TypeScript 一等类型** | 完整类型导出，`forwardRef` 支持命令式 ref API |
| **零生产依赖** | React 与 ReactDOM 作为 peer dependencies；不内置第三方 UI 库或图片文件解析器 |
| **兼容性：React 17+** | 兼容 `react` / `react-dom` ≥ 17；库构建不内置 React，由宿主提供同一份运行时 |

---

## 快速开始

**在业务项目中使用**

```bash
npm install right-image-preview
```

**克隆本仓库**（演示页、测试、参与开发）

```bash
npm install
npm run dev       # 浏览器打开 http://localhost:5173
npm test
npm run build     # 演示站的 Vite 生产构建
```

浏览器访问 `http://localhost:5173`，页面**右上角**可切换 **EN / 中文**：
- **Demo 1**：单组相册，点击遮罩关闭，无翻转按钮
- **Demo 2**：多文件夹分组，侧边箭头，含翻转按钮
- **Demo 3**：先小图占位、再载入全图（渐进加载；滚轮/平移；演示资源走 CDN）
- **Demo 4**：宿主 EXIF + 删除
- **Demo 5**：嵌入式工作区 + 扁平缩略图条 + 相邻预加载 + minimal chrome

---

## 基本用法

```tsx
import { ImagePreview } from 'right-image-preview';

// 单张图片
<ImagePreview
  src="/photo.jpg"
  visible={open}
  onClose={() => setOpen(false)}
/>

// 多图列表
<ImagePreview
  images={[
    { src: '/a.jpg', name: 'a.jpg' },
    { src: '/b.jpg', name: 'b.jpg' },
  ]}
  visible={open}
  onClose={() => setOpen(false)}
  wheelEnabled
  doubleClickEnabled
  closeOnMaskClick
/>

// 多组（文件夹）图片
<ImagePreview
  groupedImages={[
    {
      name: '旅行/',
      images: [
        { id: 'travel/a', src: '/a.jpg', name: 'a.jpg' },
        { src: '/b.jpg', name: 'b.jpg' },
        { src: '/c.jpg', name: 'c.jpg' },
      ],
    },
    {
      name: '活动/',
      images: [
        { src: '/d.jpg', name: 'd.jpg' },
        { src: '/e.jpg', name: 'e.jpg' },
        { src: '/f.jpg', name: 'f.jpg' },
      ],
    },
  ]}
  visible={open}
  onClose={() => setOpen(false)}
  arrows="side"
  showFlip
/>
```

---

## API

> **完整权威说明：** [`docs/api.zh-CN.md`](./docs/api.zh-CN.md)（中文）/ [`docs/api.md`](./docs/api.md)（英文）。切图主流程（先缩略再原图）：[`docs/main-display-flow.zh-CN.md`](./docs/main-display-flow.zh-CN.md)。下表仅为速览，若有出入以 `docs/api` 为准。

### Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `src` | `string` | — | 单张图片 URL（提供 `images` 或非空 `groupedImages` 时忽略） |
| `minimapSrc` | `string` | — | 仅单图：小地图瓦片 URL（默认同主图 `src`）；设 `minimap` 时忽略 |
| `minimap` | `React.ReactNode` | — | 仅单图：自定义小地图（覆盖 `minimapSrc`） |
| `images` | `ImageItem[]` | — | 扁平多图列表（高于 `src`）；非空 `groupedImages` 时忽略（开发环境若同时传入可能 `console.warn`）；每项可带 `minimapSrc` / `minimap` |
| `groupedImages` | `ImageGroup[]` | — | 文件夹式分组；按顺序拼接各组的 `images`；优先级高于 `images` 与 `src` |
| `visible` | `boolean` | `true` | 控制预览显示/隐藏 |
| `defaultGroupedSelection` | `{ defaultGroupIndex, defaultIndexInGroup }` | — | `groupedImages` 模式下的初始图（组下标只计非空组）；优先于 `defaultIndex` |
| `defaultIndex` | `number` | `0` | 扁平列表中的初始下标；与分组同时传入 `defaultGroupedSelection` 时忽略 |
| `stops` | `number[]` | `[10,25,50,75,100,125,150,175,200]` | Native zoom 档位（%，升序）；需要更高上限请传入更长列表 |
| `smallImageZoom` | `SmallImageZoomOptions` | 不启用 | 主图实际长边 ≤ `maxEdge` 时，仅增加 `maxNativePercent` 这一档；例如 `{ maxEdge: 64, maxNativePercent: 1600 }` |
| `initialMode` | `'fit' \| 'native'` | `'fit'` | 初始缩放模式 |
| `initialNativePercent` | `number` | 第一档 | `initialMode='native'` 时的初始比例 |
| `firstZoomInStrategy` | `'above-fit' \| 'first-stop' \| 'hundred'` | `'above-fit'` | 从 Fit 首次放大时的入档策略 |
| `zoomOutBelowMinBehaviour` | `'fit' \| 'noop'` | `'noop'` | 缩小到最小档以下的行为 |
| `zoomInAtMaxBehaviour` | `'noop' \| 'notify'` | `'noop'` | 放大到最大档时的行为 |
| `wheelEnabled` | `boolean` | `true` | 是否启用滚轮缩放 |
| `doubleClickEnabled` | `boolean` | `true` | 双击切换 Fit ↔ 100% |
| `switchImageResetZoom` | `boolean` | `true` | 切图时是否重置缩放（锁定时被覆盖） |
| `switchImageResetTransform` | `boolean` | `true` | 切图时是否重置翻转/旋转 |
| `fitResetPan` | `boolean` | `true` | 切回 Fit 时是否归零平移 |
| `showFlip` | `boolean` | `false` | 是否显示翻转按钮 |
| `showRotateCCW` | `boolean` | `true` | 是否显示逆时针旋转按钮；隐藏后仍可通过 Shift+R 操作 |
| `showExif` | `boolean` | `false` | 是否在工具栏显示 EXIF / 元数据开关 |
| `initialExifOpen` | `boolean` | `false` | 开启 `showExif` 时是否默认展开 EXIF 面板 |
| `showDelete` | `boolean` | `false` | 是否显示删除按钮；宿主在 `onDeleteImage` 中更新列表 |
| `arrows` | `'both' \| 'side' \| 'toolbar' \| 'none'` | `'both'` | 仅控制**两侧**箭头；非空 `groupedImages` 时工具栏上一张/下一张始终显示 |
| `initialZoomLocked` | `boolean` | `false` | 初始是否锁定缩放 |
| `closeOnMaskClick` | `boolean` | `false` | 点击遮罩区域是否关闭预览 |
| `onClose` | `() => void` | — | 关闭回调 |
| `onZoomChange` | `(state: ZoomState) => void` | — | 缩放状态变化回调 |
| `onIndexChange` | `(index: number) => void` | — | 图片索引变化回调 |
| `onMaxStopReached` | `() => void` | — | 到达最大档位回调（需配合 `'notify'`） |
| `onImageError` | `(index: number, src: string) => void` | — | 当前图片加载失败时的回调，接收图片扁平下标与 `src` URL |
| `errorFallback` | `(index: number, src: string) => ReactNode` | — | 图片加载失败时居中渲染的自定义占位内容；导航到其他图片后错误状态自动重置 |
| `pinchEnabled` | `boolean` | `true` | 是否启用双指捏合缩放（触屏 / 多点触控板） |
| `strings` | `Partial<LocaleStrings>` | — | 覆盖任意 UI 文案字段；叠加在 `language` 所选语言之上；只需提供要改的字段 |

### 宿主接入

原生全屏执行、缩略图生成和快捷键帮助弹窗由宿主负责。仅提供切换命令的宿主可传入 `fullscreen={{ toggle: toggleHostFullscreen }}`；能够可靠读取状态的宿主可传 `{ isFullscreen, enter, exit }`。失败通过 `onFullscreenError` 通知；未配置适配器时使用浏览器全屏 API。

通过 `showThumbnailToggle` 显示独立底片条按钮，并用 `showThumbnails` / `onThumbnailsVisibleChange` 控制开关。根据 `onThumbnailVisibleIndexesChange` 上报的挂载窗口（含少量预留项）按需请求缩略图，再通过每张图片的 `thumbnailSrc` 回填。等待或不可用时设为 `null`，可阻止组件回退到原图；`thumbnailError` 表示失败占位。组件不负责生成 200px 文件，也不决定生成并发数，这些属于宿主策略。`thumbnailsScope="group"` 仅显示当前组，`"flat"` 显示整个扁平序列。

用 `onShowShortcuts` 打开宿主弹窗，通过 `getPreviewShortcutHelp` 生成只读键位说明；弹窗接管键盘时设置 `keyboardEnabled={false}`，也可同时暂停 `wheelEnabled` 和 `pinchEnabled`。翻转按钮的 `showFlip` 和逆时针旋转按钮的 `showRotateCCW` 仍由宿主独立配置。回调和默认值见[完整 API](./docs/api.zh-CN.md)。

#### `arrows` 取值说明

| 值 | 效果 |
|----|------|
| `'both'` | 两侧箭头 **+** 扁平列表时工具栏上一张/下一张（默认） |
| `'side'` | 仅两侧箭头；扁平列表时工具栏仍有上一张/下一张，序号在中间 |
| `'toolbar'` | 仅工具栏上一张/下一张；无两侧箭头 |
| `'none'` | 无两侧箭头；键盘 ← → 仍可用；扁平列表时工具栏仍有上一张/下一张与序号 |

传入非空 **`groupedImages`** 时，工具栏上一张/下一张**始终显示**；本表只约束**两侧**箭头。

### 类型定义

```ts
interface ImageItem {
  id?: string;   // 稳定主键（如路径）；身份识别请优先于 `name`
  src: string;
  alt?: string;
  name?: string; // 工具栏信息栏显示的文件名
  minimapSrc?: string;
  minimap?: React.ReactNode;
  thumbnailSrc?: string | null; // 仅底片图源；null 禁止回退原图
  thumbnailError?: boolean;    // 失败占位仍可点击切图
}

interface ImageGroup {
  id?: string;   // 可选稳定主键（如目录路径）
  name: string;  // 组名，显示在文件名下方
  images: ImageItem[];
}

interface DefaultGroupedSelection {
  defaultGroupIndex: number;   // 仅统计非空组，顺序同 `groupedImages`
  defaultIndexInGroup: number; // 在该组 `images` 内的 0-based 下标
}

interface ZoomState {
  mode: 'fit' | 'native';
  nativePercent: number;
  fitEquivalentNativePercent?: number; // 供 UI 显示"适应 ≈ xx%"
}
```

包内还导出 **`resolvePreviewImages`**、**`flattenGroupedImages`**、**`resolveDefaultGroupedFlatIndex`**、**`FlattenedGroupSlice`** 与 **`DefaultGroupedSelection`**，便于在组件外复用相同的扁平列表与组内下标范围。**`resolveStrings`** 与 **`mergeStrings`** 也一并导出，可用于在组件外以编程方式构建自定义 locale 对象。

### Ref API

```ts
const ref = useRef<ImagePreviewRef>(null);

interface ImagePreviewRef {
  // 缩放
  zoomIn(): void;
  zoomOut(): void;
  fit(): void;
  setNative(percent: number): void; // 有限正数，统一限制在当前图片的最高档位

  // 变换
  rotateCW(): void;
  rotateCCW(): void;
  flipHorizontal(): void;
  flipVertical(): void;

  // 导航
  next(): void;
  prev(): void;
  nextGroup(): void;
  prevGroup(): void;

  // 状态读取
  getState(): ZoomState;
}
```

---

## 键盘快捷键

支持 Q/E 切图、Home/End、R/Shift+R 旋转、F 全屏、WASD/数字小键盘平移以及 ? 打开宿主帮助。
Ctrl/⌘/Shift + 方向键组合由宿主处理。平移按八个方向分别说明。完整键位与生效条件见[键盘快捷键说明](./docs/keyboard.zh-CN.md)。
宿主可用 `getPreviewShortcutHelp` 生成只读说明；不提供自定义快捷键设置。

---

## 项目结构

[内部结构与状态职责](docs/component-architecture.zh-CN.md)。

```
src/
  components/ImagePreview/
    index.ts / types.ts        # Public exports and props/ref contract
    model/                     # Geometry and stage model types
    shell/                     # Entry, composition, fullscreen and chrome timing
    stage/                     # Main decode, progressive display and frame handoff
    preload/                   # Neighbor bytes, slots and memory budget
    interaction/               # Keyboard, pointer, wheel, pinch and hold navigation
    transform/                 # Zoom, pan, orientation and coordinate math
    controls/                  # Toolbar, filmstrip, minimap, EXIF and buttons
    i18n/                      # Locale contracts and built-in strings
    lib/                       # Data helpers and small shared utilities
    imagePreviewTuning.ts      # Existing timing and layout constants
  App.tsx                      # 演示页外壳
  demos/                       # 各 Demo 与演示站文案（不打进 npm 包）
docs/
  main-display-flow.zh-CN.md / .md   # 主图显示与切图主流程（先缩略再原图）
  api.md / api.zh-CN.md              # Props & Ref API 参考
  media-lens-integration.zh-CN.md    # Media Lens（Tauri）接入清单
  media-lens-integration.md          # English checklist
  keyboard.md / keyboard.zh-CN.md   # 键盘快捷键说明
  requirements.md                    # 需求迭代记录
tests/
  setup.ts                     # Vitest + jsdom 配置
  useZoomState.test.ts         # 缩放状态机单元测试
  flattenGroupedImages.test.ts
  locale.test.ts               # Locale / mergeStrings 单元测试
  injectGlobalStyle.test.ts
  ImagePreview.test.tsx        # 组件集成测试
```

---

## 缩放算法

```
fitScale   = min(containerW / naturalW, containerH / naturalH)
nativeScale = nativePercent / 100

CSS transform scale（fit）    = fitScale
CSS transform scale（native） = nativeScale × (naturalW / layoutW)
                              ≈ nativePercent / 100

fitEquivalentNativePercent    = fitScale × 100（供 UI 显示"适应 ≈ xx%"）
```

---

## 有限缩放边界

滚轮、键盘、工具栏、输入框、双指和 `setNative` 共用最高有效档位作为上限。Fit 也受该上限约束；`fitMaxNativePercent` 可设置更低的 Fit 上限。双指连续变化，手动输入接受档位间的有限倍率；“档位”指步进和菜单预设。

`smallImageZoom` 默认关闭。启用后只信任当前主图的实际固有尺寸，尺寸未知、EXIF、缩略占位或上一张图片均不触发例外。切图或参数变化导致上限降低时立即夹紧倍率，缩放锁不能绕过上限；回到较高上限时不自动恢复被夹紧的旧倍率。`setNative` 请求超过上限时会限制到该上限；需要更高倍率时，应显式配置档位或小图例外。

组件默认档位最高为 **200%**。通过 `stops` 和 `smallImageZoom`，可配置为普通图片最高 **800%**、小图额外提供 **1600%** 一档：

```tsx
<ImagePreview
  src="/icon.svg"
  visible
  stops={[10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 600, 800]}
  smallImageZoom={{ maxEdge: 64, maxNativePercent: 1600 }}
  fitMaxNativePercent={100}
/>
```

小图的额外预设为 1600%；连续双指缩放和手动输入可使用上限内的中间倍率。只有原图加载后的实际尺寸能够启用小图例外，缩略图或未知尺寸不能启用。

## License

MIT © [ZhangJian](https://github.com/ZhangJian1713)
