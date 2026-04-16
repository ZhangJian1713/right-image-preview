# right-image-preview

[English](./README.md) · **中文**

> 无 UI 库依赖的 React 图片预览组件，原生支持固定档位缩放（Lightroom 式）、多图/多组导航、翻转旋转、键盘快捷键与自动渐隐控件。

### **v0.0.7** 更新摘要

- **导航小地图**：主图放大超出视口时右下角出现缩略图，可拖动虚线框平移（可用 `showMinimap={false}` 关闭）。
- **缩放显示**：中间数字区更紧凑；**适应**模式下此处只显示**百分比**；档位菜单里 Fit 一行仍为 **「适应 (约 n%)」** 便于辨认。
- **`language`**：内置 **中/英** 界面文案切换。

---

## ✨ 特性

| 能力 | 说明 |
|------|------|
| **Fit / Native 双模式** | `fit` 以 contain 语义完整显示图片；`native` 以原始像素为 100% 基准 |
| **固定档位缩放** | 放大/缩小只在离散档位间跳转（默认 10 %–800 %），行为可预期 |
| **任意比例输入** | 缩放输入框支持直接输入任意正整数百分比，不限于预设档位 |
| **多图 / 多组导航** | 支持单组图片列表，也支持按文件夹/分组组织的多组图片 |
| **翻转 & 旋转** | 水平/垂直翻转，90° 顺/逆时针旋转，带 CSS 动画 |
| **缩放锁定** | 切换图片时可选择保留或重置缩放状态 |
| **智能侧边箭头** | 不可导航时箭头完全隐藏；组边界自动变为跳组按钮（双箭头） |
| **控件自动渐隐** | 3 秒无操作后控件渐隐至约 10% 透明度，任意活动立即恢复 |
| **导航小地图** | 主图溢出视口时右下角缩略图 + 可拖视口框；可通过 `showMinimap` 关闭 |
| **丰富的键盘快捷键** | Esc / ±方向键 / Space / PageUp-Down / Ctrl+方向键 |
| **可访问性** | `role="dialog"` + `aria-modal`，所有按钮带 `aria-label`，焦点管理 |
| **TypeScript 一等类型** | 完整类型导出，`forwardRef` 支持命令式 ref API |
| **零生产依赖** | 仅依赖 React，无任何第三方 UI 库 |

---

## 快速开始

```bash
npm install
npm run dev       # 开发服务器（含 Demo）
npm test          # 运行单元 & 集成测试
npm run build     # 生产构建
```

浏览器访问 `http://localhost:5173` 即可看到两个演示场景：
- **Demo 1**：单组图片，点击遮罩关闭，无翻转按钮
- **Demo 2**：多文件夹分组，侧边导航箭头，含翻转按钮

---

## 基本用法

```tsx
import { ImagePreview } from './components/ImagePreview';

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
  images={allImages}
  groups={[
    { name: '旅行/', start: 0, end: 2 },
    { name: '活动/', start: 3, end: 5 },
  ]}
  visible={open}
  onClose={() => setOpen(false)}
  arrows="side"
  showFlip
/>
```

---

## API

### Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `src` | `string` | — | 单张图片 URL（提供 `images` 时忽略） |
| `images` | `ImageItem[]` | — | 多图列表（优先级高于 `src`） |
| `groups` | `ImageGroup[]` | — | 图片分组定义（文件夹/相册） |
| `visible` | `boolean` | `true` | 控制预览显示/隐藏 |
| `defaultIndex` | `number` | `0` | 初始图片索引 |
| `stops` | `number[]` | `[10,25,50,100,200,400,800]` | Native zoom 档位（%，升序） |
| `initialMode` | `'fit' \| 'native'` | `'fit'` | 初始缩放模式 |
| `initialNativePercent` | `number` | 第一档 | `initialMode='native'` 时的初始比例 |
| `firstZoomInStrategy` | `'above-fit' \| 'first-stop' \| 'hundred'` | `'above-fit'` | 从 Fit 首次放大时的入档策略 |
| `zoomOutBelowMinBehaviour` | `'fit' \| 'noop'` | `'noop'` | 缩小到最小档以下的行为 |
| `zoomInAtMaxBehaviour` | `'noop' \| 'notify'` | `'noop'` | 放大到最大档时的行为 |
| `wheelEnabled` | `boolean` | `false` | 是否启用滚轮缩放 |
| `doubleClickEnabled` | `boolean` | `false` | 双击切换 Fit ↔ 100% |
| `switchImageResetZoom` | `boolean` | `true` | 切图时是否重置缩放（锁定时被覆盖） |
| `switchImageResetTransform` | `boolean` | `false` | 切图时是否重置翻转/旋转 |
| `fitResetPan` | `boolean` | `true` | 切回 Fit 时是否归零平移 |
| `showFlip` | `boolean` | `false` | 是否显示翻转按钮 |
| `arrows` | `'both' \| 'side' \| 'toolbar' \| 'none'` | `'both'` | 仅控制**两侧**箭头；有 `groups` 时工具栏上一张/下一张始终显示 |
| `initialZoomLocked` | `boolean` | `false` | 初始是否锁定缩放 |
| `closeOnMaskClick` | `boolean` | `false` | 点击遮罩区域是否关闭预览 |
| `onClose` | `() => void` | — | 关闭回调 |
| `onZoomChange` | `(state: ZoomState) => void` | — | 缩放状态变化回调 |
| `onIndexChange` | `(index: number) => void` | — | 图片索引变化回调 |
| `onMaxStopReached` | `() => void` | — | 到达最大档位回调（需配合 `'notify'`） |

