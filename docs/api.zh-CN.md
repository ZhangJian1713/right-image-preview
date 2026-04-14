# ImagePreview — Props & Ref API

[English](./api.md) · **中文**

---

## `<ImagePreview>` Props

### 数据

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `src` | `string` | — | 单张图片 URL（`images` 优先） |
| `alt` | `string` | — | 单张图片 alt |
| `images` | `ImageItem[]` | — | 多图数组，提供后 `src`/`alt` 被忽略 |
| `groups` | `ImageGroup[]` | — | 图片分组定义（文件夹模式）；提供后左右箭头在组内导航，工具栏出现上一组/下一组按钮 |
| `visible` | `boolean` | — | 受控可见性 |
| `defaultIndex` | `number` | `0` | 初始显示的图片下标 |

### 缩放配置

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `stops` | `NativePercent[]` | `[10,25,50,100,200,400,800]` | 离散档位列表（升序，至少 1 项） |
| `initialMode` | `'fit' \| 'native'` | `'fit'` | 初始缩放模式 |
| `initialNativePercent` | `number` | 第一档 | `initialMode='native'` 时的初始百分比 |
| `firstZoomInStrategy` | `'above-fit' \| 'first-stop' \| 'hundred'` | `'above-fit'` | 从 Fit 首次放大时的落档策略 |
| `zoomOutBelowMinBehaviour` | `'fit' \| 'noop'` | `'noop'` | 缩小到最小档以下的行为 |
| `zoomInAtMaxBehaviour` | `'noop' \| 'notify'` | `'noop'` | 放大到最大档以上的行为 |
| `initialZoomLocked` | `boolean` | `false` | 初始锁定缩放（切图时保持当前缩放模式和比例） |

### 交互行为

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `wheelEnabled` | `boolean` | `false` | 滚轮缩放 |
| `doubleClickEnabled` | `boolean` | `false` | 双击鼠标在适应与 100% 间切换 |
| `switchImageResetZoom` | `boolean` | `true` | 切图时重置缩放（锁定状态下此项被覆盖） |
| `switchImageResetTransform` | `boolean` | `false` | 切图时重置旋转和翻转 |
| `fitResetPan` | `boolean` | `true` | 调用适应时重置平移 |
| `closeOnMaskClick` | `boolean` | `false` | 点击图片/工具栏以外的暗色遮罩是否关闭预览 |

### UI 配置

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `arrows` | `'both' \| 'side' \| 'toolbar' \| 'none'` | `'both'` | 导航箭头显示位置（见下方说明） |
| `showFlip` | `boolean` | `false` | 是否显示水平/垂直翻转按钮 |

#### `arrows` 取值说明

| 值 | 效果 |
|----|------|
| `'both'` | 图片两侧大箭头 **+** 工具栏内 prev/next 按钮（默认） |
| `'side'` | 仅图片两侧箭头；工具栏显示序号（含分组切换按钮） |
| `'toolbar'` | 仅工具栏 prev/next；不显示侧边箭头 |
| `'none'` | 无箭头；键盘 ← → 始终可用；工具栏显示序号和分组按钮 |

#### 侧边箭头智能行为

- 当该方向无法导航时，箭头**完全隐藏**（而非置灰）。
- 处于组边界且存在相邻组时，箭头自动替换为**双箭头**跳组按钮。

### 回调

| Prop | 类型 | 说明 |
|------|------|------|
| `onClose` | `() => void` | 关闭预览时触发 |
| `onZoomChange` | `(state: ZoomState) => void` | 缩放状态变化时触发 |
| `onIndexChange` | `(index: number) => void` | 切图时触发 |
| `onMaxStopReached` | `() => void` | 放大到最大档且 `zoomInAtMaxBehaviour='notify'` 时触发 |

---

## 类型定义

```typescript
interface ImageItem {
  src: string;
  alt?: string;
  name?: string; // 工具栏信息栏显示的文件名
}

interface ImageGroup {
  name: string;  // 文件夹名，显示在文件名下方
  start: number; // 在 images 数组中的起始下标（含）
  end: number;   // 在 images 数组中的结束下标（含）
}

type ArrowsConfig = 'both' | 'side' | 'toolbar' | 'none';

interface ZoomState {
  mode: 'fit' | 'native';
  /** 当前 Native 百分比（mode=native 时有效） */
  nativePercent: number;
  /** 当前 Fit 等效的 Native%（供 UI 显示"适应（约 xx%）"用） */
  fitEquivalentNativePercent?: number;
}
```

---

## `ImagePreviewRef` 方法

```typescript
interface ImagePreviewRef {
  // 缩放
  zoomIn(): void;
  zoomOut(): void;
  fit(): void;
  setNative(percent: number): void; // 接受任意正整数，不限于档位

  // 旋转与翻转
  rotateCW(): void;       // 顺时针 90°
  rotateCCW(): void;      // 逆时针 90°
  flipHorizontal(): void;
  flipVertical(): void;

  // 图片导航
  next(): void;            // 组内下一张（无分组则全局）
  prev(): void;            // 组内上一张
  nextGroup(): void;       // 跳到下一组第一张
  prevGroup(): void;       // 跳到上一组第一张

  // 状态读取
  getState(): ZoomState;
}
```
