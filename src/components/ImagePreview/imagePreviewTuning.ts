/**
 * Image preview — numeric tuning (pan visibility clamps, minimap Jacobian, etc.).
 * Prefer editing this file over scattering magic numbers across components.
 */

// ── Viewport pan clamp (`useImageTransform`, axis-aligned overlap model) ─────

/** Main image drag: min fraction of viewport **width** and **height** that must show image. */
export const MAIN_DRAG_MIN_VIEWPORT_COVERAGE = 0.5;

/**
 * Minimap viewport drag: max fraction of viewport **width** and **height** that may show frosted
 * background (each axis in the same model). `0.1` → at least 90% coverage when the image allows.
 */
export const MINIMAP_PAN_MAX_VIEWPORT_BACKGROUND_FRACTION = 0.1;

/** Min coverage for minimap-driven `panByDelta`; derived from the background cap above. */
export const MINIMAP_PAN_MIN_VIEWPORT_COVERAGE =
  1 - MINIMAP_PAN_MAX_VIEWPORT_BACKGROUND_FRACTION;

/** Toolbar / wheel zoom translate correction: same as main-image drag. */
export const ZOOM_CLAMP_MIN_VIEWPORT_COVERAGE = MAIN_DRAG_MIN_VIEWPORT_COVERAGE;

// ── Toolbar zoom label (`Toolbar` / `ZoomInput`) ───────────────────────────────

/** Fixed width (px) of the zoom % slot — fits `800%` + padding (tabular digits). */
export const TOOLBAR_ZOOM_LABEL_SLOT_PX_EN = 56;

/** Same as EN: numeric labels use Western digits in zh UI too. */
export const TOOLBAR_ZOOM_LABEL_SLOT_PX_ZH = 56;

/** Resolve slot width from BCP 47 tag (same primary-subtag rule as `resolveStrings`). */
export function toolbarZoomLabelSlotPx(language?: string): number {
  const primary = language?.split(/[-_]/)[0].toLowerCase();
  return primary === 'zh' ? TOOLBAR_ZOOM_LABEL_SLOT_PX_ZH : TOOLBAR_ZOOM_LABEL_SLOT_PX_EN;
}

/** Fixed width (px) of the zoom preset dropdown — wider than the narrow % trigger. */
export const ZOOM_DROPDOWN_WIDTH_PX_EN = 110;

/** Chinese “适应 (约 n%)” row needs a bit more horizontal room. */
export const ZOOM_DROPDOWN_WIDTH_PX_ZH = 136;

export function toolbarZoomDropdownWidthPx(language?: string): number {
  const primary = language?.split(/[-_]/)[0].toLowerCase();
  return primary === 'zh' ? ZOOM_DROPDOWN_WIDTH_PX_ZH : ZOOM_DROPDOWN_WIDTH_PX_EN;
}

/** Zoom dropdown: max width when viewport is narrow (rows use ellipsis). ≥ zh dropdown width. */
export const ZOOM_DROPDOWN_MAX_WIDTH_PX = 160;

/** Min width for the `current / total` counter between prev/next (tabular digits). */
export const TOOLBAR_NAV_COUNTER_MIN_WIDTH_PX = 52;

// ── Minimap pointer ↔ pan Jacobian (`minimapMath`) ───────────────────────────

/** Step (container px) for ∂m/∂tx, ∂m/∂ty finite differences. */
export const MINIMAP_JACOBIAN_EPS = 0.25;
