# ImagePreview — Props & Ref API

[English](./api.md) · **中文**

---

## `<ImagePreview>` Props

### 数据

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `src` | `string` | — | 单张图片 URL（`images` 或非空 `groupedImages` 优先） |
| `alt` | `string` | — | 单张图片 alt |
| `minimapSrc` | `string` | — | 仅单图：小地图图片 URL（默认同 `src`）；若设 `minimap` 则忽略 |
| `minimap` | `React.ReactNode` | — | 仅单图：自定义小地图内容（覆盖 `minimapSrc`） |
| `images` | `ImageItem[]` | — | 扁平多图；无非空 `groupedImages` 时 `src`/`alt` 被忽略；若与非空 `groupedImages` 同时传入则忽略 `images`（开发环境 `console.warn`） |
| `groupedImages` | `ImageGroup[]` | — | 文件夹式分组；各组 `images` 按顺序拼接；优先于 `images`/`src`；←/→ 与按住连切沿**扁平列表跨组**；工具栏上一组/下一组（及 PageUp/PageDown）跳到组首 |
| `visible` | `boolean` | — | 受控可见性 |
| `defaultGroupedSelection` | `DefaultGroupedSelection` | — | 非空 `groupedImages` 时的初始 `{ defaultGroupIndex, defaultIndexInGroup }`（组下标只计非空组）；覆盖 `defaultIndex` |
| `defaultIndex` | `number` | `0` | 扁平列表中的初始下标；与分组同时设置 `defaultGroupedSelection` 时忽略 |

### 缩放配置

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `stops` | `NativePercent[]` | `[10,25,50,75,100,125,150,175,200]` | 离散档位列表（升序，至少 1 项）；需要更高上限请传入自定义列表 |
| `smallImageZoom` | `SmallImageZoomOptions` | 不启用 | 主图实际长边 ≤ `maxEdge` 时，仅增加 `maxNativePercent` 这一档；例如 `{ maxEdge: 64, maxNativePercent: 1600 }` |
| `fitMaxNativePercent` | `number` | `100` | 独立 Fit 上限；省略或非法值回退到 100%，同时不超过当前有效最高档位 |
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
| `clickZoomEnabled` | `boolean` | 自动开启 | 单击与 Space 共用自适应循环；显式值优先，省略时仅显式 `doubleClickEnabled={true}` 选择旧模式 |
| `doubleClickEnabled` | `boolean` | 旧模式下 `true` | 显式开启可保留双击 Fit ↔ 100%；单击模式开启时忽略 |
| `switchImageResetZoom` | `boolean` | `true` | 切图时重置缩放（锁定状态下此项被覆盖） |
| `switchImageResetTransform` | `boolean` | `false` | 切图时重置旋转和翻转 |
| `fitResetPan` | `boolean` | `true` | 调用适应时重置平移 |
| `closeOnMaskClick` | `boolean` | `false` | 点击图片/工具栏以外的暗色遮罩是否关闭预览 |
| `overlayClassName` | `string` | — | 附加到遮罩元素的 CSS 类名 |
| `overlayStyle` | `React.CSSProperties` | — | 合并到遮罩元素的内联样式（在默认样式之后合并，优先级更高） |

