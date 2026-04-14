import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Toolbar } from './Toolbar';
import type { ImageGroup, ImageItem, ImagePreviewProps, ImagePreviewRef, NativePercent } from './types';
import { useImageTransform } from './useImageTransform';
import { useZoomState } from './useZoomState';

const DEFAULT_STOPS: NativePercent[] = [10, 25, 50, 75, 100, 150, 200, 300, 400, 600, 800];

function normaliseImages(props: ImagePreviewProps): ImageItem[] {
  if (props.images && props.images.length > 0) return props.images;
  if (props.src) return [{ src: props.src, alt: props.alt }];
  return [];
}

/** Find which group the given flat index falls into. Returns null if no groups. */
function findGroup(groups: ImageGroup[] | undefined, idx: number): { group: ImageGroup; groupIdx: number } | null {
  if (!groups) return null;
  const groupIdx = groups.findIndex((g) => idx >= g.start && idx <= g.end);
  if (groupIdx === -1) return null;
  return { group: groups[groupIdx], groupIdx };
}

// ── Outer shell: only mounts the dialog when visible ───────────────────────
export const ImagePreview = forwardRef<ImagePreviewRef, ImagePreviewProps>(
  function ImagePreview(props, ref) {
    const images = normaliseImages(props);
    if (!props.visible || images.length === 0) return null;
    return <ImagePreviewInner {...props} ref={ref} />;
  },
);

