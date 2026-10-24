# right-image-preview

## DOM rendering and adaptive observation

Images are rendered with DOM `<img>` elements. Pass image URLs through
`src` and optional preview/minimap URLs through `minimapSrc`.

```tsx
<ImagePreview
  src="/photo.jpg"
  visible={open}
  onClose={() => setOpen(false)}
  preloadRadius={0}
  language="zh-TW"
/>
```

By default, click and Space share an observation cycle: Fit → a meaningful
geometric-middle Detail scale → 100% → Fit. Small images default to
Fit/100% → 200% → Fit. Mouse zoom preserves the pointer anchor; Space preserves
the viewport center. Dragging and double-click sequences do not add extra zoom
steps. Fit defaults to a 100% cap, bounded by the effective highest stop; omitted
or invalid caps use this default. Set `fitMaxNativePercent` for a different cap.
Wheel and toolbar presets remain independent.

Existing callers that explicitly pass `doubleClickEnabled` (or `{true}`) retain legacy double-click and Space Fit ↔ 100% behavior. Setting `clickZoomEnabled={false}` also selects legacy mode. Set both props to false to disable mouse click/double-click zoom. Explicit `clickZoomEnabled={true}` takes priority over double-click configuration.

English, Simplified Chinese and Traditional Chinese are built in. Updating
`language` or `strings` preserves the active image and view state.

Neighbor loading remains optional and best effort. `preloadRadius={0}` disables
neighbor work; DOM display-ready records cannot guarantee that the browser still
retains a decoded bitmap. Use the disabled setting as a baseline in hosts where
retention has not been verified. Failed neighbors are not retried in a tight loop.

**English** · [中文](./README.zh-CN.md)

## Live Demo