### UI 配置

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `arrows` | `'both' \| 'side' \| 'toolbar' \| 'none'` | `'both'` | 仅控制**图片两侧**箭头；见下表（非空 `groupedImages` 时工具栏上一张/下一张始终显示） |
| `showFlip` | `boolean` | `false` | 是否显示水平/垂直翻转按钮 |
| `showRotateCCW` | `boolean` | `true` | 是否显示逆时针旋转按钮；隐藏后仍可通过 Shift+R 操作 |
| `showExif` | `boolean` | `false` | 是否在工具栏显示 EXIF / 元数据开关 |
| `initialExifOpen` | `boolean` | `false` | 开启 `showExif` 时是否默认展开 EXIF 面板 |
| `showDelete` | `boolean` | `false` | 是否显示删除按钮；宿主须在 `onDeleteImage` 中更新列表 |
| `showMinimap` | `boolean` | `true` | 主图超出视口时是否显示右下角导航小地图（拖动虚线框平移） |
| `showThumbnails` | `boolean` | `false` | 预览层内底部横向缩略图条；可导航图片 ≤ 1 时自动隐藏 |
| `thumbnailsScope` | `'group' \| 'flat'` | `'group'` | `showThumbnails` 为 true 时条带展示范围；见下表 |
| `presentation` | `'overlay' \| 'contained'` | `'overlay'` | `overlay` 全屏对话框；`contained` 填满已定位宿主 |
| `preloadRadius` | `number` | `1` | 相邻主图**字节**预加载半径；`0` 关闭。单独开启不会跳过渐进占位 |
| `preloadDisplaySlots` | `number` | `0` | display-ready 邻居上限。`0` 且提供预算时上限为 6，实际张数由预算决定 |
| `preloadDisplaySettleMs` | `number` | `600` | 切图后防抖：停稳这么久才开始预热**邻居**（连切会取消未启动的预热）。**不**延迟当前主图解码 |
| `holdMinVisibleMs` | `number` | `NAV_HOLD_MIN_VISIBLE_MS` | 按住 ←/→：第一次立即切一张；之后每张需主区域**已呈现**可看位图（缩略 underlay 或无缩略时的原图）满此时长，且仍按住才再切。仅有布局尺寸不计时。松开取消定时器，**不堆积**步进。不传则用库默认值。 |
| `preloadMemoryBudgetBytes` | `number` | — | **邻居**解码字节预算（不含当前主图）。推荐由 Tauri 传入；浏览中 props 可固定 |
| `estimateDecodedBytes` | `(item) => number` | EXIF 宽×高×4 或 12MP 估算 | 预算用体积估算 |
| `preloadDisplayMode` | `'slot' \| 'decode'` | `'slot'` | `'slot'` = 离屏 img（C）；`'decode'` = 仅 decode（B 降级） |
| `onPreloadIndexesChange` | `(indexes: number[]) => void` | — | 可选：当前计划预加载的扁平下标 |
| `onPreloadStatusChange` | `(status: NeighborPreloadStatusMap) => void` | — | 含 `display-ready`（decode 完成，切图快开：无 dwell/转圈，占位保留到可绘制）。字节 `ready` ≠ 可秒开 |
| `showThumbnailPreloadStatus` | `boolean` | `false` | 底片条：**蓝** = 邻居槽位内且已 decode；加载中灰/绿进度；**绿** = 字节就绪 / 会话 warm；**当前张无底条** |
| `showSwitchLoader` | `boolean` | `true` | 切图等待下一张可绘制时显示中央圆环 Loading；`false` 只隐藏转圈，不影响托底 / 揭开时机 |
| `chrome` | `'default' \| 'minimal'` | `'default'` | `minimal` 空闲时控件完全隐藏 |
| `index` | `number` | — | 受控扁平下标 |
| `toolbarExtra` | `ReactNode` | — | 工具栏末尾自定义内容 |
| `language` | `string` | `'en'` | 界面语言：内置 `en`、`zh`（按主语言子标签匹配，如 `zh-CN` → `zh`） |

#### `arrows` 取值说明

| 值 | 效果 |
|----|------|
| `'both'` | 图片两侧箭头 **+** 扁平列表时工具栏上一张/下一张（默认） |
| `'side'` | 仅两侧箭头；扁平列表时工具栏仍有上一张/下一张，**序号在二者之间** |
| `'toolbar'` | 仅工具栏上一张/下一张；无两侧箭头 |
| `'none'` | 无两侧箭头；键盘 ← → 仍可用；扁平列表时工具栏仍有上一张/下一张与序号 |

当提供了非空 **`groupedImages`** 时，**工具栏上一张/下一张始终显示**；`arrows` 只控制**两侧**箭头。

#### `showThumbnails` / `thumbnailsScope`

| `thumbnailsScope` | 效果 |
|-------------------|------|
| `'group'`（默认） | 分组时仅**当前组**；扁平列表为整表。跳组后条带随之切换。 |
| `'flat'` | **整段扁平导航序列**（与 ←/→ / `onIndexChange` 一致）。当 `entryCount > visibleCapacity × 3` 时窗口虚拟化（`visibleCapacity = max(1, floor(viewportWidth / tileStride))`）。 |

瓦片图：`ImageItem.minimapSrc` 优先，否则 `src`。少量瓦片居中胶囊；较多时全宽底栏横向滚动。

#### 相邻预加载说明

- **字节预热**（`preloadRadius`）：仅 `Image()` 拉取。条带上的 `ready` / `warm` 表示字节可能已缓存——**不足以**跳过渐进主图。
- **Display-ready**（`preloadDisplaySlots` > 0）：load + `decode()`（`preloadDisplayMode="slot"` 时还有离屏 `<img>`）。`display-ready` 为确切状态；切到该项走快开（无人工占位停留 / 无中央 loading），**仍保留** `minimapSrc` 占位直到视口主图可绘制。邻居预热受 `preloadDisplaySettleMs`（默认 600ms）防抖：连切不会为每一跳解码。
- **内存**：组件不读设备内存。宿主（如 Tauri）应传入 `preloadMemoryBudgetBytes`（可用 `suggestPreloadMemoryBudgetBytes`），并尽量提供宽高。**Media Lens 接入清单：** [`media-lens-integration.zh-CN.md`](./media-lens-integration.zh-CN.md)。
- **降级**：`preloadDisplayMode="decode"` 保持同一短路契约，但不常驻合成层。