// ── Inner dialog ───────────────────────────────────────────────────────────
const ImagePreviewInner = forwardRef<ImagePreviewRef, ImagePreviewProps>(
  function ImagePreviewInner(props, ref) {
    const {
      stops = DEFAULT_STOPS,
      initialMode = 'fit',
      initialNativePercent,
      firstZoomInStrategy = 'above-fit',
      zoomOutBelowMinBehaviour = 'noop',
      zoomInAtMaxBehaviour = 'noop',
      wheelEnabled = true,
      doubleClickEnabled = true,
      switchImageResetZoom = true,
      switchImageResetTransform = true,
      fitResetPan = true,
      defaultIndex = 0,
      groups,
      showFlip = false,
      arrows = 'both',
      initialZoomLocked = false,
      closeOnMaskClick = false,
      overlayClassName,
      overlayStyle,
      onClose,
      onZoomChange,
      onIndexChange,
      onMaxStopReached,
    } = props;

    // Derived arrow visibility flags
    const showSideArrows    = arrows === 'both' || arrows === 'side';
    const showToolbarArrows = arrows === 'both' || arrows === 'toolbar';

    const images = normaliseImages(props);
    const sortedStops = useMemo(() => [...stops].sort((a, b) => a - b), [stops]);

    const [currentIndex, setCurrentIndex] = useState(defaultIndex);
    const [zoomLocked, setZoomLocked] = useState(initialZoomLocked);
    const overlayRef = useRef<HTMLDivElement>(null);

    // ── Zoom state machine ──────────────────────────────────────────────────
    const zoomState = useZoomState({
      stops: sortedStops,
      initialMode,
      initialNativePercent,
      firstZoomInStrategy,
      zoomOutBelowMinBehaviour,
      zoomInAtMaxBehaviour,
      onZoomChange,
      onMaxStopReached,
    });
    const { mode, nativePercent, zoomIn, zoomOut, fit, setNative, reset, peekZoomIn, peekZoomOut } = zoomState;

    // ── Image transform ─────────────────────────────────────────────────────
    const {
      transform,
      isPanning,
      fitEquivalentNativePercent,
      setContainerEl,
      onImageLoad,
      resetImageDims,
      onPanStart,
      onPanMove,
      onPanEnd,
      resetPan,
      rotateCW,
      rotateCCW,
      flipHorizontal,
      flipVertical,
      resetOrientation,
      imageDims,
      containerSize,
      zoomAnchorTranslate,
    } = useImageTransform({ mode, nativePercent, fitResetPan });

    // ── Current image ───────────────────────────────────────────────────────
    const currentImage = images[currentIndex] ?? images[0];

    const prevSrcRef = useRef(currentImage.src);
    useEffect(() => {
      if (prevSrcRef.current !== currentImage.src) {
        resetImageDims();
        prevSrcRef.current = currentImage.src;
      }
    }, [currentImage.src, resetImageDims]);

    const imgRefCallback = useCallback(
      (el: HTMLImageElement | null) => {
        if (el && el.complete && el.naturalWidth > 0) {
          onImageLoad({ naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight });
        }
      },
      [onImageLoad],
    );

    // ── Group info ──────────────────────────────────────────────────────────
    const groupInfo = useMemo(() => findGroup(groups, currentIndex), [groups, currentIndex]);
    const currentGroup   = groupInfo?.group ?? null;
    const currentGroupIdx = groupInfo?.groupIdx ?? -1;

    // ── Navigation ──────────────────────────────────────────────────────────
    const goTo = useCallback(
      (idx: number) => {
        setCurrentIndex(idx);
        onIndexChange?.(idx);
        // Reset zoom only when not locked (and when switchImageResetZoom allows it).
        if (switchImageResetZoom && !zoomLocked) reset();
        resetPan();
        if (switchImageResetTransform) resetOrientation();
      },
      [onIndexChange, reset, resetPan, resetOrientation, switchImageResetZoom, switchImageResetTransform, zoomLocked],
    );

    // Within-group (or global when no groups) prev / next
    const prev = useCallback(() => {
      const boundary = currentGroup?.start ?? 0;
      if (currentIndex > boundary) goTo(currentIndex - 1);
    }, [currentIndex, currentGroup, goTo]);

    const next = useCallback(() => {
      const boundary = currentGroup?.end ?? images.length - 1;
      if (currentIndex < boundary) goTo(currentIndex + 1);
    }, [currentIndex, currentGroup, images.length, goTo]);

    // Jump to first image of previous / next group
    const prevGroup = useCallback(() => {
      if (groups && currentGroupIdx > 0) goTo(groups[currentGroupIdx - 1].start);
    }, [groups, currentGroupIdx, goTo]);

    const nextGroup = useCallback(() => {
      if (groups && currentGroupIdx < groups.length - 1) goTo(groups[currentGroupIdx + 1].start);
    }, [groups, currentGroupIdx, goTo]);

    // ── Auto-fade overlay controls (inactivity-based) ───────────────────────
    // After 3 s of no mouse movement, clicks, or key presses, all controls
    // fade to a ghost opacity (10%) over 1.6 s. Any activity instantly
    // restores them (0.12 s).  Applies to: arrows, close button, toolbar,
    // filename badge.
    const [controlsVisible, setControlsVisible] = useState(true);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetHideTimer = useCallback(() => {
      setControlsVisible(true);
      if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    }, []);

    // Kick off the timer on mount; clean up on unmount.
    useEffect(() => {
      resetHideTimer();
      return () => {
        if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
      };
    }, [resetHideTimer]);

    // ── Wheel ───────────────────────────────────────────────────────────────
    const handleWheel = useCallback(
      (e: WheelEvent) => {
        if (!wheelEnabled) return;
        e.preventDefault();

        const isZoomIn = e.deltaY < 0;

        // Peek the next zoom state so we can compute the new scale synchronously
        // before applying the state update.  This lets us anchor the translate to
        // the cursor position BEFORE the render that changes nativePercent, so
        // both state updates land in the same React batch.
        const peek = isZoomIn
          ? peekZoomIn(fitEquivalentNativePercent)
          : peekZoomOut();

        if (peek !== null) {
          const rect = overlayRef.current?.getBoundingClientRect();
          const cx = rect ? e.clientX - rect.left - rect.width  / 2 : 0;
          const cy = rect ? e.clientY - rect.top  - rect.height / 2 : 0;

          const s1 = transform.scale;
          const s2 =
            peek.mode === 'fit'
              ? (fitEquivalentNativePercent ?? peek.percent) / 100
              : peek.percent / 100;

          // Anchor translate: keeps the image pixel under the cursor stationary.
          zoomAnchorTranslate(s1, s2, cx, cy);
        }

        if (isZoomIn) zoomIn(fitEquivalentNativePercent);
        else zoomOut(fitEquivalentNativePercent);
      },
      [
        wheelEnabled, zoomIn, zoomOut, peekZoomIn, peekZoomOut,
        fitEquivalentNativePercent, transform.scale, zoomAnchorTranslate,
      ],
    );

    useEffect(() => {
      const el = overlayRef.current;
      if (!el) return;
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    // ── Keyboard ────────────────────────────────────────────────────────────
    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        // Any key press wakes up the controls.
        resetHideTimer();

        // Let the zoom-input field handle its own keys without interference.
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        const mod = e.ctrlKey || e.metaKey;

        switch (e.key) {
          case 'Escape':
            onClose?.();
            break;

          // Zoom in: + = ↑
          case '+':
          case '=':
          case 'ArrowUp':
            e.preventDefault();
            zoomIn(fitEquivalentNativePercent);
            break;

          // Zoom out: - ↓
          case '-':
          case 'ArrowDown':
            e.preventDefault();
            zoomOut(fitEquivalentNativePercent);
            break;

          // Fit / 100%
          case '0': fit(); break;
          case '1': setNative(100); break;

          // Space: toggle fit ↔ 100% (same as double-click)
          case ' ':
            e.preventDefault();
            mode === 'fit' ? setNative(100) : fit();
            break;

          // Navigate images / rotate (Ctrl/Cmd modifier)
          case 'ArrowLeft':
            e.preventDefault();
            if (mod) {
              rotateCCW();
            } else {
              // When at the first image of a group and a previous group exists,
              // arrow key mirrors the side "prev-group" double-chevron button.
              const atStart = currentGroup ? currentIndex === currentGroup.start : currentIndex === 0;
              if (atStart && currentGroupIdx > 0) prevGroup(); else prev();
            }
            break;
          case 'ArrowRight':
            e.preventDefault();
            if (mod) {
              rotateCW();
            } else {
              // When at the last image of a group and a next group exists,
              // arrow key mirrors the side "next-group" double-chevron button.
              const atEnd = currentGroup ? currentIndex === currentGroup.end : currentIndex === images.length - 1;
              const hasNext = groups ? currentGroupIdx < groups.length - 1 : false;
              if (atEnd && hasNext) nextGroup(); else next();
            }
            break;

          // Group navigation
          case 'PageUp':   e.preventDefault(); prevGroup(); break;
          case 'PageDown': e.preventDefault(); nextGroup(); break;
        }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [
      zoomIn, zoomOut, fit, setNative, mode,
      prev, next, prevGroup, nextGroup,
      rotateCW, rotateCCW,
      onClose, fitEquivalentNativePercent,
      resetHideTimer,
      // boundary-jump deps
      currentIndex, currentGroup, currentGroupIdx, groups, images.length,
    ]);

    // ── Double-click ────────────────────────────────────────────────────────
    const handleDoubleClick = useCallback(() => {
      if (!doubleClickEnabled) return;
      mode === 'fit' ? setNative(100) : fit();
    }, [doubleClickEnabled, mode, fit, setNative]);

    // ── Focus ───────────────────────────────────────────────────────────────
    useEffect(() => { overlayRef.current?.focus(); }, []);

    // ── Imperative ref ──────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      zoomIn: () => zoomIn(fitEquivalentNativePercent),
      zoomOut: () => zoomOut(fitEquivalentNativePercent),
      fit,
      setNative,
      rotateCW,
      rotateCCW,
      flipHorizontal,
      flipVertical,
      next,
      prev,
      nextGroup,
      prevGroup,
      getState: () => zoomState.getState(fitEquivalentNativePercent),
    }), [zoomIn, zoomOut, fit, setNative, rotateCW, rotateCCW, flipHorizontal, flipVertical,
        next, prev, nextGroup, prevGroup, zoomState, fitEquivalentNativePercent]);

    // ── Derived ─────────────────────────────────────────────────────────────
    const atMinStop = mode === 'native' && nativePercent <= sortedStops[0];
    const atMaxStop = mode === 'native' && nativePercent >= sortedStops[sortedStops.length - 1];
    const ready     = imageDims !== null && containerSize !== null;

    // ── Prevent the "shrink on first load" animation bug ─────────────────────
    // When ready flips from false→true, the CSS transform has just jumped to the
    // correct fit-scale in the same render.  If we make the image visible in
    // that same render, the `transform` transition fires and produces a visible
    // "zoom-out" animation.  Instead we keep opacity:0 for one animation frame
    // (so the browser paints the correct transform while the image is still
    // invisible), then set imageShowReady→true so only the opacity transitions.
    const [imageShowReady, setImageShowReady] = useState(false);
    useEffect(() => {
      if (!ready) { setImageShowReady(false); return; }
      const id = requestAnimationFrame(() => setImageShowReady(true));
      return () => cancelAnimationFrame(id);
    }, [ready]);

    // ── Loading indicator ────────────────────────────────────────────────────
    // Only show the spinner if loading takes longer than LOADER_DELAY_MS.
    // This avoids a distracting flash for fast-loading images (e.g. local
    // files in a VSCode webview) while still signalling progress for large
    // images that take several hundred milliseconds or more.
    const LOADER_DELAY_MS = 300;
    const [showLoader, setShowLoader] = useState(false);
    useEffect(() => {
      if (imageShowReady) { setShowLoader(false); return; }
      const id = setTimeout(() => setShowLoader(true), LOADER_DELAY_MS);
      return () => clearTimeout(id);
    }, [imageShowReady]);

    // Group-aware toolbar props
    const groupToolbarProps = currentGroup
      ? {
          groupCurrentIndex: currentIndex - currentGroup.start + 1,
          groupTotal:        currentGroup.end - currentGroup.start + 1,
          atGroupStart:      currentIndex === currentGroup.start,
          atGroupEnd:        currentIndex === currentGroup.end,
          hasPrevGroup:      currentGroupIdx > 0,
          hasNextGroup:      groups ? currentGroupIdx < groups.length - 1 : false,
          groupName:         currentGroup.name,
          onPrevGroup:       prevGroup,
          onNextGroup:       nextGroup,
        }
      : {};

    return (
      <div
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-label="图片预览"
        tabIndex={-1}
        className={overlayClassName}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          /* macOS-style frosted glass: semi-transparent + blur */
          background: 'rgba(10, 12, 20, 0.70)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          outline: 'none',
          ...overlayStyle,
        }}
        onClick={(e) => { if (closeOnMaskClick && e.target === e.currentTarget) onClose?.(); }}
        onMouseMove={resetHideTimer}
        onMouseDown={resetHideTimer}
      >
        {/* ── Close button — top-right corner ── */}
        <CloseButton onClick={() => onClose?.()} visible={controlsVisible} />

        {/* ── Viewport ── */}
        {/* NOTE: This div is 100 % × 100 % and covers the whole overlay, so mask
            clicks land here (not on the overlay root). We mirror the same check. */}
        <div
          ref={setContainerEl}
          onClick={(e) => { if (closeOnMaskClick && e.target === e.currentTarget) onClose?.(); }}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            key={currentImage.src}
            src={currentImage.src}
            alt={currentImage.alt ?? ''}
            draggable={false}
            ref={imgRefCallback}
            onLoad={(e) => {
              const img = e.currentTarget;
              onImageLoad({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
            }}
            onPointerDown={onPanStart}
            onPointerMove={onPanMove}
            onPointerUp={(e) => onPanEnd(e)}
            onPointerCancel={(e) => onPanEnd(e)}
            onLostPointerCapture={(e) => onPanEnd(e)}
            onDoubleClick={handleDoubleClick}
            style={{
              width:     imageDims ? imageDims.naturalWidth  : 'auto',
              height:    imageDims ? imageDims.naturalHeight : 'auto',
              maxWidth:  imageDims ? 'none' : '100%',
              maxHeight: imageDims ? 'none' : '100%',
              transform: transform.cssTransform,
              transformOrigin: 'center center',
              transition: isPanning
                ? 'none'
                : !imageShowReady
                  ? 'opacity 0.15s ease'        // frame 1: transform settles, no anim
                  : 'transform 0.3s ease, opacity 0.15s ease',
              opacity: imageShowReady ? 1 : 0,
              cursor:     mode === 'native' ? 'grab' : 'zoom-in',
              userSelect: 'none',
              touchAction: 'none',
              display:    'block',
            }}
          />

          {/* ── Loading spinner ── */}
          {/* Keyframes are defined inline once; harmless to repeat on re-mount. */}
          <style>{`@keyframes _rip_spin{to{transform:rotate(360deg)}}`}</style>
          <div
            aria-label="图片加载中"
            aria-live="polite"
            style={{
              position:      'absolute',
              inset:         0,
              display:       'flex',
              alignItems:    'center',
              justifyContent:'center',
              pointerEvents: 'none',
              opacity:       showLoader ? 1 : 0,
              transition:    showLoader ? 'none' : 'opacity 0.2s ease',
            }}
          >
            <div style={{
              width:         28,
              height:        28,
              borderRadius:  '50%',
              border:        '2.5px solid rgba(180, 200, 230, 0.12)',
              borderTopColor:'rgba(180, 200, 230, 0.55)',
              animation:     '_rip_spin 0.75s linear infinite',
            }} />
          </div>
        </div>

        {/* ── Side nav arrows ────────────────────────────────────────────────
             Rules:
             · Arrow only renders when navigation is possible — never grayed-out.
             · At a group boundary with an adjacent group: swap the arrow for a
               "jump to next/prev group" button (double-chevron icon).
             · Single group: hide when at the first / last image. ── */}
        {(() => {
          if (!showSideArrows) return null;
          const isAtStart = currentGroup
            ? currentIndex === currentGroup.start
            : currentIndex === 0;
          const isAtEnd = currentGroup
            ? currentIndex === currentGroup.end
            : currentIndex === images.length - 1;
          const hasPrevGroupNav = !!(currentGroup && currentGroupIdx > 0);
          const hasNextGroupNav = !!(currentGroup && groups && currentGroupIdx < groups.length - 1);

          const showLeft  = !isAtStart || hasPrevGroupNav;
          const showRight = !isAtEnd   || hasNextGroupNav;
          const leftIsGroup  = isAtStart && hasPrevGroupNav;
          const rightIsGroup = isAtEnd   && hasNextGroupNav;

          return (
            <>
              {showLeft && (
                <NavArrow
                  direction="left"
                  isGroupJump={leftIsGroup}
                  onClick={leftIsGroup ? prevGroup : prev}
                  label={leftIsGroup ? '上一组' : '上一张'}
                  visible={controlsVisible}
                />
              )}
              {showRight && (
                <NavArrow
                  direction="right"
                  isGroupJump={rightIsGroup}
                  onClick={rightIsGroup ? nextGroup : next}
                  label={rightIsGroup ? '下一组' : '下一张'}
                  visible={controlsVisible}
                />
              )}
            </>
          );
        })()}

        <Toolbar
          controlsVisible={controlsVisible}
          mode={mode}
          nativePercent={nativePercent}
          fitEquivalentNativePercent={fitEquivalentNativePercent}
          stops={sortedStops}
          atMinStop={atMinStop}
          atMaxStop={atMaxStop}
          totalImages={images.length}
          currentIndex={currentIndex}
          imageName={currentImage.name}
          showFlip={showFlip}
          showToolbarArrows={showToolbarArrows}
          zoomLocked={zoomLocked}
          onToggleLock={() => setZoomLocked((v) => !v)}
          onZoomIn={() => zoomIn(fitEquivalentNativePercent)}
          onZoomOut={() => zoomOut(fitEquivalentNativePercent)}
          onFit={fit}
          onOneToOne={() => setNative(100)}
          onSetNative={setNative}
          onRotateCW={rotateCW}
          onRotateCCW={rotateCCW}
          onFlipH={flipHorizontal}
          onFlipV={flipVertical}
          onPrev={prev}
          onNext={next}
          {...groupToolbarProps}
        />
      </div>
    );
  },
);

