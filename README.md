# right-image-preview

**English** · [中文](./README.zh-CN.md)

> A dependency-free React image preview component with Lightroom-style discrete zoom stops, multi-group navigation, flip/rotate, keyboard shortcuts, and auto-fading controls.

### What’s new in **v0.0.13**

- **Minimap source:** optional **`minimapSrc`** (URL) and **`minimap`** (`ReactNode`) on each **`ImageItem`**, or the same props when using single-**`src`** mode. Defaults to the main image **`src`** when omitted.

### Earlier **v0.0.12**

- **Minimap thumbnail `<img>`:** scale is **baked into `width` / `height`**; **`transform` only rotates / flips** (fixes solid black in some webviews). See **`docs/minimap.md`** (“Problem 4”).

### Earlier **v0.0.11**

- Axis-aligned minimap dim uses **four `<rect>`** strips; rotated keeps evenodd path (**Problem 3**).

### Earlier **v0.0.10**

- Minimap: dropped **`<mask>` + `url(#id)`**; introduced evenodd **`<path>`** for dimming (fixed some hosts; not all).

### Earlier **v0.0.9**

- **React 17+** supported: peer **`react` / `react-dom` ≥ 17** (was ≥ 18). Wheel zoom uses **`flushSync` fallback** when `react-dom` has no `flushSync`.
- **React 18+** is still recommended for identical multi-step wheel-zoom batching.

### Earlier **v0.0.8**

- **Default zoom stops** top out at **200%**; custom **`stops`** for higher ratios.
- **Toolbar zoom field** clamps to max stop; **`ref.setNative`** not clamped.
- **GitHub Pages demo**: **EN / 中文** toggle; **wheel** tuning for small-delta mice.

### Earlier **v0.0.7**

- Navigation **minimap**, compact zoom field in Fit mode, and **`language`** prop (EN/zh UI).

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Fit / Native zoom modes** | `fit` displays the image fully within the viewport (contain); `native` uses the image's original pixel dimensions as 100% baseline |
| **Discrete zoom stops** | Zoom in/out only jumps between configured stops (default: 10 %–200 %); override with **`stops`** |
| **Zoom field input** | Type a positive %; values are **clamped to the max configured stop** (toolbar only; ref API unchanged) |
| **Multi-image / multi-group** | Supports a flat image list or images organized into folder-like groups |
| **Flip & Rotate** | Horizontal/vertical flip and 90° CW/CCW rotation with CSS animation |
| **Zoom lock** | Optionally preserve zoom state when switching images |
| **Smart side arrows** | Hidden when no navigation is possible; replaced by a group-jump button (double chevron) at group boundaries |
| **Auto-fade controls** | All controls fade to ~10 % opacity after 3 s of inactivity; any activity instantly restores them |
| **Navigation minimap** | Corner thumbnail + draggable viewport frame when the image overflows; optional via `showMinimap` |
| **Rich keyboard shortcuts** | Esc · +/- · arrow keys · Space · PageUp/Down · Ctrl+arrow |
| **Accessibility** | `role="dialog"` + `aria-modal`, all buttons have `aria-label`, focus is trapped |
| **TypeScript first** | Full type exports, `forwardRef` imperative ref API |
| **Zero production dependencies** | Only requires React |
| **React 17+** | Peer `react` / `react-dom` ≥ 17; React 18+ still recommended (native `flushSync` for fastest multi-step wheel zoom) |

---

## Quick Start

```bash
npm install
npm run dev       # dev server with live demos
npm test          # run unit & integration tests
npm run build     # production build
```

Open `http://localhost:5173` for the demo page (**EN / 中文** toggle in the top-right):
- **Demo 1** — single gallery, close-on-mask-click, no flip buttons
- **Demo 2** — folder groups, side arrows, flip buttons
- **Demo 3** — large local assets (wheel / pan stress test)

---

## Basic Usage