#### `presentation` 说明

| 值 | 行为 |
|----|------|
| `'overlay'`（默认） | `fixed` 全屏、`dialog` + `aria-modal`、打开时聚焦、窗口级键盘 |
| `'contained'` | `absolute; inset: 0`；宿主须定位并设尺寸；`region`；仅聚焦在预览内时响应键盘 |

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
| `onDeleteImage` | `(index: number, item: ImageItem) => void` | 用户删除当前图时触发（需 `showDelete`）。宿主必须更新列表。 |

---

## 类型定义

```typescript
interface ImageItem {
  id?: string; // 稳定主键（如路径）；身份请优先于 name
  src: string;
  alt?: string;
  name?: string; // 工具栏信息栏显示的文件名
  minimapSrc?: string; // 导航小地图 URL；默认 src；若设 minimap 则忽略
  minimap?: React.ReactNode; // 自定义小地图；覆盖 minimapSrc
}

interface ImageGroup {
  id?: string; // 可选稳定主键（目录/相册）
  name: string; // 文件夹名，显示在文件名下方
  images: ImageItem[];
}

interface DefaultGroupedSelection {
  /** 仅统计 `images.length > 0` 的组，顺序同 `groupedImages` */
  defaultGroupIndex: number;
  /** 在该组 `images` 内的从 0 开始的下标 */
  defaultIndexInGroup: number;
}

type ArrowsConfig = 'both' | 'side' | 'toolbar' | 'none';

interface ZoomState {
  mode: 'fit' | 'native';
  /** 当前 Native 百分比（mode=native 时有效） */
  nativePercent: number;
  /** Fit 等效 Native%（适应模式下工具栏数字区显示 `xx%`；档位菜单中 Fit 行显示「适应 (约 xx%)」） */
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
  setNative(percent: number): void; // 有限正数，统一限制在当前图片的最高档位

  // 旋转与翻转
  rotateCW(): void;       // 顺时针 90°
  rotateCCW(): void;      // 逆时针 90°
  flipHorizontal(): void;
  flipVertical(): void;

  // 图片导航
  next(): void;            // 扁平列表下一张（有 groupedImages 时会跨组）
  prev(): void;            // 扁平列表上一张
  nextGroup(): void;       // 跳到下一组第一张
  prevGroup(): void;       // 跳到上一组第一张
  goTo(index: number): void; // 跳到扁平下标（截断）

  // 浏览器全屏
  requestFullscreen(): Promise<boolean>;
  exitFullscreen(): Promise<void>;
  isFullscreen(): boolean;

  // 状态读取
  getState(): ZoomState;
}
```

---

## 另见

- [主图显示与切图主流程](./main-display-flow.zh-CN.md) — 先缩略占位再揭开原图、长停留后快开、连按节奏。
- [小地图视口拖动](./minimap.zh-CN.md) — WebView 指针行为与基于雅可比的 1:1 平移。
- [Media Lens 接入清单](./media-lens-integration.zh-CN.md) — Tauri 内存预算与推荐 props。

## 自适应观察（0.8.0 引入，以下为当前行为）

- `clickZoomEnabled?: boolean` 当前默认开启；显式值优先，省略时仅显式 `doubleClickEnabled={true}` 选择旧模式。单击与 Space 共用自适应循环；忽略控件输入、Space repeat 和修饰键；开启时不再执行旧的双击切档。`clickZoomEnabled={false}` 保留旧双击与 Space Fit ↔ 100%；同时将 `doubleClickEnabled` 设为 false 可关闭鼠标换档。
- `fitMaxNativePercent?: number` 当前默认 100，让小图保持实际尺寸并使用 `Fit/100% → 200% → Fit`；省略、非正数或非有限值回退到 100%，同时不超过当前有效最高档位。200% 观察档也受最高档位限制。需要初始放大小图可显式传更高 Fit 上限。
- Detail 为 `sqrt(Fit% × 100)` 取最近 5%，只有与两端均至少相差 1.5 倍才保留。Fit≈100% 时使用 200%；循环外手动倍率下一次回 Fit。
- Fit 可用滚轮和工具栏直接缩小；最高档放大保持有界且不反向跳变。`setNative` 忽略非正数与非有限值。
- `language` 支持英文、简中、繁中及 script/region 别名，显式 script 优先；热切换保留浏览状态。观察缩放不显示悬浮提示；`strings.zoomHint` 与 `strings.dragToPan` 保留兼容，但不再渲染。
- 邻图完成过解码不代表位图持续驻留；`preloadRadius={0}` 可关闭邻图工作。

