import React, { useLayoutEffect, useRef, useState } from 'react';
import { DelayedTooltip } from './DelayedTooltip';
import type { LocaleStrings } from '../i18n/locale';
import {
  TOOLBAR_NAV_COUNTER_MIN_WIDTH_PX,
} from '../imagePreviewTuning';
import type { NativePercent, ZoomMode } from '../types';
import { C } from './toolbar/palette';
import { ZoomInput } from './toolbar/ZoomInput';
import {
  Icon, IconZoomIn, IconZoomOut, IconLeft, IconRight, IconPrevGroup, IconNextGroup, IconRotateCW, IconRotateCCW,
  IconFlipH, IconFlipV, IconFit, IconOneToOne, IconLockOpen, IconLockClosed, IconExif, IconDelete, IconEnterFullscreen, IconExitFullscreen,
} from './toolbar/icons';

interface ToolbarProps {
  mode: ZoomMode;
  nativePercent: NativePercent;
  fitEquivalentNativePercent?: number;
  stops: NativePercent[];
  atMinStop: boolean;
  atMaxStop: boolean;
  zoomInAvailable?: boolean;
  zoomOutAvailable?: boolean;

  // ── Navigation ────────────────────────────────────────────────────────────
  totalImages: number;
  currentIndex: number;
  /** When provided with groupTotal, shows within-group counter (e.g. `2/3`). */
  groupCurrentIndex?: number;
  groupTotal?: number;
  hasPrevGroup?: boolean;
  hasNextGroup?: boolean;
  onPrevGroup?(): void;
  onNextGroup?(): void;
  /** Toolbar prev/next; parent sets false only for flat lists with `arrows` `'side'` / `'none'`. Always true when `groupedImages` is used. */
  showToolbarArrows?: boolean;

  // ── Image info ────────────────────────────────────────────────────────────
  imageName?: string;
  groupName?: string;
  /** 1-based index among non-empty groups (e.g. 1 of 3); shown before {@link groupName}. */
  groupOrdinal?: number;
  /** Total non-empty groups; paired with {@link groupOrdinal}. */
  groupCount?: number;

  // ── Feature flags ─────────────────────────────────────────────────────────
  showFlip?: boolean;
  showRotateCCW?: boolean;
  /** When true, show the EXIF toggle button. */
  showExif?: boolean;
  /** Whether the EXIF panel is currently open (controls active state). */
  exifOpen?: boolean;
  /** When true, show the delete button. */
  showDelete?: boolean;
  /** When true, show enter/exit fullscreen toggle. */
  showFullscreen?: boolean;
  showThumbnailToggle?: boolean;
  thumbnailsVisible?: boolean;
  onToggleThumbnails?(): void;
  fullscreenToggleOnly?: boolean;
  /** Whether the preview root is currently fullscreen. */
  isFullscreen?: boolean;
  /** Extra host content at the end of the toolbar. */
  toolbarExtra?: React.ReactNode;
  zoomLocked: boolean;
  /** When false the toolbar fades to ghost opacity (driven by CSS transition). */
  controlsVisible?: boolean;
  /** Idle opacity when controls are hidden (0 for minimal chrome). */
  idleOpacity?: number;
  /** Distance from the overlay bottom edge (px). Raised when a thumbnail strip is shown. */
  bottomPx?: number;

  // ── Actions ───────────────────────────────────────────────────────────────
  onZoomIn(): void;
  onZoomOut(): void;
  onFit(): void;
  onOneToOne(): void;
  onSetNative(percent: NativePercent): void;
  onRotateCW(): void;
  onRotateCCW(): void;
  onFlipH(): void;
  onFlipV(): void;
  onPrev(): void;
  onNext(): void;
  onToggleLock(): void;
  onToggleExif?(): void;
  onDeleteImage?(): void;
  onToggleFullscreen?(): void;
  /** Resolved locale strings — pass the result of `resolveStrings(language)`. */
  strings: LocaleStrings;
  /** Fixed width of the zoom % control between [−] and [+] — use `toolbarZoomLabelSlotPx(language)`. */
  zoomLabelSlotPx: number;
  /** Fixed width of the preset dropdown panel — use `toolbarZoomDropdownWidthPx(language)`. */
  zoomDropdownWidthPx: number;
}