**👉 [https://zhangjian1713.github.io/right-image-preview/](https://zhangjian1713.github.io/right-image-preview/)**

Open the interactive demo in your browser (toggle **EN / 中文** in the top-right). No install required.

> A dependency-free React image preview component with Lightroom-style discrete zoom stops, multi-group navigation, flip/rotate, keyboard shortcuts, and auto-fading controls.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Fit / Native zoom modes** | `fit` displays the image fully within the viewport (contain); `native` uses the image's original pixel dimensions as 100% baseline |
| **Discrete zoom stops** | Zoom in/out only jumps between configured stops (default: 10 %–200 %); override with **`stops`** |
| **Zoom field input** | Type a positive %; values are **clamped to the max configured stop** (shared by native ref actions and pinch) |
| **Multi-image / multi-group** | Supports a flat image list or images organized into folder-like groups |
| **Flip & Rotate** | Horizontal/vertical flip and 90° CW/CCW rotation with CSS animation |
| **Zoom lock** | Optionally preserve zoom state when switching images |
| **Smart side arrows** | Hidden when no navigation is possible; replaced by a group-jump button (double chevron) at group boundaries |
| **Auto-fade controls** | All controls fade to ~10 % opacity after 3 s of inactivity; any activity instantly restores them |
| **Navigation minimap** | Corner thumbnail + draggable viewport frame when the image overflows; optional via `showMinimap` |
| **Thumbnail strip** | `showThumbnails` shows a bottom horizontal thumb nav (off by default). `thumbnailsScope="group"` (default) lists the current group when grouped; `"flat"` lists the full flat sequence (window-virtualized when long) |
| **Contained / embedded mode** | `presentation="contained"` fills a host pane; keyboard only while focused |
| **Neighbor preload** | `preloadRadius` byte-prefetches neighbors; `preloadDisplaySlots` keeps decode-ready offscreen layers (host-sized from memory). `display-ready` uses fast reveal (underlay until viewport drawable); byte-ready alone does not |
| **Chrome density** | `chrome="minimal"` fades idle controls to fully hidden |
| **Fullscreen** | Browser fullscreen by default, or a host-owned `fullscreen` adapter; a toggle-only host does not claim confirmed fullscreen state |
| **Controlled index** | `index` + `onIndexChange`; ref `goTo(index)` |
| **Minimap source per item** | Each **`ImageItem`** (and single-**`src`** mode) can set **`minimapSrc`** / **`minimap`** so the map uses a lighter tile or custom node; defaults to the main **`src`** |
| **Touch pinch-to-zoom** | Two-finger pinch/spread for continuous zoom; anchor follows the midpoint between fingers; disable with **`pinchEnabled`** |
| **Localized toolbar** | **`language`** prop with built-in **English** and **Simplified Chinese** (`en`, `zh`, `zh-CN`, …); override individual strings with **`strings`** |
| **Rich keyboard shortcuts** | Esc · +/- · arrow keys · Space · PageUp/Down · R/Shift+R · WASD/numpad |
| **Accessibility** | Overlay: `role="dialog"` + `aria-modal` with focus management; `presentation="contained"`: `role="region"` (not page-modal), keyboard only while the preview is focused. Controls use `aria-label` |
| **TypeScript first** | Full type exports, `forwardRef` imperative ref API |
| **Zero production dependencies** | React and ReactDOM are peer dependencies; no runtime UI library or image-file parser is included |
| **React 17+** | Peer `react` / `react-dom` ≥ 17; the library build leaves React external so the host provides one runtime |

---

## Quick Start

**In your app**

```bash
npm install right-image-preview
```

**This repository** (demos, tests, contributing)

```bash
npm install
npm run dev       # demo at http://localhost:5173
npm test
npm run build     # Vite production build of the demo
```

Open `http://localhost:5173` for the demo page (**EN / 中文** toggle in the top-right):
- **Demo 1** — single gallery, close-on-mask-click, no flip buttons
- **Demo 2** — folder groups, side arrows, flip buttons
- **Demo 3** — thumbnail-first progressive loading (small `minimapSrc` preview, then full image; wheel / pan stress test; assets from demo CDN)
- **Demo 4** — host-provided EXIF + delete
- **Demo 5** — contained workspace + flat strip + neighbor preload + minimal chrome

---

## Basic Usage

```tsx
import { ImagePreview } from 'right-image-preview';

// Single image
<ImagePreview
  src="/photo.jpg"
  visible={open}
  onClose={() => setOpen(false)}
/>

// Multiple images
<ImagePreview
  images={[
    { src: '/a.jpg', name: 'a.jpg' },
    { src: '/b.jpg', name: 'b.jpg' },
  ]}
  visible={open}
  onClose={() => setOpen(false)}
  wheelEnabled
  closeOnMaskClick
/>

// Multiple groups (folders)
<ImagePreview
  groupedImages={[
    {
      name: 'Travel/',
      images: [
        { id: 'travel/a', src: '/a.jpg', name: 'a.jpg' },
        { src: '/b.jpg', name: 'b.jpg' },
        { src: '/c.jpg', name: 'c.jpg' },
      ],
    },
    {
      name: 'Events/',
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

> **Canonical reference:** [`docs/api.md`](./docs/api.md) (EN) / [`docs/api.zh-CN.md`](./docs/api.zh-CN.md) (中文). Main display flow: [`docs/main-display-flow.md`](./docs/main-display-flow.md). The table below is a short overview and may lag; prefer the docs when they differ.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | — | Single image URL (ignored when `images` or non-empty `groupedImages` is provided) |
| `minimapSrc` | `string` | — | Single-image only: minimap tile URL (defaults to main `src`); ignored if `minimap` is set |
| `minimap` | `React.ReactNode` | — | Single-image only: custom minimap content (overrides `minimapSrc`) |
| `images` | `ImageItem[]` | — | Flat image list (over `src`); ignored when non-empty `groupedImages` is set (dev may warn if both are passed); per-item `minimapSrc` / `minimap` supported |
| `groupedImages` | `ImageGroup[]` | — | Folder-style groups; concatenates each group’s `images` in order; takes precedence over `images` and `src` |
| `visible` | `boolean` | `true` | Controls visibility |
| `defaultGroupedSelection` | `{ defaultGroupIndex, defaultIndexInGroup }` | — | Initial image in `groupedImages` mode (group index counts only non-empty groups); overrides `defaultIndex` |
| `defaultIndex` | `number` | `0` | Initial index in the flattened list; ignored when `defaultGroupedSelection` is set with groups |
| `stops` | `number[]` | `[10,25,50,75,100,125,150,175,200]` | Discrete zoom stops in % (ascending); raise the cap by passing a longer list |
| `smallImageZoom` | `SmallImageZoomOptions` | disabled | Append only `maxNativePercent` when the loaded original longest edge is ≤ `maxEdge`; e.g. `{ maxEdge: 64, maxNativePercent: 1600 }` |
| `fitMaxNativePercent` | `number` | `100` | Fit cap, bounded by the effective highest stop; small images start at actual size and can click to 200% (subject to the zoom ceiling) |
| `initialMode` | `'fit' \| 'native'` | `'fit'` | Initial zoom mode |
| `initialNativePercent` | `number` | first stop | Initial native percent when `initialMode='native'` |
| `firstZoomInStrategy` | `'above-fit' \| 'first-stop' \| 'hundred'` | `'above-fit'` | Which stop to land on when zooming in from Fit for the first time |
| `zoomOutBelowMinBehaviour` | `'fit' \| 'noop'` | `'noop'` | Behaviour when zooming out below the minimum stop |
| `zoomInAtMaxBehaviour` | `'noop' \| 'notify'` | `'noop'` | Behaviour when zooming in at the maximum stop |
| `wheelEnabled` | `boolean` | `true` | Enable mouse-wheel zoom |
| `clickZoomEnabled` | `boolean` | automatic | Shared click/Space cycle; explicit values take priority. When omitted, only explicit `doubleClickEnabled={true}` selects legacy mode |
| `doubleClickEnabled` | `boolean` | `true` in legacy mode | Explicit true preserves double-click Fit ↔ 100%; ignored while single-click mode is enabled |
| `switchImageResetZoom` | `boolean` | `true` | Reset zoom when switching images (overridden by zoom lock) |
| `switchImageResetTransform` | `boolean` | `true` | Reset flip/rotation when switching images |
| `fitResetPan` | `boolean` | `true` | Reset pan offset when switching to Fit mode |
| `showFlip` | `boolean` | `false` | Show horizontal/vertical flip buttons |
| `showRotateCCW` | `boolean` | `true` | Show the counter-clockwise rotation button; Shift+R remains available when hidden |
| `showExif` | `boolean` | `false` | Show EXIF / metadata toggle in the toolbar |
| `initialExifOpen` | `boolean` | `false` | Open the EXIF panel on first mount when `showExif` is true |
| `showDelete` | `boolean` | `false` | Show delete control; host updates list in `onDeleteImage` |
| `arrows` | `'both' \| 'side' \| 'toolbar' \| 'none'` | `'both'` | **Side** arrows only; with non-empty `groupedImages`, toolbar prev/next always on |
| `initialZoomLocked` | `boolean` | `false` | Start with zoom lock enabled |
| `closeOnMaskClick` | `boolean` | `false` | Close when clicking outside the image/toolbar |
| `onClose` | `() => void` | — | Called when the preview is closed |
| `onZoomChange` | `(state: ZoomState) => void` | — | Called whenever zoom state changes |
| `onIndexChange` | `(index: number) => void` | — | Called when the active image changes |
| `onMaxStopReached` | `() => void` | — | Called when zooming in at max stop (requires `'notify'`) |
| `onImageError` | `(index: number, src: string) => void` | — | Called when the current image fails to load; receives flat index and `src` URL |
| `errorFallback` | `(index: number, src: string) => ReactNode` | — | Render custom content centred over the viewport when an image fails to load; navigating away resets the error state |
| `pinchEnabled` | `boolean` | `true` | Enable two-finger pinch-to-zoom on touch screens and multi-touch trackpads |
| `strings` | `Partial<LocaleStrings>` | — | Override individual UI strings; merged on top of the locale selected by `language`; supply only the keys you want to change |

### Host integration

The host owns native fullscreen actions, thumbnail generation and the shortcut-help dialog. Pass `fullscreen={{ toggle: toggleHostFullscreen }}` for a host that only exposes a toggle command. A host with reliable state can instead pass `{ isFullscreen, enter, exit }`. Errors reach `onFullscreenError`; without an adapter the component uses the browser fullscreen API.

Enable `showThumbnailToggle` and control the strip with `showThumbnails` / `onThumbnailsVisibleChange`. Use `onThumbnailVisibleIndexesChange` to request thumbnails only for mounted entries, including overscan. Supply each result through `ImageItem.thumbnailSrc`; set it to `null` while pending or unavailable to prevent original-image fallback, and use `thumbnailError` for a failure placeholder. The component does not generate 200px files or choose a generation concurrency limit; those are host policies. `thumbnailsScope="group"` limits the strip to the active group; `"flat"` spans the flattened list.

Connect `onShowShortcuts` to a host dialog built from `getPreviewShortcutHelp`. Set `keyboardEnabled={false}` while the dialog owns keyboard input; hosts can also suspend `wheelEnabled` and `pinchEnabled` while their dialog is open. Flip visibility (`showFlip`) and counter-clockwise rotation visibility (`showRotateCCW`) remain independent host options. See the [complete API](./docs/api.md) for callbacks and defaults.

#### `arrows` values

| Value | Effect |
|-------|--------|
| `'both'` | Side arrows **and** toolbar prev/next on flat lists (default) |
| `'side'` | Side arrows only; flat lists still get toolbar prev/next, index between them |
| `'toolbar'` | Toolbar prev/next only; no side arrows |
| `'none'` | No side arrows; keyboard ← → still works; flat lists still get toolbar prev/next + index |

With non-empty **`groupedImages`**, toolbar prev/next are always shown; only side arrows follow this table.

### Types

```ts
interface ImageItem {
  id?: string;   // stable key (e.g. path); prefer over `name` for identity
  src: string;
  alt?: string;
  name?: string; // filename shown in the info badge
  minimapSrc?: string;
  minimap?: React.ReactNode;
  thumbnailSrc?: string | null; // strip-only URL; null forbids original fallback
  thumbnailError?: boolean;    // retain a navigable failure placeholder
}

interface ImageGroup {
  id?: string;   // optional stable key for the folder / album
  name: string;  // group label shown below the filename
  images: ImageItem[];
}

interface DefaultGroupedSelection {
  defaultGroupIndex: number;   // among non-empty groups only, in order
  defaultIndexInGroup: number; // 0-based within that group’s `images`
}

interface ZoomState {
  mode: 'fit' | 'native';
  nativePercent: number;
  fitEquivalentNativePercent?: number; // for displaying "Fit ≈ xx%"
}
```

The package also exports **`resolvePreviewImages`**, **`flattenGroupedImages`**, **`resolveDefaultGroupedFlatIndex`**, **`FlattenedGroupSlice`**, and **`DefaultGroupedSelection`** if you need the same flattened list and per-group index ranges outside the component. **`resolveStrings`** and **`mergeStrings`** are also exported for building custom locale objects programmatically.

### Ref API

```ts
const ref = useRef<ImagePreviewRef>(null);

interface ImagePreviewRef {
  // zoom
  zoomIn(): void;
  zoomOut(): void;
  fit(): void;
  setNative(percent: number): void; // positive finite percent, clamped to the effective highest stop

  // transform
  rotateCW(): void;
  rotateCCW(): void;
  flipHorizontal(): void;
  flipVertical(): void;

  // navigation
  next(): void;
  prev(): void;
  nextGroup(): void;
  prevGroup(): void;

  // state
  getState(): ZoomState;
}
```

---

## Keyboard Shortcuts

Fixed aliases include Q/E navigation, Home/End, R/Shift+R rotation, F fullscreen, WASD/numpad pan,
and ? for host-provided help, alongside existing zoom and navigation keys.
See the [complete keyboard reference](./docs/keyboard.md) for conditions and the eight pan directions. Ctrl/⌘/Shift + arrow combinations are left to the host.
Hosts can use `getPreviewShortcutHelp` for a read-only table; no shortcut customization is provided.

---

## Project Structure

[Internal architecture and state ownership (Chinese)](docs/component-architecture.zh-CN.md).

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
  App.tsx                      # Demo shell
  demos/                       # Demo sections + demo-only copy (not published to npm)
docs/
  main-display-flow.md / .zh-CN.md  # Main display & navigation flow (thumb then original)
  api.md / api.zh-CN.md        # Full API reference
  media-lens-integration.md    # Media Lens (Tauri) integration checklist
  media-lens-integration.zh-CN.md
  keyboard.md / keyboard.zh-CN.md  # Keyboard shortcuts
  requirements.md              # Requirement history
tests/
  setup.ts                     # Vitest + jsdom setup
  useZoomState.test.ts         # Zoom state machine unit tests
  flattenGroupedImages.test.ts
  locale.test.ts               # Locale / mergeStrings unit tests
  injectGlobalStyle.test.ts
  ImagePreview.test.tsx        # Component integration tests
```

---

## Zoom Algorithm

```
fitScale    = min(containerW / naturalW, containerH / naturalH)
nativeScale = nativePercent / 100

CSS transform scale (fit)    = fitScale
CSS transform scale (native) = nativeScale × (naturalW / layoutW)
                             ≈ nativePercent / 100  (exact when layoutW = naturalW)

fitEquivalentNativePercent   = fitScale × 100  (used to display "Fit ≈ xx%")
```

---

## Finite zoom ceiling

The effective highest stop caps wheel, keyboard, toolbar, input, pinch and `setNative`. Fit shares this ceiling; `fitMaxNativePercent` can set a lower Fit cap. Pinch is continuous and manual input accepts intermediate finite percentages; presets control discrete steps and menu choices.

`smallImageZoom` is opt-in and uses the current loaded original intrinsic size, never unknown dimensions, EXIF, thumbnails or a previous image. Lower ceilings clamp immediately, including with zoom lock; raising the ceiling does not restore a previously clamped value. `setNative` requests above the ceiling are clamped; configure higher stops or the small-image exception for a larger zoom range.

The component's default stops end at **200%**. Configure `stops` and `smallImageZoom` for an **800%** normal ceiling and an additional **1600%** preset for tiny originals:

```tsx
<ImagePreview
  src="/icon.svg"
  visible
  stops={[10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 600, 800]}
  smallImageZoom={{ maxEdge: 64, maxNativePercent: 1600 }}
  fitMaxNativePercent={100}
/>
```

The extra preset is 1600%; continuous pinch and manually entered intermediate percentages are available within the ceiling. The small-image exception is decided after the original loads; a thumbnail or unknown size cannot enable it.

## License

MIT © [ZhangJian](https://github.com/ZhangJian1713)
