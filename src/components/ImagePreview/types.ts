import type React from 'react';

export type ZoomMode = 'fit' | 'native';

/** Native zoom percentage: 100 means 1 CSS pixel = 1 image pixel. */
export type NativePercent = number;

export interface ZoomState {
  mode: ZoomMode;
  /** Only meaningful when mode === 'native'. */
  nativePercent: NativePercent;
  /** Approximate native% equivalent of the current fit scale. Available once image is loaded. */
  fitEquivalentNativePercent?: number;
}

export interface ImageItem {
  src: string;
  alt?: string;
  /** Filename displayed in the info bar above the toolbar. */
  name?: string;
}

/**
 * Defines a named group (folder) within the flat `images` array.
 * When `groups` is passed to `ImagePreview`, the left/right arrows navigate
 * within the current group, and prev/next-group buttons appear in the toolbar.
 */
export interface ImageGroup {
  /** Display name, e.g. folder name shown below the image filename. */
  name: string;
  /** Inclusive start index in the `images` array. */
  start: number;
  /** Inclusive end index in the `images` array. */
  end: number;
}

/**
 * Strategy when zooming in from Fit mode.
 * - 'above-fit': snap to the smallest stop strictly greater than the fit-equivalent native%.
 * - 'first-stop': always start from the first (smallest) stop.
 * - 'hundred': always start from 100%.
 */
export type FirstZoomInStrategy = 'above-fit' | 'first-stop' | 'hundred';

/**
 * Behaviour when zooming out below the minimum stop.
 * - 'fit': switch back to Fit mode.
 * - 'noop': do nothing.
 */
export type ZoomOutBelowMinBehaviour = 'fit' | 'noop';

/**
 * Behaviour when zooming in at the maximum stop.
 * - 'noop': do nothing.
 * - 'notify': call onMaxStopReached.
 */
export type ZoomInAtMaxBehaviour = 'noop' | 'notify';

/** Strategy for mouse-wheel zooming. */
export type WheelStrategy =
  /** Each wheel tick moves ±1 stop. */
  | 'stop-by-stop'
  /** Continuous scaling that snaps to the nearest stop on wheel end. */
  | 'snap';

/**
 * Controls **side-of-image** navigation arrows only (left/right of the picture).
 *
 * - `'both'`    — side arrows **and** toolbar prev/next (default).
 * - `'side'`    — side arrows only; toolbar still has prev/next on flat lists (counter sits between them).
 * - `'toolbar'` — toolbar prev/next only; no side arrows.
 * - `'none'`    — no side arrows; keyboard ← → still works.
 *
 * When `groups` is non-empty (**folder / multi-group mode**), toolbar prev/next are **always** shown;
 * this prop no longer hides them — only the side arrows obey the table above.
 */
export type ArrowsConfig = 'both' | 'side' | 'toolbar' | 'none';

export interface ImagePreviewProps {
  // ── Data ──────────────────────────────────────────────────────────────────
  /** Single image shorthand. Ignored when `images` is provided. */
  src?: string;
  alt?: string;
  /** Multiple images. When provided, `src`/`alt` are ignored. */
  images?: ImageItem[];
  /**
   * Optional group (folder) definitions over the flat `images` array.
   * When provided, left/right arrows navigate within the current group only,
   * and prev/next-group buttons appear flanking the arrows.
   */
  groups?: ImageGroup[];
  /** Controlled visibility. */
  visible?: boolean;
  /** Initial visible index (multi-image). Default 0. */
  defaultIndex?: number;

  // ── Zoom configuration ────────────────────────────────────────────────────
  /**
   * Discrete native-percent zoom stops.
   * Must be sorted ascending and contain at least one value.
   * Default: [10, 25, 50, 75, 100, 150, 200] (max 200 % — higher ratios are usually too soft for preview).
   */
  stops?: NativePercent[];
  /** Initial zoom mode. Default: 'fit'. */
  initialMode?: ZoomMode;
  /** Initial native% when initialMode === 'native'. Default: first stop. */
  initialNativePercent?: NativePercent;

  // ── Behaviour options ──────────────────────────────────────────────────────
  firstZoomInStrategy?: FirstZoomInStrategy;
  zoomOutBelowMinBehaviour?: ZoomOutBelowMinBehaviour;
  zoomInAtMaxBehaviour?: ZoomInAtMaxBehaviour;