// ── Toolbar button ─────────────────────────────────────────────────────────

interface TBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tip?: string;
  active?: boolean;
  accent?: string; // override active/text colour
}

function TBtn({ label, tip, active, accent, children, ...rest }: TBtnProps) {
  const textColor = rest.disabled
    ? C.textDisabled
    : accent
      ? accent
      : C.text;
  const bgColor = active ? C.activeBg : 'transparent';

  const button = (
    <button
      type="button"
      aria-label={label}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 34, height: 34, borderRadius: 6, border: 'none',
        cursor: rest.disabled ? 'not-allowed' : 'pointer',
        background: bgColor,
        color: textColor,
        transition: 'background 0.15s, color 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!rest.disabled) (e.currentTarget as HTMLButtonElement).style.background = active ? C.activeBg : C.hoverBg;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = bgColor;
      }}
      {...rest}
    >
      {children}
    </button>
  );
  return tip ? <DelayedTooltip content={tip}>{button}</DelayedTooltip> : button;
}

const Divider = () => (
  <div style={{ width: 1, height: 18, background: C.divider, margin: '0 3px', flexShrink: 0 }} />
);

// ── MiddleEllipsisName ─────────────────────────────────────────────────────
// Renders a filename with the ellipsis in the *middle*, so the file extension
// and the last few characters of the stem are always visible.
// e.g. "Joel Tonyan – The Orion Nebula and the Running Man.jpg"
//   →  "Joel Tonyan – The Orion Neb…ng Man.jpg"

interface MiddleEllipsisNameProps {
  name: string;
  style?: React.CSSProperties;
}

function MiddleEllipsisName({ name, style }: MiddleEllipsisNameProps) {
  const dotIdx = name.lastIndexOf('.');
  // No extension or hidden-file style (.bashrc): plain end-truncation
  if (dotIdx <= 0) {
    return (
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...style }}>
        {name}
      </span>
    );
  }

  const stem = name.slice(0, dotIdx);
  const ext  = name.slice(dotIdx);  // includes the dot

  // Keep last TAIL chars of stem + extension always visible at the end.
  const TAIL = 8;

  if (stem.length <= TAIL + 3) {
    // Stem is short — just show stem (possibly truncated) + ext side-by-side.
    return (
      <span style={{ display: 'flex', minWidth: 0, overflow: 'hidden', ...style }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: '2ch' }}>
          {stem}
        </span>
        <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>{ext}</span>
      </span>
    );
  }

  // Long stem: split so ellipsis lands in the middle.
  const startPart = stem.slice(0, stem.length - TAIL);
  const tailPart  = stem.slice(-TAIL) + ext;

  return (
    <span style={{ display: 'flex', minWidth: 0, overflow: 'hidden', ...style }}>
      <span style={{
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        flexShrink: 1, minWidth: '2ch',
      }}>
        {startPart}
      </span>
      <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>{tailPart}</span>
    </span>
  );
}

// ── Toolbar ────────────────────────────────────────────────────────────────

