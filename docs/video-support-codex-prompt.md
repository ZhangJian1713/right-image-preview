# 视频支持：工程任务书 / Codex 完整提示词

> 这是一份可以直接交给 Codex 执行的提示词。目标是让现有的媒体查看器**在看图片的同时能顺便看视频**，而不是实现一个通用播放器。范围被刻意压得很窄，请严格遵守第 7 节的"明确不做"清单，不要自行扩展。

---

## 0. 任务上下文

你要改造的是 `right-image-preview` 这套 React 媒体预览组件的源码。它可能位于独立仓库，也可能已经被迁入 Tauri 客户端项目中作为内部模块——**下文所有路径均相对于组件根目录** `components/ImagePreview/`（原仓库中为 `src/components/ImagePreview/`）。

**开始编码前，先完整阅读这些文件并输出一份简短的勘察结论，再动手：**

- `core/media-kind.ts`、`core/media-source.ts`、`core/use-detected-media-kind.ts`、`core/acquire-media-for-detection.ts`、`core/use-media-source-url.ts`、`core/media-contract.ts`
- `renderers/MediaStage.tsx`、`renderers/media-capabilities.ts`、`renderers/video/VideoViewer.tsx`、`renderers/video/zoomPan.ts`
- `shell/ImagePreviewInner.tsx`、`useImagePreviewKeyboard.ts`、`types.ts`
- `docs/api.md`（公开 API 的权威来源，README 的属性表不完整且滞后）
- `docs/rendering-architecture.md`

### 关键约束变更（务必先确认）

原仓库的 `package.json` 里有 `size-limit: 50 kB` 的硬门禁，CI 会执行 `npm run size`。**这个约束已经作废**：最终产品是 Tauri 桌面客户端，代码本地加载，包体不再是设计约束。请把 size-limit 上调到 `70 kB` 或直接从 CI 中移除，**不要为了迁就旧预算而牺牲实现质量**。其余工程约束（TypeScript strict、仅内联样式、函数组件 + hooks、`npx tsc --noEmit` 通过、`npm test` 通过、覆盖率 50% 门槛）继续保持。

---

## 1. 背景与定位

宿主是一个 Tauri 桌面客户端，用于浏览本地媒体文件夹，已在 10 万级图片规模上验证可用。用户的文件夹里照片和视频天然混在一起（同一次旅行、同一天、按时间穿插），因此**混合列表必须共用同一套导航、键盘、工具栏和全屏**，不能让用户在两个查看器之间切换。

静态位图走 WebGL2 管线（纹理 LRU、解码 Worker 池、三级 LOD、GPU 字节预算）。**视频完全不复用这套引擎**——它的像素由浏览器解码器直接送进合成器。视频只复用「壳」：导航与分组、工具栏、键盘模型、全屏适配、控件自动淡出、底部缩略图条、i18n、`MediaSource` 契约、transform 状态。

请在实现时始终记住这条边界：**视频是挂在同一个壳上的第二个渲染分支，不是位图管线的扩展。**

Tauri 的自定义协议已确认支持 HTTP Range 请求，视频可以正常流式播放与跳转。

---

## 2. 核心决策（不要推翻，不要"优化"）

### 2.1 范围：满足 80–90% 的真实需求即可

目标用户是拍照摄像的人。他们的素材来自相机（Sony/Canon/Nikon/松下 出 MP4 或 MOV）、手机（iPhone 出 MOV，HEVC 或 H.264）、无人机与运动相机（大疆、GoPro 出 MP4）。

**必须支持：** MP4 与 MOV（H.264 / HEVC + AAC），WebM（VP9/VP8 + Opus/Vorbis）顺带支持。
**明确不支持：** MKV、AVI、WMV、FLV、MPEG-1/2、ProRes、DNxHD、各类 RAW 视频、HLS、DASH。

MKV 尤其要注意：浏览器基本放不了它。Firefox 和 Safari 完全不解 Matroska；Chromium 因为 WebM 是 Matroska 子集，有时能出画面，但 MKV 常见的 AC3/DTS 音轨不被支持，结果是**有画面无声音**——这比干脆失败更糟。所以 MKV 必须走"明确拒绝"路径，给出可读的提示（例如"浏览器不支持此封装格式"），而不是交给一个会半残的 video 元素。

### 2.2 播放器：原生 `<video>`，第一版直接用原生 `controls`

**不要引入 Video.js、Plyr 或任何播放器框架。** 理由：这类库不增加任何编解码能力，它们只是 `<video>` 加 MSE 之上的 UI 与插件层；同一个 MP4，原生能放的它们能放，原生放不了的它们也放不了。它们的主要价值（统一皮肤、HLS/DASH 插件）对一个本地文件浏览器为零，而将来要在进度条上叠加自定义 UI 时，它们的 DOM 与 CSS 体系反而是阻碍。

