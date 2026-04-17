# 小地图视口拖动（设计说明）

本文说明导航小地图在嵌入式浏览器（如 VS Code / Cursor WebView）以及**旋转**后主视图下为何这样实现，供维护 `Minimap.tsx` / `minimapMath.ts` 时查阅。

## 目标

- 拖动小地图上的视口框时，在 minimap 坐标系里与指针 **1:1** 跟手。
- **抬起指针**后（包括“按下再松开、几乎没移动”），必须退出 **grabbing** 状态并卸掉移动监听。
- **点击虚线框以外**（压暗的缩略图区域）：主视图**瞬间**平移，使该点落在视口**中央**（`minimapInnerToNatural` + `translateForViewportCentreOnNatural`，再经与拖动相同的小地图平移夹紧）。**不松开按键**会继续同一套窗口级拖动会话，与直接拖虚线框一致，无需松手再对准框拖。

## 问题一：一直像“抓住”、松手还在拖

**现象：** 只点按一下再松开，手型仍像抓住；有时松手后虚线框仍跟着指针跑，且位移倍数不对。

**原因：** 在 **`pointerdown`** 上调用了 **`preventDefault()`**。在 Chromium 系宿主里，这会**抑制兼容鼠标事件**（包括 **`mouseup`**）。旧实现里对鼠标依赖 **`mouseup`** 结束拖动，于是：

- **`mouseup` 永远不来** → 监听不拆 → **`viewportDragging` 一直为 true**。
- **`mousemove` 仍可能派发** → 每次移动继续 `pan` → 倍数异常、“松手还在拖”。

**正确做法：** 拖动会话**只**用 **Pointer Events**：在 `window` 上 **capture** 阶段监听 **`pointermove` / `pointerup` / `pointercancel`**；可在手柄上 **`setPointerCapture`**；并保留 **`window` `blur`** 时强制收尾。

**不要**在已对 **`pointerdown`** 调用 **`preventDefault()`** 的前提下，再指望 **`mouseup`** 结束手势。

## 问题二：虚线框比指针快（例如约 3 倍）

**现象：** 拖动时平移被放大，**有旋转**时更明显。

**原因：** 曾用 **`kx = cw / bw`**（以及 `ch/bh`），其中 **`bw`/`bh`** 是视口四边形在 minimap 上的**轴对齐包围盒（AABB）**边长。旋转后，AABB 在某一轴上可以**远窄于**“容器平移 ↔ minimap 上位移”的真实比例，导致 **`kx` 过大** → 同样指针位移对应过大的 `pan`。

**正确做法：** 不要用四边形 AABB 当增益。对**视口中心**在 minimap 上的位置，建立 **`(tx, ty)`** 的线性近似：用 **`tx`/`ty` 的微小扰动**数值估计雅可比 **`J`**，再 **`[dtx,dty]^T = J^{-1}[dmx,dmy]^T`**，使指针位移 **`(dmx,dmy)`**（与未单独缩放的 minimap 下即 client 增量一致）与视口中心在 minimap 上的运动一致。中心点映射到 natural 时**不做边界裁剪**，避免在贴边时导数突变。

实现见 **`minimapMath.ts`** 中的 **`panDeltaFromMinimapPointerDelta`**。

## 若再次出现比例不对

- 若 minimap 外层有 **`transform: scale` / `zoom`**，client 增量与 SVG 用户单位可能不一致：应先按 **`inner 尺寸 / getBoundingClientRect()`** 把 **`(dmx,dmy)`** 换算到 inner 空间，再调用 **`panDeltaFromMinimapPointerDelta`**。

## 与拖动大图的平移限制对比

参数集中在 **`src/components/ImagePreview/imagePreviewTuning.ts`**。

小地图触发的 `panByDelta` 使用 **`MINIMAP_PAN_MAX_VIEWPORT_BACKGROUND_FRACTION`**（默认每轴最多约 **10%** 视口可露磨砂底，对应最小覆盖率 **`MINIMAP_PAN_MIN_VIEWPORT_COVERAGE`**）。特别细长的图仍可能露得更多——模型受 **`scaledDim/2`** 限制。

**直接拖动大图**使用 **`MAIN_DRAG_MIN_VIEWPORT_COVERAGE`**（默认每轴 **50%**），更松。

## 问题三：小地图缩略图整块发黑（嵌入式 WebView）

**现象：** 主图正常，但右下角导航缩略图里只有黑底（有时白框还在）。

**原因：** 曾在压暗「视口外」区域时使用 SVG **`<mask>`** + **`url(#id)`** 作用在叠在 HTML **`<img>`** 上的 `<rect>`。部分嵌入式 Chromium（尤其是 **VS Code webview**）对这种与 `<img>` 的合成处理有缺陷，遮罩层可能把整张缩略图挡死。

**做法（两档）：**（1）视口四边形**与坐标轴对齐**时（常见为 **0°** 旋转），用 **四条 `<rect>`** 条带压暗上/下/左/右，不用 mask、不用复合 path。（2）**有旋转**时仍用 **`fill-rule="evenodd"`** 的单 `<path>`（外矩形减内四边形），在桌面 Chromium 上可靠。

## 相关文件

- `src/components/ImagePreview/Minimap.tsx` — 视图与指针会话生命周期。
- `src/components/ImagePreview/minimapMath.ts` — 坐标变换与基于雅可比的平移增量。