```tsx
import { ImagePreview } from './components/ImagePreview';

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
  doubleClickEnabled
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

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | — | Single image URL (ignored when `images` or non-empty `groupedImages` is provided) |
| `minimapSrc` | `string` | — | Single-image only: minimap tile URL (defaults to main `src`); ignored if `minimap` is set |
| `minimap` | `React.ReactNode` | — | Single-image only: custom minimap content (overrides `minimapSrc`) |
| `images` | `ImageItem[]` | — | Flat image list (over `src`); ignored when non-empty `groupedImages` is set (dev may warn if both are passed); per-item `minimapSrc` / `minimap` supported |
| `groupedImages` | `ImageGroup[]` | — | Folder-style groups; concatenates each group’s `images` in order; takes precedence over `images` and `src` |
| `visible` | `boolean` | `true` | Controls visibility |
| `defaultIndex` | `number` | `0` | Initial image index |
| `stops` | `number[]` | `[10,25,50,75,100,150,200]` | Discrete zoom stops in % (ascending); raise the cap by passing a longer list |
| `initialMode` | `'fit' \| 'native'` | `'fit'` | Initial zoom mode |
| `initialNativePercent` | `number` | first stop | Initial native percent when `initialMode='native'` |
| `firstZoomInStrategy` | `'above-fit' \| 'first-stop' \| 'hundred'` | `'above-fit'` | Which stop to land on when zooming in from Fit for the first time |
| `zoomOutBelowMinBehaviour` | `'fit' \| 'noop'` | `'noop'` | Behaviour when zooming out below the minimum stop |
| `zoomInAtMaxBehaviour` | `'noop' \| 'notify'` | `'noop'` | Behaviour when zooming in at the maximum stop |
| `wheelEnabled` | `boolean` | `true` | Enable mouse-wheel zoom |
| `doubleClickEnabled` | `boolean` | `true` | Double-click to toggle Fit ↔ 100 % |
| `switchImageResetZoom` | `boolean` | `true` | Reset zoom when switching images (overridden by zoom lock) |
| `switchImageResetTransform` | `boolean` | `false` | Reset flip/rotation when switching images |
| `fitResetPan` | `boolean` | `true` | Reset pan offset when switching to Fit mode |
| `showFlip` | `boolean` | `false` | Show horizontal/vertical flip buttons |
| `arrows` | `'both' \| 'side' \| 'toolbar' \| 'none'` | `'both'` | **Side** arrows only; with non-empty `groupedImages`, toolbar prev/next always on |
| `initialZoomLocked` | `boolean` | `false` | Start with zoom lock enabled |
| `closeOnMaskClick` | `boolean` | `false` | Close when clicking outside the image/toolbar |
| `onClose` | `() => void` | — | Called when the preview is closed |
| `onZoomChange` | `(state: ZoomState) => void` | — | Called whenever zoom state changes |
| `onIndexChange` | `(index: number) => void` | — | Called when the active image changes |
| `onMaxStopReached` | `() => void` | — | Called when zooming in at max stop (requires `'notify'`) |

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
}

interface ImageGroup {
  id?: string;   // optional stable key for the folder / album
  name: string;  // group label shown below the filename
  images: ImageItem[];
}

interface ZoomState {
  mode: 'fit' | 'native';
  nativePercent: number;
  fitEquivalentNativePercent?: number; // for displaying "Fit ≈ xx%"
}
```

The package also exports **`resolvePreviewImages`**, **`flattenGroupedImages`**, and **`FlattenedGroupSlice`** if you need the same flattened list and per-group index ranges outside the component.

### Ref API

```ts
const ref = useRef<ImagePreviewRef>(null);

interface ImagePreviewRef {
  // zoom
  zoomIn(): void;
  zoomOut(): void;
  fit(): void;
  setNative(percent: number): void; // any positive number (not clamped; toolbar field clamps to max stop)

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

| Key | Action |
|-----|--------|
| `Esc` | Close preview |
| `+` / `=` / `↑` | Zoom in one stop |
| `-` / `↓` | Zoom out one stop |
| `0` | Fit to viewport |
| `1` | Native 100 % |
| `Space` | Toggle Fit ↔ 100 % |
| `←` / `→` | Previous / next image |
| `Ctrl/⌘ + ←` | Rotate 90° counter-clockwise |
| `Ctrl/⌘ + →` | Rotate 90° clockwise |
| `PageUp` | Jump to first image of the previous group (non-empty `groupedImages`) |
| `PageDown` | Jump to first image of the next group (non-empty `groupedImages`) |

> Any key press resets the auto-fade inactivity timer.

---

## Project Structure

```
src/
  components/ImagePreview/
    types.ts              # TypeScript type definitions
    flattenGroupedImages.ts  # resolvePreviewImages / flattenGroupedImages helpers
    useZoomState.ts       # Zoom state machine hook (pure logic, no DOM)
    useImageTransform.ts  # Size measurement + CSS transform + drag-to-pan
    Toolbar.tsx           # Bottom toolbar (zoom / rotate / flip / nav / filename)
    ImagePreview.tsx      # Main component (overlay / keyboard / wheel / double-click / auto-fade)
    index.ts              # Public exports
  App.tsx                 # Demo page
docs/
  api.md                  # Full API reference (English)
  api.zh-CN.md            # Full API reference (中文)
  keyboard.md             # Keyboard shortcuts (English)
  keyboard.zh-CN.md       # Keyboard shortcuts (中文)
  requirements.md         # Requirement history (中文)
tests/
  setup.ts                # Vitest + jsdom setup
  useZoomState.test.ts    # State machine unit tests
  ImagePreview.test.tsx   # Component integration tests
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

## Roadmap

- Pinch-to-zoom touch gesture
- Image preloading strategy (N images ahead/behind)
- Strict 1:1 constraint when rotated 90°/270° (swap width/height)
- Spring-physics animation for zoom and pan

---

## License

MIT © [ZhangJian](https://github.com/ZhangJian1713)
