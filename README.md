# right-image-preview

**English** · [中文](./README.zh-CN.md)

> A dependency-free React image preview component with Lightroom-style discrete zoom stops, multi-group navigation, flip/rotate, keyboard shortcuts, and auto-fading controls.

### What’s new in **v0.0.7**

- **Navigation minimap** when the image extends past the viewport: drag the dashed frame to pan (hide with `showMinimap={false}`).
- **Zoom field** stays compact; in **Fit** mode it shows **percent only**; the preset menu still shows **Fit (n%)** for the Fit row.
- **`language`** prop: built-in **English** or **Chinese** UI strings.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Fit / Native zoom modes** | `fit` displays the image fully within the viewport (contain); `native` uses the image's original pixel dimensions as 100% baseline |
| **Discrete zoom stops** | Zoom in/out only jumps between configured stops (default: 10 %–800 %), always predictable |
| **Arbitrary zoom input** | The zoom input field accepts any positive integer, not just preset stops |
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

---

## Quick Start

```bash
npm install
npm run dev       # dev server with live demos
npm test          # run unit & integration tests
npm run build     # production build
```

Open `http://localhost:5173` to see two demo scenarios:
- **Demo 1** — single image group, close-on-mask-click, no flip buttons
- **Demo 2** — multiple folder groups, side arrows, flip buttons enabled

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
  images={allImages}
  groups={[
    { name: 'Travel/', start: 0, end: 2 },
    { name: 'Events/', start: 3, end: 5 },
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
| `src` | `string` | — | Single image URL (ignored when `images` is provided) |
| `images` | `ImageItem[]` | — | Image list (takes precedence over `src`) |
| `groups` | `ImageGroup[]` | — | Group definitions for folder-style navigation |
| `visible` | `boolean` | `true` | Controls visibility |
| `defaultIndex` | `number` | `0` | Initial image index |
| `stops` | `number[]` | `[10,25,50,100,200,400,800]` | Discrete zoom stops in % (ascending) |
| `initialMode` | `'fit' \| 'native'` | `'fit'` | Initial zoom mode |
| `initialNativePercent` | `number` | first stop | Initial native percent when `initialMode='native'` |
| `firstZoomInStrategy` | `'above-fit' \| 'first-stop' \| 'hundred'` | `'above-fit'` | Which stop to land on when zooming in from Fit for the first time |
| `zoomOutBelowMinBehaviour` | `'fit' \| 'noop'` | `'noop'` | Behaviour when zooming out below the minimum stop |
| `zoomInAtMaxBehaviour` | `'noop' \| 'notify'` | `'noop'` | Behaviour when zooming in at the maximum stop |
| `wheelEnabled` | `boolean` | `false` | Enable mouse-wheel zoom |
| `doubleClickEnabled` | `boolean` | `false` | Double-click to toggle Fit ↔ 100 % |
| `switchImageResetZoom` | `boolean` | `true` | Reset zoom when switching images (overridden by zoom lock) |
| `switchImageResetTransform` | `boolean` | `false` | Reset flip/rotation when switching images |
| `fitResetPan` | `boolean` | `true` | Reset pan offset when switching to Fit mode |
| `showFlip` | `boolean` | `false` | Show horizontal/vertical flip buttons |
| `arrows` | `'both' \| 'side' \| 'toolbar' \| 'none'` | `'both'` | **Side** arrows only; with `groups`, toolbar prev/next always on |
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

With **`groups`**, toolbar prev/next are always shown; only side arrows follow this table.

### Types

```ts
interface ImageItem {
  src: string;
  alt?: string;
  name?: string; // filename shown in the info badge
}

interface ImageGroup {
  name: string;  // group label shown below the filename
  start: number; // inclusive start index in the images array
  end: number;   // inclusive end index in the images array
}

interface ZoomState {
  mode: 'fit' | 'native';
  nativePercent: number;
  fitEquivalentNativePercent?: number; // for displaying "Fit ≈ xx%"
}
```

### Ref API

```ts
const ref = useRef<ImagePreviewRef>(null);

interface ImagePreviewRef {
  // zoom
  zoomIn(): void;
  zoomOut(): void;
  fit(): void;
  setNative(percent: number): void; // accepts any positive integer

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
| `PageUp` | Jump to previous group |
| `PageDown` | Jump to next group |

> Any key press resets the auto-fade inactivity timer.

---

## Project Structure

```
src/
  components/ImagePreview/
    types.ts              # TypeScript type definitions
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

MIT © [YOUR_NAME](https://github.com/YOUR_GITHUB_USERNAME)