  /** Enable mouse-wheel zoom. Default: true. */
  wheelEnabled?: boolean;
  wheelStrategy?: WheelStrategy;

  /** Enable double-click to toggle fit ↔ 100%. Default: true. */
  doubleClickEnabled?: boolean;

  /**
   * Reset zoom state when switching images.
   * Default: true.
   */
  switchImageResetZoom?: boolean;

  /**
   * Reset rotation and flip when switching images.
   * Default: true.
   */
  switchImageResetTransform?: boolean;

  /**
   * Reset pan (translate) when calling fit().
   * Default: true.
   */
  fitResetPan?: boolean;

  /**
   * Show the horizontal/vertical flip buttons in the toolbar.
   * Default: false (flip is available but hidden by default to keep the toolbar compact).
   */
  showFlip?: boolean;

  /**
   * Which **side** arrow buttons to render. Toolbar prev/next in multi-group mode (`groups`) are always on.
   * Default: `'both'`. See `ArrowsConfig`.
   */
  arrows?: ArrowsConfig;

  /**
   * Initial zoom-lock state. When true, switching images preserves the current zoom
   * mode and percentage instead of resetting to fit.
   * The user can toggle this in the toolbar via the lock icon.
   * Default: false.
   */
  initialZoomLocked?: boolean;

  /**
   * When true (default), show a bottom-right navigation minimap whenever the image
   * overflows the viewport in Native zoom mode. The dashed frame tracks pan/zoom/rotate;
   * dragging inside the frame pans the main image.
   */
  showMinimap?: boolean;

  /**
   * Custom counter renderer, similar to Ant Design's countRender.
   * Receives (currentIndex + 1, total). Return any React node to replace
   * the default "n / total" counter in the toolbar.
   * @deprecated Prefer using `groups` for multi-folder scenarios.
   */
  countRender?: (current: number, total: number) => React.ReactNode;

  /**
   * Whether clicking the dark overlay backdrop (outside the image, toolbar, and info badge)
   * closes the preview, just like pressing Esc or the close button.
   * Default: `false`.
   */
  closeOnMaskClick?: boolean;

  /**
   * Extra CSS class applied to the overlay backdrop element.
   * Use this to override the background, blur, or any other visual property.
   */
  overlayClassName?: string;

  /**
   * Inline style overrides merged onto the overlay backdrop element.
   * Merged after the default styles, so any property you provide takes precedence.
   * Example: `{ background: 'rgba(0,0,0,0.95)' }` to get a fully opaque black backdrop.
   */
  overlayStyle?: React.CSSProperties;

  /**
   * Preferred display language for all user-visible text (button labels,
   * aria-labels, zoom display, etc.).
   *
   * Accepts any BCP 47 language tag such as `"en"`, `"en-US"`, `"zh"`, or
   * `"zh-CN"`. Matching is performed on the primary subtag; unrecognised
   * locales fall back to English.
   *
   * Currently built-in: `"en"` (default) and `"zh"` (Simplified Chinese).
   *
   * Default: `"en"`.
   */
  language?: string;

  // ── Callbacks ──────────────────────────────────────────────────────────────
  onClose?: () => void;
  onZoomChange?: (state: ZoomState) => void;
  onIndexChange?: (index: number) => void;
  /** Called when attempting to zoom in at the maximum stop (only when zoomInAtMaxBehaviour === 'notify'). */
  onMaxStopReached?: () => void;
}

export interface ImagePreviewRef {
  zoomIn(): void;
  zoomOut(): void;
  /** Switch to Fit mode. */
  fit(): void;
  /** Switch to Native mode at the given percentage. */
  setNative(percent: NativePercent): void;
  /** Rotate image 90° clockwise. */
  rotateCW(): void;
  /** Rotate image 90° counter-clockwise. */
  rotateCCW(): void;
  /** Flip image horizontally (left ↔ right). */
  flipHorizontal(): void;
  /** Flip image vertically (top ↔ bottom). */
  flipVertical(): void;
  /** Navigate to the next image within the current group (or globally if no groups). */
  next(): void;
  /** Navigate to the previous image within the current group (or globally if no groups). */
  prev(): void;
  /** Navigate to the first image of the next group (requires `groups` prop). */
  nextGroup(): void;
  /** Navigate to the first image of the previous group (requires `groups` prop). */
  prevGroup(): void;
  getState(): ZoomState;
}