第一版直接用 `<video controls>`：进度条拖动、全屏、播放暂停、音量全部由浏览器免费提供，零实现成本。自绘控制条推迟到后续版本再做（见第 7 节）。

### 2.3 能力：只需要基础播放

需要的：播放、暂停、拖动进度条、全屏、音量、上一个/下一个（复用壳里已有的导航）。
不需要的：多音轨、字幕轨、章节、播放列表、投屏、画质切换。**这个软件不是要重新实现 PotPlayer。**

### 2.4 缩略图：第一版不打包 ffmpeg

因为范围已被限定为"只支持 WebView 能播的格式"，所以 **WebView 自己就能抽帧**——能播的必然能抽，覆盖率天然是 100%。用 `<video>` 定位到目标时间点、`drawImage` 到 canvas、导出为 WebP、由宿主落盘缓存。

这样第一版就完全不需要 ffmpeg，从而省掉几十上百 MB 的二进制分发、三平台构建、macOS 公证，以及 ffmpeg 的 LGPL/GPL 授权合规问题。

抽帧必须**按需触发**：只为真正滚动进视野的条目生成（复用已有的 `onThumbnailVisibleIndexesChange` 回调），不做全量预生成。

---

## 3. Phase 0：必须先修的既有缺陷

这四条与视频功能本身无关，但只要视频一上线就会立刻暴露。**必须先修，且每条都要有测试覆盖。**

### 3.1【阻断级】歧义 URL 会把整个视频下载进内存

`core/use-detected-media-kind.ts` 中，当 `kind` / MIME / 扩展名都给不出结论时（`hinted === 'unknown'`），若源是 URL 就会调用 `acquireMediaForDetection`，后者通过 Worker 用 `acquireMediaBlob` **把整个响应体拉成一个 Blob** 再嗅探。这对 JPEG 是"避免二次请求"的优化，对一个数 GB 的 4K 视频是必然的内存耗尽。

会命中这条路径的情况：无扩展名的 URL、签名 URL、CDN 路径、`.3gp` / `.ts` / `.m4s` 等不在扩展名表里的后缀。

**修法：** 歧义 URL 先用已有的 `readMediaSourcePrefix`（它已经是 Range 请求，`bytes=0-131071`，只拉 128 KB）做前缀嗅探，只有当嗅探结果是 `raster` 或 `animated-image`——即真正能从"整包已在内存"中获益的类型——才升级为整包获取。嗅到 `video` 就原样返回 url 源，绝不整包下载。`sniffIsoBaseMedia` 读 `ftyp` 只需要前 16 字节，128 KB 完全够用。

再加一道 `contentLength` 阈值兜底：超过某个上限（例如 64 MB）一律不整包获取，无论嗅探结果是什么。

### 3.2【阻断级】blob / bytes 源用于视频等于整个文件常驻内存

`core/use-media-source-url.ts` 对 `blob` / `bytes` 源会 `createObjectURL`。object URL 本身可以 seek，但字节已经全部在内存里了。

**修法：** 视频必须使用 `type: 'url'` 的源。宿主传入 File 时应由宿主先转成 object URL 或走自定义协议。库侧检测到 `kind === 'video'` 且源为 `blob` / `bytes` 时，发出一条可诊断的告警或类型化错误，不要静默接受。

### 3.3 mkv / avi / mpeg 被误判为可播

`core/media-kind.ts` 的 `VIDEO_EXTENSIONS` 目前包含 `mkv`、`avi`、`mpeg`、`mpg`、`ogv`。它们会被路由到 `VideoViewer`，而 `VideoViewer.tsx` 的 `onError` 只抛一句 `'Unable to load video source'`，用户无法区分是文件损坏还是格式不支持。

**修法：** 按"容器可播性"分层。能播的进 video 渲染路径；不能播的判为不支持，并携带足以让 UI 说清原因的错误信息。

### 3.4 库内 `MediaSource` 类型与 DOM 的 MSE 接口撞名

`core/media-source.ts` 导出的 `MediaSource` 是本库的源联合类型，与 DOM 的 `MediaSource`（Media Source Extensions）同名。视频代码需要用 `MediaSource.isTypeSupported()` 做能力探测时，两者在同一文件里极易写错且 TypeScript 未必报错。

**修法：** 视频相关代码一律通过 `globalThis.MediaSource` 访问 DOM 接口，并加注释固化这个约定。**不要重命名库的公开类型**，那是无谓的破坏性变更。

---

## 4. Phase 1：视频渲染器

### 4.1 能力矩阵放开

`renderers/video/zoomPan.ts` 中的 `VIDEO_CAPABILITIES` 目前只开了 `zoom`，其余全关。但 `pan`、`rotate`、`flip`、`nativeZoom` 本质上都是同一个 CSS transform，实现成本几乎为零，关着反而是残缺体验（缩放后无法平移；手机竖拍和行车记录仪素材方向错误无法纠正）。

