# 组件内部结构与状态职责

目录整理保持单个 `right-image-preview` npm 包和 DOM `<img>` 渲染路线；之后的有限缩放功能新增 `smallImageZoom`，API 与行为变更见 `api.zh-CN.md`。入口仍是 `src/components/ImagePreview/index.ts`；内部文件路径不属于包的公开 API。宿主继续负责文件系统、缩略图生成、VS Code 消息和窗口全屏，组件负责展示与交互。

## 目录边界

路径相对于 `src/components/ImagePreview/`。

| 目录 / 文件 | 职责 |
| --- | --- |
| `index.ts`、`types.ts` | 对外导出与 props/ref 契约；内部模块直接引用实际模块，不通过入口绕行 |
| `model/` | 尺寸、变换、图层与访问身份等共享类型；不依赖 React Hook 或 UI |
| `shell/` | 触发方式、整体组合、宿主全屏适配、控件显示计时 |
| `stage/` | 当前图、渐进占位、解码订阅、旧帧托底与揭开时机 |
| `preload/` | 邻图字节预热、展示槽位、停稳和内存预算 |
| `interaction/` | 键盘、指针、滚轮、双指和长按输入 |
| `transform/` | 缩放状态、锚点、平移、旋转、镜像及坐标数学 |
| `controls/` | 工具栏、底片条、小地图、EXIF、按钮和提示 |
| `i18n/` | 字符串接口、内置语言和合并规则 |
| `lib/`、`imagePreviewTuning.ts` | 小型基础工具、数据整理及现有调节常量；避免继续把功能逻辑堆入 lib |

分类以状态归属为依据，不要求 UI 文件互相完全隔离。邻图预热可复用 `stage/imagePreviewDecode.ts` 的解码工具，但不控制当前图的托底和揭开。共享类型从 `model/` 取得，不从组件或 Hook 的实现文件反向导入。

## 一次切图的状态

`stage/stageHandoff.ts` 提供纯转换函数，`stage/useStageHandoff.ts` 连接 React 与已提交的 DOM。

- `visit`：本次选中的图片和索引。每次选择生成不同身份，A→B→A 中两次 A 不相同。
- `presented`：上次提交时记录的全尺寸画面位置、尺寸和变换，用于下一次切走时冻结。
- `outgoing`：新图尚未揭开时继续盖住舞台的旧帧。它可能和 `visit` 是不同图片。
- `mainPainted` / `underlayPainted`：本次访问是否收到了相应位图的就绪通知；它们不单独证明用户已经看见这一帧。
- `frozen`：有限数量的旧图姿态；不是图片位图缓存，不决定预加载预算。

例如 A 已经显示，选 B 后又立即选 C：B 即使已下载，也不能替换盖在上面的 A；C 能显示后才撤下 A。回到仍然保留的 A 时，不让 A 同时成为当前图和旧图托底。

切图前的用户导航事件先冻结当前画面，再重置缩放、平移和方向。受控宿主尚未更新索引时保留这个快照，不能把仍是当前图的帧当作已经揭开的旧帧清掉。宿主直接改变受控 `index` 时，从最后提交的 `presented` 计算托底。渲染过程中只进行当前组件自身的条件状态调整，不修改共享 Map、DOM 或 `ref.current`。

`presented` 使用 React 自身的条件状态调整，与尺寸、索引或 CSS transform 的变化一起提交；被 React 放弃的渲染也会丢弃其中的快照。只有本次访问的 `mainPainted` 已成立才允许记录，防止沿用上一张的尺寸。纯转换中的相等判断避免循环更新，不额外通过布局 Effect 再提交一次姿态。它不是第二套活动变换状态，也不能改回渲染时修改共享 ref。

## 异步与资源清理

- `useMainImageDecode` 的订阅属于一次已提交的 `visit`。换图、重新建立订阅或卸载时取消旧回调；浏览器的解码 Promise 本身通常不能中止。
- `useProgressiveMainImage` 接收同一个选择身份；旧会话在布局清理时立即失效，避免普通 Effect 清理前的旧探针回写。
- `imagePreviewDecode` 按 DOM 元素及其 `src` 共享解码，调用方可单独取消。最后一个订阅者离开时清除超时器；底层解码可以继续，但不会继续持有该订阅者的回调。超时只允许尽力展示，不记作成功解码缓存。
- `useStageReveal` 管理舞台可见性、揭开和两帧动画计时；撤下旧帧保持新图可见，换图或卸载取消旧动画帧。
- 长按“已显示”的确认仍由 `useHoldStagePresented` 完成，使用解码和两帧确认；加载通知不能直接开始下一次长按切图。

## 验证与后续范围

状态转换测试覆盖 A→B→C 托底、A→B→A 过期事件和元数据容量；解码与揭开测试覆盖共享订阅、取消、超时、元素换源、StrictMode 重放和动画清理。组件集成测试继续覆盖受控 / 非受控切图与旧帧位置，扩展用构建产物验证 React 17。

`ImagePreviewInner` 仍负责组合较多 UI，尚不是一个很短的文件。后续优先按实际改动抽出明确职责，避免仅为降低行数拆成大量透传组件。`Minimap`、坐标变换和渐进探针仍可独立优化；本轮不引入插件系统、新依赖或新的配置对象。

设计参考：React 的 [不需要 Effect 的场景](https://react.dev/learn/you-might-not-need-an-effect) 与 [自定义 Hook](https://react.dev/learn/reusing-logic-with-custom-hooks)，以及 Yet Another React Lightbox 的 [模块边界](https://yet-another-react-lightbox.com/advanced)。仅参考组织方式，不引入其运行时或替换现有组件。

## 有限缩放策略

`transform/zoomStops.ts` 统一清理档位并根据主图实际尺寸追加一个小图上限。原图尺寸与 src 一起记录，只有 `useMainImageDecode` 的主图加载通知可更新，渐进布局和缩略加载不参与判断。状态、Fit、手势、工具栏共用同一份有效档位；降低上限在当前组件的条件状态更新中完成，无额外同步 Effect。