export function Toolbar({
  mode, nativePercent, fitEquivalentNativePercent,
  atMinStop, atMaxStop, zoomInAvailable, zoomOutAvailable,
  totalImages, currentIndex,
  groupCurrentIndex, groupTotal,
  hasPrevGroup, hasNextGroup,
  onPrevGroup, onNextGroup,
  showToolbarArrows = true,
  imageName, groupName, groupOrdinal, groupCount,
  showFlip = false,
  showRotateCCW = true,
  showExif = false,
  exifOpen = false,
  showDelete = false,
  showFullscreen = false,
  showThumbnailToggle = false,
  thumbnailsVisible = false,
  onToggleThumbnails,
  fullscreenToggleOnly = false,
  isFullscreen = false,
  toolbarExtra,
  zoomLocked,
  controlsVisible = true,
  idleOpacity = 0.1,
  bottomPx = 20,
  stops,
  onZoomIn, onZoomOut, onFit, onOneToOne, onSetNative,
  onRotateCW, onRotateCCW, onFlipH, onFlipV,
  onPrev, onNext, onToggleLock, onToggleExif, onDeleteImage, onToggleFullscreen,
  strings,
  zoomLabelSlotPx,
  zoomDropdownWidthPx,
}: ToolbarProps) {
  const canZoomOut = zoomOutAvailable ?? (mode === 'native' && !atMinStop);
  const canZoomIn = zoomInAvailable ?? !(mode === 'native' && atMaxStop);
  const isGroupMode = groupTotal !== undefined && groupCurrentIndex !== undefined;
  const showNav = isGroupMode || totalImages > 1;

  // Measure the toolbar action row so the info badge never exceeds its width.
  const toolbarRowRef = useRef<HTMLDivElement>(null);
  const [badgeMaxWidth, setBadgeMaxWidth] = useState<number>(560);
  useLayoutEffect(() => {
    const el = toolbarRowRef.current;
    if (!el) return;
    const update = () => setBadgeMaxWidth(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    // Outer wrapper: transparent column — badge sits above action row.
    // opacity transitions: fast restore (0.12 s) / slow fade (1.6 s).
    <div
      style={{
        position: 'absolute',
        bottom: bottomPx,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        userSelect: 'none',
        zIndex: 10,
        opacity: controlsVisible ? 1 : idleOpacity,
        transition: controlsVisible
          ? 'opacity 0.12s ease'
          : 'opacity 1.6s ease',
        pointerEvents: controlsVisible || idleOpacity > 0 ? 'auto' : 'none',
      }}
    >
      {/* ── Info badge — adapts to content width, capped at toolbar width ── */}
      {imageName && (
        <div
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 2,
            background: 'rgba(6,10,20,0.58)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: 7,
            padding: '5px 14px',
            // Grow to show full name; never wider than the toolbar row below.
            maxWidth: badgeMaxWidth,
            // Allow the badge to shrink its content area.
            minWidth: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          {/* Filename only — index lives in the toolbar between prev/next */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, width: '100%', minWidth: 0 }}>
            <MiddleEllipsisName
              name={imageName}
              style={{ fontSize: 13, fontWeight: 500, color: C.text, flex: '1 1 0' }}
            />
          </div>
          {/* Group/folder subtitle: (i/n) uses same tone as the in-group counter; name may differ */}
          {(groupName != null && groupName !== '') || (groupOrdinal != null && groupCount != null) ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 6,
                minWidth: 0,
                width: '100%',
                maxWidth: '100%',
              }}
            >
              {groupOrdinal != null && groupCount != null ? (
                <span
                  style={{
                    fontSize: 12,
                    color: C.textMuted,
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  ({groupOrdinal}/{groupCount})
                </span>
              ) : null}
              {groupName != null && groupName !== '' ? (
                <span
                  style={{
                    fontSize: 11,
                    color: '#c8d0e0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    flex: '1 1 0',
                  }}
                >
                  {groupName}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {/* ── Action row — own background ── */}
      <div
        ref={toolbarRowRef}
        role="toolbar"
        aria-label={strings.toolbar}
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          alignItems: 'center',
          gap: 1,
          padding: '3px 8px',
          borderRadius: 10,
          background: 'rgba(6,10,20,0.68)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          maxWidth: 'calc(100vw - 40px)',
        }}
      >
        {/* ── Navigation ── */}
        {showNav && (
          <>
            {isGroupMode && (
              <TBtn
                label={strings.prevGroup}
                tip={strings.tipPrevGroup}
                onClick={onPrevGroup}
                disabled={!hasPrevGroup}
              >
                <IconPrevGroup />
              </TBtn>
            )}

            {showToolbarArrows && (
              <TBtn
                label={strings.prev}
                onClick={onPrev}
                disabled={currentIndex === 0}
              >
                <IconLeft />
              </TBtn>
            )}

            <span
              style={{
                fontSize: 12,
                color: C.textMuted,
                minWidth: TOOLBAR_NAV_COUNTER_MIN_WIDTH_PX,
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
                padding: '0 4px',
                flexShrink: 0,
              }}
            >
              {isGroupMode
                ? `${groupCurrentIndex} / ${groupTotal}`
                : `${currentIndex + 1} / ${totalImages}`}
            </span>

            {showToolbarArrows && (
              <TBtn
                label={strings.next}
                onClick={onNext}
                disabled={currentIndex === totalImages - 1}
              >
                <IconRight />
              </TBtn>
            )}

            {isGroupMode && (
              <TBtn
                label={strings.nextGroup}
                tip={strings.tipNextGroup}
                onClick={onNextGroup}
                disabled={!hasNextGroup}
              >
                <IconNextGroup />
              </TBtn>
            )}

            <Divider />
          </>
        )}

        {/* ── Flip (optional) ── */}
        {showFlip && (
          <>
        <TBtn label={strings.flipH} tip={strings.tipFlipH} onClick={onFlipH}><IconFlipH /></TBtn>
        <TBtn label={strings.flipV} tip={strings.tipFlipV} onClick={onFlipV}><IconFlipV /></TBtn>
            <Divider />
          </>
        )}

        {/* ── Rotate ── */}
        {showRotateCCW && <TBtn label={strings.rotateCCW} onClick={onRotateCCW}><IconRotateCCW /></TBtn>}
        <TBtn label={strings.rotateCW} onClick={onRotateCW}><IconRotateCW /></TBtn>

        <Divider />

        {/* ── Jump-to-zoom presets ── */}
        <TBtn label={strings.fitToViewport} tip={strings.tipFitToViewport} onClick={onFit}      active={mode === 'fit'}><IconFit /></TBtn>
        <TBtn label={strings.actualSize} tip={strings.tipActualSize} onClick={onOneToOne} active={mode === 'native' && nativePercent === 100}><IconOneToOne /></TBtn>

        <Divider />

        {/* ── Precise zoom control: [-] [value] [+] [lock] ── */}
        <TBtn label={strings.zoomOut} onClick={onZoomOut} disabled={!canZoomOut}><IconZoomOut /></TBtn>

        <ZoomInput
          mode={mode}
          nativePercent={nativePercent}
          fitEquivalentNativePercent={fitEquivalentNativePercent}
          stops={stops}
          onFit={onFit}
          onSetNative={onSetNative}
          strings={strings}
          zoomLabelSlotPx={zoomLabelSlotPx}
          zoomDropdownWidthPx={zoomDropdownWidthPx}
        />

        <TBtn label={strings.zoomIn} onClick={onZoomIn} disabled={!canZoomIn}><IconZoomIn /></TBtn>

        {/* Lock: sits at the end of the zoom cluster — toggles whether zoom is
            preserved when switching images */}
        <TBtn
          label={zoomLocked ? strings.unlockZoom : strings.lockZoom}
          tip={zoomLocked ? strings.tipUnlockZoom : strings.tipLockZoom}
          active={zoomLocked}
          accent={zoomLocked ? C.lockActive : undefined}
          onClick={onToggleLock}
        >
          {zoomLocked ? <IconLockClosed /> : <IconLockOpen />}
        </TBtn>

        {showExif && (
          <>
            <Divider />
            <TBtn
              label={exifOpen ? strings.hideExif : strings.showExif}
              tip={exifOpen ? strings.tipHideExif : strings.tipShowExif}
              active={exifOpen}
              onClick={onToggleExif}
            >
              <IconExif />
            </TBtn>
          </>
        )}

        {showDelete && (
          <>
            <Divider />
            <TBtn
              label={strings.deleteImage}
              onClick={onDeleteImage}
            >
              <IconDelete />
            </TBtn>
          </>
        )}

        {showThumbnailToggle && (
          <>
            <Divider />
            <TBtn
              label={thumbnailsVisible ? strings.hideThumbnails : strings.showThumbnails}
              tip={thumbnailsVisible ? strings.hideThumbnails : strings.showThumbnails}
              active={thumbnailsVisible}
              aria-pressed={thumbnailsVisible}
              onClick={onToggleThumbnails}
            >
              <Icon><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M8 5v14M16 5v14" /></Icon>
            </TBtn>
          </>
        )}

        {showFullscreen && (
          <>
            <Divider />
            <TBtn
              label={fullscreenToggleOnly ? strings.toggleFullscreen : isFullscreen ? strings.exitFullscreen : strings.enterFullscreen}
              active={isFullscreen}
              onClick={onToggleFullscreen}
            >
              {isFullscreen ? <IconExitFullscreen /> : <IconEnterFullscreen />}
            </TBtn>
          </>
        )}

        {toolbarExtra != null && (
          <>
            <Divider />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {toolbarExtra}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