目标状态：`zoom`、`nativeZoom`、`pan`、`rotate`、`flip` 全部开启；`minimap` 保持关闭（它需要静态位图源，收益低于复杂度）。

`nativeZoom` 的 1:1 语义是把 `videoWidth` / `videoHeight` 对齐到设备像素，与位图路径一致。

注意：视频**没有 LOD 可言**，解码出多少像素就是多少像素，放大超过 100% 必然是插值放大会变糊。这不是缺陷，但要在 `docs/api.md` 里写明，避免被当成 bug。

### 4.2 封面复用 `previewSource`

`ImageItem.previewSource` 的既有语义是"宿主提供的、有尺寸上限的主舞台预览图"，视频封面完全契合这个定义。**直接复用，不要新增 `posterSource` 字段。**

好处是它还能走现有的 WebGL 位图管线作为底图：切到一个视频时先秒显封面、立刻可缩放，视频就绪后再接管——与图片的渐进式体验完全一致。

### 4.3 能力探测与类型化错误

播放前按以下顺序探测，任一环节判定不可播就走明确失败路径，不要让用户面对一个黑框：

1. `globalThis.MediaSource.isTypeSupported(mime)` —— 返回布尔值，比 `canPlayType` 严格可靠。
2. `navigator.mediaCapabilities.decodingInfo()` —— 传入 contentType、宽高、码率、帧率，拿回 `supported` / `smooth` / `powerEfficient`。
3. `video.canPlayType(mime)` —— 仅作前两者不可用时的兜底。

注意 contentType **必须带 codecs 参数**才有意义，例如 `video/mp4; codecs="avc1.640028, mp4a.40.2"`；只传 `video/mp4` 得到的答案没有参考价值。codecs 串由宿主提供，或从容器前缀中解析。

在 `core/media-contract.ts` 的 `MediaError.code` 联合类型中新增视频相关的 code（例如 `codec-unsupported`、`container-unsupported`、`video-decode-failed`），让宿主能区分处理。现有的 `onMediaError` / `mediaErrorFallback` 契约保持不变。

### 4.4 preload 分级

墙上与非当前项一律 `preload="metadata"` 甚至 `"none"`；只有当前聚焦项才 `preload="auto"`。`preload="auto"` 乘以几十个条目就是网络与磁盘缓存灾难。

### 4.5 键盘模型

当前壳用 ←/→ 切换上一个下一个，但视频场景中用户的第一直觉是用 ←/→ 跳转进度。

**规则：** 当前媒体是视频时，←/→ 归播放器做 5 秒跳转；切换条目改用 PageUp / PageDown，同时保留 Shift + ←/→ 作为切换的备用键位。空格键播放/暂停。

**这条规则必须同步写入 `docs/keyboard.md` 和 `docs/keyboard.zh-CN.md`**，否则会成为长期的困惑来源。

### 4.6 卸载要彻底

仅调用 `pause()` 不会释放解码器。切换条目或卸载时必须：清空 `src`、调用 `load()`、撤销 object URL。否则会缓慢泄漏直到应用卡死。

---

## 5. Phase 2：缩略图与封面抽帧

在宿主侧（Tauri 应用层，不是组件库内）实现，或作为组件库的独立可选导出——**不要进主渲染路径**。

### 5.1 抽帧流程

`<video preload="metadata">` → 定位到目标时间点 → 等待帧真正呈现 → `drawImage` 到小尺寸 canvas → `convertToBlob({ type: 'image/webp' })` → 交宿主落盘缓存。

**严格串行**，同时只允许一个抽帧任务在跑，避免并发解码器耗尽。

### 5.2 三个必须处理的坑

**第 0 秒往往是黑帧。** 很多视频以淡入开场。定位到时长的 10% 左右或固定的 1–3 秒，抽完之后采样一下亮度，过暗就换一个时间点重试。

**canvas 会被跨源污染。** Tauri 的自定义资源协议与应用本身**不同源**，`drawImage` 之后取数据会抛 `SecurityError`。解法是在协议响应上设置正确的 CORS 头，并给 video 元素加 `crossOrigin="anonymous"`。**这一条请在实现抽帧之前先单独验证通过**，否则会浪费大量调试时间。

**`seeked` 事件不代表画面已经画好。** 用 `video.requestVideoFrameCallback()` 等到真正呈现的那一帧再抽，否则会稳定抽到上一帧或空帧。

---

## 6. Phase 3：性能与硬件加速

**硬件加速无法从 JS 强制启用，也没有接口能确定地查询。** 能做的只有三件事：挑大概率被硬解的编码、避开会抵消硬解优势的写法、跑起来之后测量并降级。