## 本地未发布：宿主全屏适配

`fullscreen?: FullscreenAdapter` 将全屏操作交给宿主，适配器存在时不读写 DOM Fullscreen API。支持：

- 受控模式 `{ isFullscreen, enter, exit }`：宿主 Props 是唯一状态来源；Esc 先退出全屏，再次按才关闭预览。
- 纯切换模式 `{ toggle }`：适用于 VS Code 这类提供 toggle 命令、却没有可靠公开状态订阅的宿主。按钮始终标注“切换全屏”，可用 `strings.toggleFullscreen` 覆盖；不猜测状态，`isFullscreen()` 返回 false，ref 显式进入/退出报告不支持，Esc 保留关闭预览行为。

`onFullscreenError?: (error: unknown) => void` 报告宿主失败、浏览器能力缺失/拒绝及状态确认超时。进行中的请求去重；已处于本组件的浏览器全屏时，重复进入直接成功，不等待不存在的新事件；真正切换时等待 API 成功与 `fullscreenchange` 双重确认，整体 2s 超时覆盖 API Promise 永不结束的情况；卸载清理浏览器监听与计时器，并阻止被保留的旧方法再启动浏览器或宿主全屏动作。以上为本地未发布能力，已发布 0.8.0 尚不包含。

### 受控底片条（本地未发布）

`showThumbnailToggle?: boolean` 显示工具栏开关，默认 false。宿主控制 `showThumbnails`，通过
`onThumbnailsVisibleChange(visible)` 接收切换意图，自行保存偏好。`onThumbnailVisibleIndexesChange(indexes)`
报告已挂载底片的扁平索引（含 overscan）；关闭或不足两项时报告 []，用于有界的按需小图生成。

`ImageItem.thumbnailSrc?: string | null` 专用于底片。省略时保留旧的 minimap/原图回退；明确传 null
显示占位，绝不请求原图。`thumbnailError?: boolean` 表示宿主生成失败，图片加载失败同样变成占位，
仍可点击切换主图。组件不负责生成、文件系统或缓存。开启时从主图视口预留底片高度，Fit 随测量适配，
主动缩放比例和旋转保持；小图 URL 完成不会让用户手动滚动的底片条重复居中。

### 悬停提示

关闭、上一张/下一张、放大/缩小、旋转、删除、全屏等直观操作仅保留无障碍名称，不再弹出悬停文字。翻转方向、组导航、适应视口/100%、缩放输入与档位、缩放锁定、EXIF、底片条和小地图继续保留必要说明。简单操作的旧 `tip*` 语言字段为类型兼容保留，但这些按钮不再渲染它们。

### 固定快捷键集成（本地未发布）

- `keyboardEnabled?: boolean` 默认 true；false 暂停键盘动作并释放长按切图。
- `onShowShortcuts?: () => void` 由 ? 调用，宿主提供只读帮助按钮与弹窗。
- 平移说明按八个方向各占一行，`direction` 为 up/down/left/right/upLeft/upRight/downLeft/downRight；行标识使用 `direction || action`，`action` 仍为 `pan`。
- `getPreviewShortcutHelp(capabilities)` 从运行时固定表生成 `{ action, direction?, keys }[]`；`navigation`、`groups`、`exif`、`delete`、`shortcuts` 为可选能力标志，仅支持的功能传 true。
- 未引入可配置键位或用户设置。完整表见[键盘快捷键](./keyboard.zh-CN.md)。

## 有限缩放边界

最高有效档位现在统一约束滚轮、键盘、工具栏、输入框、双指和 `setNative`，不再对双指额外乘以 4。Fit 也不会超过该上限；`fitMaxNativePercent` 可继续设置更低的 Fit 上限。双指仍连续变化，手动输入仍接受档位间的有限倍率；“档位”指步进和菜单预设。

`smallImageZoom` 默认关闭。启用后只信任当前主图的实际固有尺寸，尺寸未知、EXIF、缩略占位或上一张图片均不触发例外。切图或参数变化导致上限降低时立即夹紧倍率，缩放锁不能绕过上限；回到较高上限时不自动恢复被夹紧的旧倍率。这也将此前允许超过最高档位的 `setNative` 调用改为夹紧，其他宿主需要更高倍率时应显式配置档位或小图例外。