#### `arrows` 取值说明

| 值 | 效果 |
|----|------|
| `'both'` | 两侧箭头 **+** 扁平列表时工具栏上一张/下一张（默认） |
| `'side'` | 仅两侧箭头；扁平列表时工具栏仍有上一张/下一张，序号在中间 |
| `'toolbar'` | 仅工具栏上一张/下一张；无两侧箭头 |
| `'none'` | 无两侧箭头；键盘 ← → 仍可用；扁平列表时工具栏仍有上一张/下一张与序号 |

传入 **`groups`** 时，工具栏上一张/下一张**始终显示**；本表只约束**两侧**箭头。

### 类型定义

```ts
interface ImageItem {
  src: string;
  alt?: string;
  name?: string; // 工具栏信息栏显示的文件名
}

interface ImageGroup {
  name: string;  // 组名，显示在文件名下方
  start: number; // 在 images 数组中的起始下标（含）
  end: number;   // 在 images 数组中的结束下标（含）
}

interface ZoomState {
  mode: 'fit' | 'native';
  nativePercent: number;
  fitEquivalentNativePercent?: number; // 供 UI 显示"适应 ≈ xx%"
}
```

### Ref API

```ts
const ref = useRef<ImagePreviewRef>(null);

interface ImagePreviewRef {
  // 缩放
  zoomIn(): void;
  zoomOut(): void;
  fit(): void;
  setNative(percent: number): void; // 接受任意正整数，不限于档位

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

| 按键 | 行为 |
|------|------|
| `Esc` | 关闭预览 |
| `+` / `=` / `↑` | 放大一档 |
| `-` / `↓` | 缩小一档 |
| `0` | 适应视口（Fit） |
| `1` | 原图 100% |
| `Space` | 切换 Fit ↔ 100% |
| `←` / `→` | 上一张 / 下一张 |
| `Ctrl/⌘ + ←` | 逆时针旋转 90° |
| `Ctrl/⌘ + →` | 顺时针旋转 90° |
| `PageUp` | 跳到上一组 |
| `PageDown` | 跳到下一组 |

> 任意按键操作均会重置控件自动渐隐计时器。

---

## 项目结构

```
src/
  components/ImagePreview/
    types.ts              # TypeScript 类型定义
    useZoomState.ts       # 缩放状态机 Hook（纯逻辑，无 DOM）
    useImageTransform.ts  # 尺寸测量 + CSS transform 计算 + 拖拽平移
    Toolbar.tsx           # 底部工具栏
    ImagePreview.tsx      # 主组件（遮罩/键盘/滚轮/双击/渐隐）
    index.ts              # 公开导出
  App.tsx                 # Demo 演示页面
docs/
  api.md / api.zh-CN.md          # Props & Ref API 参考
  keyboard.md / keyboard.zh-CN.md # 键盘快捷键说明
  requirements.md                 # 需求迭代记录
tests/
  setup.ts                # Vitest + jsdom 配置
  useZoomState.test.ts    # 状态机单元测试
  ImagePreview.test.tsx   # 组件集成测试
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

## 后续迭代方向

- 触控双指捏合手势（Pinch-to-zoom）
- 图片预加载策略（前后各预加载 N 张）
- 旋转 90°/270° 时的严格 1:1 约束（宽高调换）
- 弹簧物理动画（缩放/平移更自然的惯性）

---

## License

MIT © [YOUR_NAME](https://github.com/YOUR_GITHUB_USERNAME)