- `decodingInfo()` 返回的 `powerEfficient` 在主流实现中实际反映的就是"是否走硬件解码路径"。它不是规范承诺的语义，但目前没有更好的替代，可作为准入判断。
- 播放中用 `video.getVideoPlaybackQuality()` 的 `droppedVideoFrames` / `totalVideoFrames` 监控丢帧率，持续超过约 10% 时主动降级或提示。
- **绝不要为了播放而逐帧 `drawImage` 到 canvas**，那会强制 GPU→CPU 回读，硬解优势瞬间归零。canvas 只用于一次性抽帧。
- 克制使用 `will-change: transform`，在多个条目上常驻会造成合成层爆炸。

一帧 3840×2160 的 RGBA 约 33 MB，解码器还要保留若干参考帧，一路 4K 解码的工作集通常在数百 MB 量级。单路 4K 在现代硬件上完全可以接受，**但必须保证同时只有一路在解码**。

`renderers/MediaStage.tsx` 已经在视频播放时暂停位图的 GPU 预加载，这个设计是正确的。**建议把暂停条件从"正在播放"放宽到"当前项是视频"**，因为暂停状态的视频同样占着解码器和缓冲。

平台差异：macOS 的 WKWebView 走 AVFoundation，HEVC 没问题，ProRes 的 MOV 也值得实测；Windows 的 WebView2 是完整 Chromium/Edge 媒体栈；**Linux 的 WebKitGTK 是弱点**，硬解取决于发行版的 GStreamer 插件是否齐全，需要单独验证并准备降级路径。

---

## 7. 明确不做（重要）

以下内容**本次一律不实现**，即使你认为很容易或很有价值。它们要么已被评估为负收益，要么属于后续版本：

- 自绘播放控制条（第一版用原生 `controls`；将来要做是为了在时间轴上叠加自定义 UI，不是为了好看）
- 墙上的悬停预览播放（YouTube 式）、雪碧图、动态缩略图
- 打包 ffmpeg、任何形式的转码或转封装（MKV 转封装是后续版本的事）
- HLS、DASH、MSE 分片播放
- 字幕轨、多音轨、章节（将来会做，但只在与本地 AI 生成能力结合时做，届时用原生 `<track>` + `TextTrack` API，不需要播放器框架）
- 画中画、投屏、倍速、循环等锦上添花的控件
- 小地图对视频的支持
- 把渲染器契约做成公开扩展点（`renderers` prop）——公开 API 一旦冻结就不能随便改，现在没有必要付这个成本
- 任何 AI 相关功能

---

## 8. 验收标准

1. 一个 4K 的 MP4（H.264）能正常播放、拖动进度条跳转、进入和退出全屏，切换到相邻条目再切回来不泄漏。
2. 播放期间进程内存稳定，**不出现整个文件被读入内存的迹象**（这是 Phase 0 第 3.1 条的直接验证）。
3. 一个无扩展名、无 MIME 提示的视频 URL 不触发整包下载，且被正确识别为 video。
4. MKV / AVI 文件给出明确的"不支持此封装格式"提示，而不是黑框或无声播放。
5. 视频可以缩放、平移、旋转、翻转，行为与图片一致。
6. 视频与图片混在同一个列表中，上一个/下一个导航连续可用，工具栏按能力矩阵正确禁用不适用的按钮。
7. 切到视频时先显示封面（`previewSource`），视频就绪后接管，中间不出现黑屏闪烁。
8. 位图的 GPU 预加载在当前项为视频时暂停，切回图片后恢复。
9. `npx tsc --noEmit` 通过，`npm run lint` 通过，`npm test` 通过，覆盖率不低于既有门槛。

---

## 9. 测试要求

jsdom 环境里没有真实的视频解码，因此自动化测试的重点放在**纯逻辑**上：

- 能力探测函数（给定 contentType / 探测结果，返回是否可播与错误 code）
- 容器分层判定（各扩展名与 magic bytes → 支持 / 不支持）
- Phase 0 第 3.1 条的嗅探路径：断言歧义视频 URL **不会**触发整包获取，且只发出 Range 请求
- 能力矩阵与工具栏按钮的启用/禁用映射
- 键盘路由：视频聚焦时 ←/→ 走跳转，PageUp/Down 走条目切换
- 卸载时的清理顺序（src 清空、load 调用、URL 撤销）

真实播放行为、硬件解码、抽帧质量需要人工验证或独立的端到端用例，不要为了凑覆盖率去 mock 一个假的视频解码器。

---

## 10. 执行顺序

先输出勘察结论与实施计划，确认后再编码。按 Phase 0 → Phase 1 → Phase 2 → Phase 3 的顺序推进，**Phase 0 必须独立成一批可审查的改动**，因为它修的是既有缺陷，即使后续阶段不做也应该合入。

每个 Phase 结束时跑一遍类型检查、lint 和测试，不要攒到最后。