// ── Close button ───────────────────────────────────────────────────────────

function CloseButton({ onClick, visible }: { onClick(): void; visible: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      aria-label="关闭 (Esc)"
      title="关闭 (Esc)"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'absolute',
        top: 14,
        right: 16,
        zIndex: 20,
        width: 46,
        height: 46,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.22)',
        background: hover ? 'rgba(8,14,26,0.78)' : 'rgba(8,14,26,0.50)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.45)',
        color: 'rgba(235,242,255,0.92)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: visible ? 1 : 0.10,
        transition: visible
          ? 'opacity 0.12s ease, background 0.15s'
          : 'opacity 1.6s ease, background 0.15s',
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
        width={18} height={18} aria-hidden="true">
        <line x1="18" y1="6" x2="6"  y2="18"/>
        <line x1="6"  y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  );
}

// ── Side nav arrow ─────────────────────────────────────────────────────────

interface NavArrowProps {
  direction: 'left' | 'right';
  /** When true the icon becomes a double-chevron (group jump). */
  isGroupJump?: boolean;
  onClick(): void;
  label: string;
  visible: boolean;
}

function NavArrow({ direction, isGroupJump = false, onClick, label, visible }: NavArrowProps) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'absolute',
        top: '50%',
        [direction]: 16,
        transform: 'translateY(-50%)',
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.28)',
        background: hover ? 'rgba(8,14,26,0.80)' : 'rgba(8,14,26,0.52)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.55)',
        color: 'rgba(235,242,255,0.92)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        opacity: visible ? 1 : 0.10,
        transition: visible
          ? 'opacity 0.12s ease, background 0.15s, box-shadow 0.15s'
          : 'opacity 1.6s ease, background 0.15s, box-shadow 0.15s',
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2.5} width={22} height={22} aria-hidden="true">
        {direction === 'left'
          ? isGroupJump
            ? <><polyline points="19,18 13,12 19,6"/><polyline points="11,18 5,12 11,6"/></>
            : <polyline points="15,18 9,12 15,6"/>
          : isGroupJump
            ? <><polyline points="5,18 11,12 5,6"/><polyline points="13,18 19,12 13,6"/></>
            : <polyline points="9,18 15,12 9,6"/>
        }
      </svg>
    </button>
  );
}
