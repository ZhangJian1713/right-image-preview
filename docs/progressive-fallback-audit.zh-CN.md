# 渐进加载的 probe、降级和极小尺寸修复

> 历史记录：本文描述 0.10.1 的实现和当时验证。后续未发布改动已移除解码后的固定两帧及 100ms 兜底，保留解码确认；见 [帧等待必要性调查](./reveal-frame-wait-investigation.zh-CN.md)。下文保留原始记录。

日期：2026-10-25。目标版本：0.10.1。保留 `createImageBitmap` / `decode()`、解码期限、正常两帧保护及已有解码后 100ms 帧等待兜底。不修改宿主资源调度。

## 根因与处理

- 辅助原图 probe 未随视口原图完成而结束。其迟到成功可重写布局 / 占位阶段，失败或超时可将原图降为缩略。现在原图确认完成即清除辅助 probe 的期限、handlers 与自有 `src`；原图先于任一 probe 到达也能完成，不再反等辅助布局。占位停留继续按原配置执行。
- `thumb-only` 以前同时设置 `fullDecoded` 并卸掉整个显示子树，既没有主区缩略，又会将缩略尺寸登记为原图就绪。现在保留图层和原图节点，复用早期缩略 probe，缩略 DOM 实际 load 后可完成降级交接；不设置原图成功状态，不污染原图 ready / display-ready 缓存。DOM 原图 error 和缩略 error 也进入同一降级流程；双失败保留宿主错误占位。迟到原图可恢复，并以其真实尺寸重新布局。
- 交接 / 图层尺寸使用 `>1` 排除合法的 1×1、1×N、N×1。现在以正自然尺寸、实际加载、解码及本次访问身份判断，不把 CSS 1×1 保活盒当成加载证明。
- 离场、卸载和 StrictMode 重放集中清理本 visit 的辅助对象。正在显示的原图和邻图 DOM 不由这里取消；移除自有 probe 的 src 不保证浏览器取消共享请求，也不据此声称修复了已证实的内存泄漏。

状态职责见 [组件内部结构](./component-architecture.zh-CN.md)。

## 回归与浏览器证据

首批回归在修复前出现 10 项失败，分别覆盖原图完成后被 probe 逆转、缩略降级空白、probe 资源未清和三种 1 像素尺寸无法交接。永久测试位于 `tests/useProgressiveMainImage.test.ts`、`tests/progressiveLoadIdentity.test.tsx`、`tests/useStageReveal.test.tsx`；还覆盖 DOM-first / probe-first、真实解码 pending、占位停留、缓存、同步 probe、缩略失败、双失败、快速 A→B→C→A、排队旧事件、卸载与 StrictMode。

最终针对性回归共 11 文件、171 项通过；TypeScript、所改代码 ESLint、生产库构建与 diff whitespace 检查通过。

Chrome 156.0.8078.47 headless，1280×900。两份产物都用同一生产构建流程；对照为本轮开始前、已含帧等待兜底的本地版本，候选为本轮修复。没有拿 dev 构建与生产构建比较。冷加载关闭邻图预热、占位人为停留为 0；四种相同图片各运行三次，共 24 次。原图 load 到 full-ready 的中位耗时（ms）：

| 图片 | 修复前 | 修复后 |
| --- | ---: | ---: |
| 渐进 JPEG，7008×4672 | 150.8 | 146.5 |
| 普通 JPEG，7008×4672 | 85.2 | 88.9 |
| PNG | 25.7 | 27.9 |
| WebP | 26.1 | 28.0 |

每次仍只调用一次原图 Bitmap 确认。首轮每组就绪截图与 250ms 后像素一致，未见页面异常；不代表逐帧无异常，也不把逻辑就绪当作精确物理首帧。

连续切图另开相同上下文，开启 radius=1、displaySlots=2、settle=0。先等目标 slot 的 DOM load、display-ready 及当前 Bitmap 任务结束，再等 50ms；按 1→2→3→2→1→0 运行三轮，每版 18 步。以当前 URL、实际原图 complete、图层可见、underlay 已撤和 outgoing / loader 关闭判断完成，避免被旧版迟到 probe 回写阶段误导。

| 观察项 | 修复前 | 修复后 |
| --- | ---: | ---: |
| 18 步观察中位耗时 / 最大值（ms） | 13.5 / 128 | 16.5 / 177 |
| 原图网络请求累计 | 11 | 11 |
| 缩略网络请求累计 | 17 | 2 |
| Bitmap 调用累计 | 14 | 14 |
| 三轮 GC 后 JS heap（MB，十进制） | 4.57 / 4.85 / 4.77 | 4.56 / 4.72 / 4.78 |
| 三轮 GC 后 DOM nodes | 95 / 95 / 95 | 108 / 108 / 108 |

样本中常规加载没有明显回退；连续切图仍有调度 / 解码波动，候选的单次最大值更高，不能据此承诺所有图片或平台都不回退。heap 相近、节点没有逐轮持续增长；JS heap 不包含完整位图 / GPU 内存，样本也不足以证明长期无泄漏。该流程的请求数下降不代表所有宿主都会按相同比例减少请求。

受控浏览器场景同时验证迟到 probe、原图失败而缩略可用、双失败，以及独立 URL 的 1×1 / 1×1000 / 1000×1 SVG：旧版重现空主区和 outgoing 卡住，修复版分别保留原图、显示可用缩略、显示错误占位、正常交接极小图。失败降级截图中心为实际缩略的蓝色 `(0,85,255)`，迟到 probe 后仍为原图橙色 `(255,85,0)`，同时核对 DOM complete、opacity、loader 和 outgoing，并非只断言 stage 回调。

原始结果与产物哈希见 [JSON](./progressive-fallback-comparison-2026-10-25.json)，不含本地媒体路径或图片。临时脚本为 `/tmp/right-image-preview-decode-check/audit-normal-check.mjs`、`audit-browser-check.mjs`，产物和截图在 gitignored 的 `.local-pack/decode-check/` 或该临时目录，不进入 npm 包。

未验证真实 WKWebView、Safari、Windows/Linux 及宿主接包后的整体体验；没有把本次边界修复解释为宿主分钟级请求排队的根因。
