# ImagePreview — Props & Ref API

**English** · [中文](./api.zh-CN.md)

---

## `<ImagePreview>` Props

### Data

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | — | Single image URL (ignored when `images` is provided) |
| `alt` | `string` | — | Alt text for single image |
| `images` | `ImageItem[]` | — | Image array; when provided, `src`/`alt` are ignored |
| `groups` | `ImageGroup[]` | — | Group definitions (folder mode); arrows navigate within a group, toolbar gains prev/next-group buttons |
| `visible` | `boolean` | — | Controlled visibility |
| `defaultIndex` | `number` | `0` | Initially displayed image index |

### Zoom Configuration

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `stops` | `NativePercent[]` | `[10,25,50,75,100,150,200,300,400,600,800]` | Discrete zoom stop list (ascending, at least 1 item) |
| `initialMode` | `'fit' \| 'native'` | `'fit'` | Initial zoom mode |
| `initialNativePercent` | `number` | first stop | Initial percentage when `initialMode='native'` |
| `firstZoomInStrategy` | `'above-fit' \| 'first-stop' \| 'hundred'` | `'above-fit'` | Which stop to land on when zooming in from Fit for the first time |
| `zoomOutBelowMinBehaviour` | `'fit' \| 'noop'` | `'noop'` | What happens when zooming out below the minimum stop |
| `zoomInAtMaxBehaviour` | `'noop' \| 'notify'` | `'noop'` | What happens when zooming in at the maximum stop |
| `initialZoomLocked` | `boolean` | `false` | Start with zoom locked (preserve zoom when switching images) |

### Interaction Behaviour

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `wheelEnabled` | `boolean` | `false` | Enable mouse-wheel zoom |
| `doubleClickEnabled` | `boolean` | `false` | Double-click to toggle Fit ↔ 100 % |
| `switchImageResetZoom` | `boolean` | `true` | Reset zoom when switching images (overridden by zoom lock) |
| `switchImageResetTransform` | `boolean` | `false` | Reset flip/rotation when switching images |
| `fitResetPan` | `boolean` | `true` | Reset pan offset when switching to Fit mode |
| `closeOnMaskClick` | `boolean` | `false` | Close when clicking the dark overlay outside the image/toolbar |
| `overlayClassName` | `string` | — | Extra CSS class applied to the overlay backdrop element |
| `overlayStyle` | `React.CSSProperties` | — | Inline style overrides merged onto the overlay backdrop (merged after defaults, so your values win) |

### UI Configuration

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `arrows` | `'both' \| 'side' \| 'toolbar' \| 'none'` | `'both'` | **Side** arrows only; see table (`groups` forces toolbar prev/next on) |
| `showFlip` | `boolean` | `false` | Show horizontal/vertical flip buttons in the toolbar |
| `showMinimap` | `boolean` | `true` | When the image overflows the viewport, show the bottom-right navigation minimap (drag the frame to pan) |
| `language` | `string` | `'en'` | UI locale: built-in `en` and `zh` (primary subtag match, e.g. `zh-CN` → `zh`) |

#### `arrows` values

| Value | Effect |
|-------|--------|
| `'both'` | Side arrows **and** toolbar prev/next on flat lists (default) |
| `'side'` | Side arrows only; flat lists still get toolbar prev/next with index between them |
| `'toolbar'` | Toolbar prev/next only; no side arrows |
| `'none'` | No side arrows; keyboard ← → always works; flat lists still get toolbar prev/next + index |

When **`groups`** is set, **toolbar prev/next are always shown**; only **side** arrows follow this table.

#### Smart side-arrow behaviour

- An arrow is **hidden** (not grayed-out) when navigation in that direction is impossible.
- At a group boundary where an adjacent group exists, the arrow is replaced by a **double-chevron** group-jump button.

### Callbacks

| Prop | Type | Description |
|------|------|-------------|
| `onClose` | `() => void` | Fired when the preview is closed |
| `onZoomChange` | `(state: ZoomState) => void` | Fired whenever zoom state changes |
| `onIndexChange` | `(index: number) => void` | Fired when the active image index changes |
| `onMaxStopReached` | `() => void` | Fired when zooming in at the max stop (requires `zoomInAtMaxBehaviour='notify'`) |

---

## Type Definitions

```typescript
interface ImageItem {
  src: string;
  alt?: string;
  name?: string; // filename shown in the info badge
}

interface ImageGroup {
  name: string;  // group label displayed below the filename
  start: number; // inclusive start index in the images array
  end: number;   // inclusive end index in the images array
}

type ArrowsConfig = 'both' | 'side' | 'toolbar' | 'none';

interface ZoomState {
  mode: 'fit' | 'native';
  /** Current native zoom percentage (meaningful when mode is 'native') */
  nativePercent: number;
  /** Fit-equivalent native % (toolbar field shows `42%` in Fit mode; preset menu row shows `Fit (42%)` / `适应 (约 42%)`) */
  fitEquivalentNativePercent?: number;
}
```

---

## `ImagePreviewRef` Methods

```typescript
interface ImagePreviewRef {
  // zoom
  zoomIn(): void;
  zoomOut(): void;
  fit(): void;
  setNative(percent: number): void; // accepts any positive integer, not limited to stops

  // rotation & flip
  rotateCW(): void;        // rotate 90° clockwise
  rotateCCW(): void;       // rotate 90° counter-clockwise
  flipHorizontal(): void;
  flipVertical(): void;

  // image navigation
  next(): void;            // next image within group (or globally if no groups)
  prev(): void;            // previous image within group
  nextGroup(): void;       // jump to first image of the next group
  prevGroup(): void;       // jump to first image of the previous group

  // state inspection
  getState(): ZoomState;
}
```

---

## See also

- [Minimap viewport drag](./minimap.md) — WebView pointer quirks and Jacobian-based 1:1 panning.
