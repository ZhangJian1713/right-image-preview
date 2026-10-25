import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Minimap, MINIMAP_BOTTOM } from '../controls/Minimap';
import { ImagePreviewCloseButton } from '../controls/ImagePreviewCloseButton';
import { ExifInfoPanel } from '../controls/ExifInfoPanel';
import { DisplayStageLayers } from '../stage/DisplayStageLayers';
import { ThumbnailsStrip } from '../controls/ThumbnailsStrip';
import { ImagePreviewNavArrow } from '../controls/ImagePreviewNavArrow';
import { Toolbar } from '../controls/Toolbar';
import {
  KEYBOARD_PAN_STEP_VIEWPORT_FRACTION,
  MIN_PROGRESSIVE_THUMB_VISIBLE_MS,
  NAV_HOLD_MIN_VISIBLE_MS,
  PROGRESSIVE_MAIN_DEFAULT_FADE_MS,
  PREVIEW_LOADER_DELAY_MS,
  THUMBNAIL_STRIP_TOOLBAR_GAP_PX,
  thumbnailStripTotalHeightPx,
  toolbarZoomDropdownWidthPx,
  toolbarZoomLabelSlotPx,
} from '../imagePreviewTuning';
import { injectGlobalStyle } from '../lib/injectGlobalStyle';
import { findGroup } from '../lib/imagePreviewFindGroup';
import { useStageHandoff } from '../stage/useStageHandoff';
import { useMainImageDecode } from '../stage/useMainImageDecode';
import { useStageReveal } from '../stage/useStageReveal';
import {
  isLocalPackBuild,
  LOCAL_PACK_BUILD_AT,
  PACKAGE_VERSION,
} from '../lib/localPackBuildInfo';
import { mergeByteAndDisplayStatus, PRELOAD_DISPLAY_SETTLE_MS } from '../preload/neighborDisplayPreload';
import {
  resolveDefaultGroupedFlatIndex,
  resolvePreviewImages,
} from '../lib/flattenGroupedImages';
import { mergeStrings, resolveStrings } from '../i18n/locale';
import type { ImagePreviewProps, ImagePreviewRef, NativePercent, NeighborPreloadStatusMap } from '../types';
import { useImagePreviewKeyboard } from '../interaction/useImagePreviewKeyboard';
import { usePointerNavigation } from '../interaction/usePointerNavigation';
import { useHoldStagePresented } from '../stage/useHoldStagePresented';
import { useThumbPacedNavigation } from '../interaction/useThumbPacedNavigation';
import { useImageTransform } from '../transform/useImageTransform';
import { useNeighborDisplayPreload } from '../preload/useNeighborDisplayPreload';
import { useNeighborPreload } from '../preload/useNeighborPreload';
import { useProgressiveMainImage } from '../stage/useProgressiveMainImage';
import { usePinchZoom } from '../interaction/usePinchZoom';
import { useWheelZoom } from '../interaction/useWheelZoom';
import { useZoomState } from '../transform/useZoomState';
import { resolveZoomStops } from '../transform/zoomStops';
import type { ImageDimensions } from '../model/geometry';
import { useAdaptiveZoom } from '../transform/useAdaptiveZoom';
import { useClickZoomGesture } from '../interaction/useClickZoomGesture';
import { usePreviewFullscreen } from './usePreviewFullscreen';
import { usePreviewControls } from './usePreviewControls';
import { useDelayedIndicator } from './useDelayedIndicator';

const DEFAULT_STOPS: NativePercent[] = [10, 25, 50, 75, 100, 125, 150, 175, 200];

injectGlobalStyle('rip-spin', '@keyframes _rip_spin{to{transform:rotate(360deg)}}');

// ── Inner dialog ───────────────────────────────────────────────────────────
export const ImagePreviewInner = forwardRef<ImagePreviewRef, ImagePreviewProps>(
  function ImagePreviewInner(props, ref) {
    const {
      stops = DEFAULT_STOPS,
      smallImageZoom,
      initialMode = 'fit',
      initialNativePercent,
      fitMaxNativePercent,
      firstZoomInStrategy = 'above-fit',
      zoomOutBelowMinBehaviour = 'noop',
      zoomInAtMaxBehaviour = 'noop',
      wheelEnabled = true,
      doubleClickEnabled = true,
      // 显式的旧双击配置保留原交互；未配置时默认单击，显式单击设置优先。
      clickZoomEnabled = props.doubleClickEnabled !== true,
      pinchEnabled = true,
      switchImageResetZoom = true,
      switchImageResetTransform = true,
      fitResetPan = true,
      defaultIndex = 0,
      showFlip = false,
      showRotateCCW = true,
      showExif = false,
      initialExifOpen = false,
      showDelete = false,
      arrows = 'both',
      initialZoomLocked = false,
      showMinimap = true,
      keyboardEnabled = true,
      onShowShortcuts,
      showThumbnails = false,
      showThumbnailToggle = false,
      onThumbnailsVisibleChange,
      onThumbnailVisibleIndexesChange,
      thumbnailsScope = 'group',
      presentation = 'overlay',
      fullscreen,
      onFullscreenError,
      preloadRadius = 1,
      preloadDisplaySlots = 0,
      preloadDisplaySettleMs = PRELOAD_DISPLAY_SETTLE_MS,
      holdMinVisibleMs = NAV_HOLD_MIN_VISIBLE_MS,
      preloadMemoryBudgetBytes,
      estimateDecodedBytes,
      preloadDisplayMode = 'slot',
      onPreloadIndexesChange,
      onPreloadStatusChange,
      showThumbnailPreloadStatus = false,
      showSwitchLoader = true,
      chrome = 'default',
      progressiveMain = true,
      progressivePlaceholderMinMs = MIN_PROGRESSIVE_THUMB_VISIBLE_MS,
      progressiveFadeMs = PROGRESSIVE_MAIN_DEFAULT_FADE_MS,
      onMainImageLoadStageChange,
      closeOnMaskClick = false,
      overlayClassName,
      overlayStyle,
      language,
      strings: stringOverrides,
      index: controlledIndex,
      toolbarExtra,
      onClose,
      onZoomChange,
      onIndexChange,
      onMaxStopReached,
      onImageError,
      errorFallback,
      onDeleteImage,
    } = props;

    const isContained = presentation === 'contained';
    const isIndexControlled = controlledIndex !== undefined;
    const idleOpacity = chrome === 'minimal' ? 0 : 0.1;
    const minimapIdleOpacity = chrome === 'minimal' ? 0 : 0.12;

    // Resolve locale strings once; re-resolves when `language` or overrides change.
    const t = useMemo(
      () => mergeStrings(resolveStrings(language), stringOverrides),
      [language, stringOverrides],
    );
    const zoomLabelSlotPx = useMemo(() => toolbarZoomLabelSlotPx(language), [language]);
    const zoomDropdownWidthPx = useMemo(() => toolbarZoomDropdownWidthPx(language), [language]);

    const { images, groupSlices } = useMemo(
      () => resolvePreviewImages(props),
      // Intentionally omit other props — only data fields affect the resolved list.
      // eslint-disable-next-line react-hooks/exhaustive-deps -- groupedImages, images, src, alt, minimap*, exif
      [props.groupedImages, props.images, props.src, props.alt, props.minimapSrc, props.minimap, props.exif],
    );

    const hasGroups = Array.isArray(groupSlices) && groupSlices.length > 0;
    // `arrows` only gates the side-of-image buttons. Toolbar prev/next are always on when `groupedImages` is used.
    const showSideArrows    = arrows === 'both' || arrows === 'side';
    const showToolbarArrows = hasGroups || arrows === 'both' || arrows === 'toolbar';

    const [uncontrolledIndex, setCurrentIndex] = useState(() => {
      if (hasGroups && props.defaultGroupedSelection && props.groupedImages?.length) {
        return resolveDefaultGroupedFlatIndex(props.groupedImages, props.defaultGroupedSelection);
      }
      if (controlledIndex !== undefined) return controlledIndex;
      return defaultIndex;
    });

    // Read controlled props directly; mirroring them in an Effect commits the old image first.
    const currentIndex = controlledIndex ?? uncontrolledIndex;

    const [zoomLocked, setZoomLocked] = useState(initialZoomLocked);
    const [exifOpen, setExifOpen] = useState(initialExifOpen && showExif);
    const [minimapDragging, setMinimapDragging] = useState(false);
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    const currentImage = images[currentIndex] ?? images[0];
    const [originalSize, setOriginalSize] = useState<{ src: string; dims: ImageDimensions } | null>(null);
    const sortedStops = useMemo(() => resolveZoomStops(stops, smallImageZoom,
      originalSize?.src === currentImage.src ? originalSize.dims : null),
    [stops, smallImageZoom, originalSize, currentImage.src]);
    const maxNativePercent = sortedStops[sortedStops.length - 1];

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
      panByDelta,
      panJumpToNatural,
    } = useImageTransform({ mode, nativePercent, fitResetPan,
      fitMaxNativePercent: fitMaxNativePercent !== undefined && Number.isFinite(fitMaxNativePercent) && fitMaxNativePercent > 0
        ? Math.min(fitMaxNativePercent, maxNativePercent) : Math.min(100, maxNativePercent) });
    const onOriginalImageLoad = useCallback((dims: ImageDimensions) => {
      setFailedSrc((previous) => previous === currentImage.src ? null : previous);
      setOriginalSize((previous) => previous?.src === currentImage.src &&
        previous.dims.naturalWidth === dims.naturalWidth && previous.dims.naturalHeight === dims.naturalHeight
        ? previous : { src: currentImage.src, dims });
      onImageLoad(dims);
    }, [currentImage.src, onImageLoad]);

    // ── Current image ───────────────────────────────────────────────────────
    const imageLoadError = failedSrc === currentImage.src;
    const mediaViewportRef = useRef<HTMLDivElement | null>(null);
    const setMediaViewport = useCallback((element: HTMLDivElement | null) => {
      mediaViewportRef.current = element;
      setContainerEl(element);
    }, [setContainerEl]);
    const adaptive = useAdaptiveZoom({
      enabled: clickZoomEnabled && imageDims !== null && containerSize !== null,
      viewportRef: mediaViewportRef,
      fitEquivalentNativePercent,
      zoomState,
      zoomAnchorTranslate,
    });
    const isImagePoint = useCallback((clientX: number, clientY: number) => {
      if (!imageDims || !containerSize || transform.scale <= 0) return false;
      const rect = mediaViewportRef.current?.getBoundingClientRect();
      if (!rect) return false;
      const x = clientX - rect.left - rect.width / 2 - transform.translateX;
      const y = clientY - rect.top - rect.height / 2 - transform.translateY;
      const radians = transform.rotation * Math.PI / 180;
      const localX = Math.cos(radians) * x + Math.sin(radians) * y;
      const localY = -Math.sin(radians) * x + Math.cos(radians) * y;
      return Math.abs(localX) <= imageDims.naturalWidth * transform.scale / 2 &&
        Math.abs(localY) <= imageDims.naturalHeight * transform.scale / 2;
    }, [imageDims, containerSize, transform]);
    const clickGesture = useClickZoomGesture({
      enabled: clickZoomEnabled && imageDims !== null && containerSize !== null,
      resourceKey: currentImage.src, mode, onCycle: adaptive.cycle,
      onPanStart, onPanMove, onPanEnd,
    });

    const {
      displayReadyIndexes,
      isSrcDisplayReady,
      getMeta,
      markSrcDisplayReady,
      slotRenderEntries,
      onSlotImgLoad,
    } = useNeighborDisplayPreload({
      images,
      currentIndex,
      radius: preloadRadius,
      displaySlots: preloadDisplaySlots,
      memoryBudgetBytes: preloadMemoryBudgetBytes,
      estimateDecodedBytes,
      mode: preloadDisplayMode,
      interactionBusy: isPanning || minimapDragging,
      settleMs: preloadDisplaySettleMs,
    });

    /**
     * Keep progressive underlay whenever we have `minimapSrc` — never blank the stage.
     * Display-ready only skips artificial dwell.
     */
    const preferFastReveal = progressiveMain && isSrcDisplayReady(currentImage.src);
    const knownDisplayMeta = preferFastReveal ? getMeta(currentImage.src) ?? null : null;

    const stage = useStageHandoff({ src: currentImage.src, index: currentIndex,
      dims: imageDims, cssTransform: transform.cssTransform, slots: slotRenderEntries });
    const { visit, outgoing, frozenBySrc, displayLayers, mainPainted: paceMainPainted,
      underlayPainted: paceUnderlayPainted, markMainPainted, markUnderlayPainted,
      getMainEl, bindLayerRef, prepareNavigation, reveal } = stage;
    const holdSrc = outgoing?.src ?? null;
    const outgoingHolding = !!holdSrc && holdSrc !== currentImage.src;
    const underlayElRef = useRef<HTMLImageElement | null>(null);

    // Cold open from gallery: seed layout from host EXIF before decode so the stage box
    // has a real aspect (avoids underlay-in-collapsed-box → tall thin strip).
    useLayoutEffect(() => {
      const w = Number(currentImage.exif?.width);
      const h = Number(currentImage.exif?.height);
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        onImageLoad({ naturalWidth: w, naturalHeight: h });
      }
    }, [currentImage.src, currentImage.exif?.width, currentImage.exif?.height, onImageLoad]);

    // Seed the incoming layout from a retained bitmap or display-ready metadata.
    useLayoutEffect(() => {
      const el = getMainEl();
      const meta = getMeta(visit.src);
      if (el?.complete && el.naturalWidth > 0) {
        onImageLoad({ naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight });
      } else if (meta) onImageLoad(meta);
      else if (!outgoing) resetImageDims();
      // The source visit owns this initialization; uncovering must not clear its dimensions.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visit, getMainEl, getMeta, onImageLoad, resetImageDims]);

    const progressive = useProgressiveMainImage({
      mainSrc: currentImage.src,
      selection: visit,
      minimapSrc: currentImage.minimapSrc,
      minimapCustom: !!currentImage.minimap,
      enabled: progressiveMain,
      placeholderMinVisibleMs: progressivePlaceholderMinMs,
      preferFastReveal,
      knownDimensions: knownDisplayMeta,
      onImageLayout: onImageLoad,
      onStageChange: onMainImageLoadStageChange,
    });

    const { onMainImgDecoded } = progressive;
    const thumbOnly = progressive.preloadStage === 'thumb-only';
    const getRevealEl = useCallback(() => thumbOnly ? underlayElRef.current : getMainEl(), [thumbOnly, getMainEl]);

    const onCurrentLayerLoad = useMainImageDecode({ visit, getMainEl, preferFastReveal,
      onImageLoad: onOriginalImageLoad, onDecoded: onMainImgDecoded, onPainted: markMainPainted });

    const ready = imageDims !== null && containerSize !== null &&
      containerSize.width > 1 && containerSize.height > 1;
    const hideMainUntilDecoded = progressive.pipelineActive && !progressive.fullDecoded;
    const { imageShowReady, suppressTransformForSrcSwitch } = useStageReveal({
      visit, ready, holding: outgoingHolding, contentLoaded: thumbOnly ? paceUnderlayPainted : paceMainPainted,
      dims: imageDims, hideUntilReady: thumbOnly ? !paceUnderlayPainted : hideMainUntilDecoded,
      preferFastReveal: preferFastReveal && !thumbOnly, getRevealEl, onDecoded: onMainImgDecoded, reveal });

    // ── Group info ──────────────────────────────────────────────────────────
    const groupInfo = useMemo(() => findGroup(groupSlices, currentIndex), [groupSlices, currentIndex]);
    const currentGroup   = groupInfo?.group ?? null;
    const currentGroupIdx = groupInfo?.groupIdx ?? -1;

    // ── Navigation ──────────────────────────────────────────────────────────
    const goTo = useCallback(
      (idx: number) => {
        if (images.length === 0) return;
        const clamped = Math.max(0, Math.min(images.length - 1, idx));
        if (clamped === currentIndex) return;

        // Capture the displayed pose before zoom/pan/orientation resets.
        prepareNavigation();

        if (!isIndexControlled) setCurrentIndex(clamped);
        setFailedSrc(null);
        onIndexChange?.(clamped);
        // Reset zoom only when not locked (and when switchImageResetZoom allows it).
        if (switchImageResetZoom && !zoomLocked) reset();
        resetPan();
        if (switchImageResetTransform) resetOrientation();
      },
      [
        images,
        currentIndex,
        prepareNavigation,
        isIndexControlled,
        onIndexChange,
        reset,
        resetPan,
        resetOrientation,
        switchImageResetZoom,
        switchImageResetTransform,
        zoomLocked,
      ],
    );

    // Flat prev / next across the full list (crosses group boundaries).
    // Group jumps remain PageUp/PageDown + toolbar ⏮/⏭.
    const prev = useCallback(() => {
      if (currentIndex > 0) goTo(currentIndex - 1);
    }, [currentIndex, goTo]);

    const next = useCallback(() => {
      if (currentIndex < images.length - 1) goTo(currentIndex + 1);
    }, [currentIndex, images.length, goTo]);

    // Jump to first image of previous / next group
    const prevGroup = useCallback(() => {
      if (groupSlices && currentGroupIdx > 0) goTo(groupSlices[currentGroupIdx - 1].start);
    }, [groupSlices, currentGroupIdx, goTo]);

    const nextGroup = useCallback(() => {
      if (groupSlices && currentGroupIdx < groupSlices.length - 1) goTo(groupSlices[currentGroupIdx + 1].start);
    }, [groupSlices, currentGroupIdx, goTo]);

    // Keep currentIndex in range when the host removes images (e.g. after onDeleteImage).
    useEffect(() => {
      if (images.length === 0) return;
      if (currentIndex > images.length - 1) {
        const nextIdx = images.length - 1;
        if (!isIndexControlled) setCurrentIndex(nextIdx);
        onIndexChange?.(nextIdx);
      }
    }, [images.length, currentIndex, onIndexChange, isIndexControlled]);

    const { status: neighborByteStatus, markSrcReady } = useNeighborPreload({
      images,
      currentIndex,
      radius: preloadRadius,
      settleMs: preloadDisplaySettleMs,
      onPreloadIndexesChange,
    });

    const neighborPreloadStatus = useMemo(
      () =>
        mergeByteAndDisplayStatus(
          neighborByteStatus,
          displayReadyIndexes,
        ) as NeighborPreloadStatusMap,
      [neighborByteStatus, displayReadyIndexes],
    );

    useEffect(() => {
      onPreloadStatusChange?.(neighborPreloadStatus);
    }, [neighborPreloadStatus, onPreloadStatusChange]);

    const deleteCurrentImage = useCallback(() => {
      const item = images[currentIndex];
      if (!item) return;

      const willBeEmpty = images.length <= 1;
      const nextIdx = willBeEmpty
        ? null
        : currentIndex < images.length - 1
          ? currentIndex
          : currentIndex - 1;

      onDeleteImage?.(currentIndex, item);

      if (willBeEmpty) {
        onClose?.();
        return;
      }

      // Deleting the last item: move focus back before/while the host updates props.
      if (nextIdx != null && nextIdx !== currentIndex) {
        goTo(nextIdx);
      }
    }, [images, currentIndex, onDeleteImage, onClose, goTo]);

    const keyboardPanStepPx = useMemo(() => {
      if (!containerSize) return 0;
      return Math.min(containerSize.width, containerSize.height) * KEYBOARD_PAN_STEP_VIEWPORT_FRACTION;
    }, [containerSize]);

    const { controlsVisible, resetHideTimer } = usePreviewControls();

    // ── Wheel zoom ───────────────────────────────────────────────────────────
    useWheelZoom({
      containerRef: overlayRef,
      enabled: wheelEnabled,
      mode,
      currentScale: transform.scale,
      fitEquivalentNativePercent,
      zoomIn,
      zoomOut,
      peekZoomIn,
      peekZoomOut,
      zoomAnchorTranslate,
    });

    // ── Pinch-to-zoom (touch / multi-touch trackpad) ─────────────────────────
    usePinchZoom({
      containerRef: overlayRef,
      enabled: pinchEnabled,
      resourceKey: currentImage.src,
      mode,
      currentScale: transform.scale,
      stops: sortedStops,
      fitEquivalentNativePercent,
      fit,
      setNative,
      zoomAnchorTranslate,
    });

    const [keyboardActive, setKeyboardActive] = useState(!isContained);
    const { isFullscreen, requestFullscreen, exitFullscreen, toggleFullscreen,
      fullscreenActive, toggleOnly } = usePreviewFullscreen({
      rootRef: overlayRef, adapter: fullscreen, onError: onFullscreenError,
    });

    // Cached underlay may complete before React attaches onLoad — sync from the DOM node.
    useLayoutEffect(() => {
      if (!progressive.showMinimapUnderlay || !currentImage.minimapSrc) return;
      const el = underlayElRef.current;
      if (el && el.complete && el.naturalWidth > 0) {
        markUnderlayPainted();
      }
    }, [
      currentImage.src,
      currentImage.minimapSrc,
      progressive.showMinimapUnderlay,
      currentIndex,
      markUnderlayPainted,
    ]);

    const getHoldUnderlayEl = useCallback(() => underlayElRef.current, []);

    const thumbReadyForPace = useHoldStagePresented({
      visitKey: `${currentIndex}:${currentImage.src}`,
      imageLoadError:
        !thumbOnly && (imageLoadError || progressive.preloadStage === 'error'),
      imageShowReady,
      // Outgoing hold covers the stage — do not treat incoming underlay as "presented".
      showMinimapUnderlay: progressive.showMinimapUnderlay && !holdSrc,
      underlayPainted: paceUnderlayPainted,
      pipelineActive: progressive.pipelineActive,
      fullDecoded: progressive.fullDecoded,
      thumbOnly,
      mainPainted: paceMainPainted,
      getUnderlayEl: getHoldUnderlayEl,
      getMainEl,
    });

    const { beginHold: beginNavHold, endHold: endNavHold } = useThumbPacedNavigation({
      currentIndex,
      thumbReady: thumbReadyForPace,
      prev,
      next,
      minVisibleMs: holdMinVisibleMs,
    });

    const pointerNavigation = usePointerNavigation({ beginHold: beginNavHold, endHold: endNavHold, prev, next });

    const canKeyboardPan = mode === 'native' && !!imageDims && !!containerSize && (() => {
      const swapped = Math.abs(transform.rotation % 180) === 90;
      const width = swapped ? imageDims.naturalHeight : imageDims.naturalWidth;
      const height = swapped ? imageDims.naturalWidth : imageDims.naturalHeight;
      return width * transform.scale > containerSize.width + 0.5 || height * transform.scale > containerSize.height + 0.5;
    })();
    useImagePreviewKeyboard({
      resetHideTimer,
      onClose,
      zoomIn,
      zoomOut,
      fit,
      setNative,
      mode,
      prev,
      next,
      prevGroup,
      nextGroup,
      rotateCW,
      rotateCCW,
      panByDelta,
      keyboardPanStepPx,
      fitEquivalentNativePercent,
      cycleZoom: clickZoomEnabled ? adaptive.cycle : undefined,
      onDeleteImage: showDelete ? deleteCurrentImage : undefined,
      first: () => goTo(0),
      last: () => goTo(images.length - 1),
      canPan: canKeyboardPan,
      toggleFullscreen,
      showShortcuts: onShowShortcuts,
      toggleExif: showExif ? () => setExifOpen((open) => !open) : undefined,
      keyboardActive: keyboardEnabled && (!isContained || keyboardActive),
      isFullscreen,
      exitFullscreen,
      beginNavHold,
      endNavHold,
    });

    // ── Double-click ────────────────────────────────────────────────────────
    const handleDoubleClick = useCallback(() => {
      if (!doubleClickEnabled || clickZoomEnabled) return;
      if (mode === 'fit') setNative(100);
      else fit();
    }, [doubleClickEnabled, clickZoomEnabled, mode, fit, setNative]);

    // ── Focus ───────────────────────────────────────────────────────────────
    // Overlay: focus on mount (modal). Contained: do not steal focus; activate keys when focused.
    useEffect(() => {
      if (isContained) return;
      overlayRef.current?.focus();
    }, [isContained]);

    useEffect(() => {
      if (!isContained) {
        setKeyboardActive(true);
        return;
      }
      const root = overlayRef.current;
      if (!root) return;
      const onFocusIn = () => setKeyboardActive(true);
      const onFocusOut = (e: FocusEvent) => {
        const next = e.relatedTarget as Node | null;
        if (next && root.contains(next)) return;
        setKeyboardActive(false);
      };
      root.addEventListener('focusin', onFocusIn);
      root.addEventListener('focusout', onFocusOut);
      setKeyboardActive(root.contains(document.activeElement));
      return () => {
        root.removeEventListener('focusin', onFocusIn);
        root.removeEventListener('focusout', onFocusOut);
      };
    }, [isContained]);

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
      goTo,
      requestFullscreen,
      exitFullscreen,
      isFullscreen,
      getState: () => zoomState.getState(fitEquivalentNativePercent),
    }), [
      zoomIn, zoomOut, fit, setNative, rotateCW, rotateCCW, flipHorizontal, flipVertical,
      next, prev, nextGroup, prevGroup, goTo, requestFullscreen, exitFullscreen, isFullscreen,
      zoomState, fitEquivalentNativePercent,
    ]);

    // ── Derived ─────────────────────────────────────────────────────────────
    const atMinStop = mode === 'native' && nativePercent <= sortedStops[0];
    const atMaxStop = mode === 'native' && nativePercent >= sortedStops[sortedStops.length - 1];
    // Current main image counts as ready once the full src is usable.
    useEffect(() => {
      const src = currentImage?.src;
      if (!src || imageLoadError) return;
      const decoded = progressive.pipelineActive ? progressive.fullDecoded : imageShowReady && paceMainPainted;
      if (!decoded) return;
      markSrcReady(src);
      markSrcDisplayReady(src, imageDims ?? undefined);
    }, [
      currentImage?.src,
      imageLoadError,
      paceMainPainted,
      progressive.pipelineActive,
      progressive.fullDecoded,
      imageShowReady,
      imageDims,
      markSrcReady,
      markSrcDisplayReady,
    ]);

    // Short cold loads stay quiet; the indicator owns its loading-period deadline.
    const showLoader = useDelayedIndicator(!imageShowReady, PREVIEW_LOADER_DELAY_MS);

    /** Minimap bitmap is on screen while main is still decoding — no empty black viewport. */
    const thumbHoldingMainArea =
      progressive.pipelineActive &&
      progressive.showMinimapUnderlay &&
      !progressive.fullDecoded;

    /** Same window as thumb-on-main / image switch: no `transform` easing (avoids shrink/zoom pop). */
    const suppressTransformTransition =
      thumbHoldingMainArea || suppressTransformForSrcSwitch || outgoingHolding;

    /**
     * Waiting for the *current* main to be the visible sharp frame.
     * Outgoing hold and progressive “hide until decoded” both count — prefer-fast-reveal
     * must not hide the L4 spinner during that gap (users otherwise see a stuck previous
     * frame with no feedback).
     */
    const awaitingMainReveal = outgoingHolding || (thumbOnly ? !paceUnderlayPainted : hideMainUntilDecoded);

    // While progressive loading is incomplete, hideMainUntilDecoded already covers
    // both preloading and the visible underlay. Thumbnail fallback has its own DOM
    // load signal and never claims fullDecoded or warms the original's ready cache.
    const showCenterLoader =
      showSwitchLoader && !imageLoadError &&
      (awaitingMainReveal ||
        (!progressive.pipelineActive && showLoader) ||
        (progressive.pipelineActive && progressive.preloadStage === 'error' && showLoader));

    const opacityTransition =
      progressive.pipelineActive && progressiveFadeMs > 0
        ? `opacity ${progressiveFadeMs}ms ease`
        : 'none';

    // Group-aware toolbar props
    const groupToolbarProps =
      currentGroup && groupSlices
        ? {
            groupCurrentIndex: currentIndex - currentGroup.start + 1,
            groupTotal:        currentGroup.end - currentGroup.start + 1,
            hasPrevGroup:      currentGroupIdx > 0,
            hasNextGroup:      currentGroupIdx < groupSlices.length - 1,
            groupName:         currentGroup.name,
            groupOrdinal:      currentGroupIdx + 1,
            groupCount:        groupSlices.length,
            onPrevGroup:       prevGroup,
            onNextGroup:       nextGroup,
          }
        : {};

    const showStrip = showThumbnails;
    const stripStart =
      thumbnailsScope === 'flat' ? 0 : (currentGroup?.start ?? 0);
    const stripEnd =
      thumbnailsScope === 'flat'
        ? images.length - 1
        : (currentGroup?.end ?? images.length - 1);
    const stripEntries = useMemo(() => {
      if (!showStrip || images.length <= 1) return [];
      if (stripEnd - stripStart < 1) return [];
      const out: { flatIndex: number; item: (typeof images)[number] }[] = [];
      for (let i = stripStart; i <= stripEnd; i++) {
        out.push({ flatIndex: i, item: images[i] });
      }
      return out;
    }, [showStrip, images, stripStart, stripEnd]);
    const stripLiftPx = thumbnailStripTotalHeightPx(stripEntries.length);
    useEffect(() => {
      if (stripEntries.length <= 1) onThumbnailVisibleIndexesChange?.([]);
    }, [stripEntries.length, onThumbnailVisibleIndexesChange]);

    return (
      <div
        ref={overlayRef}
        role={isContained ? 'region' : 'dialog'}
        aria-modal={isContained ? undefined : 'true'}
        aria-label={t.imagePreview}
        tabIndex={-1}
        className={overlayClassName}
        style={{
          position: isContained ? 'absolute' : 'fixed',
          inset: 0,
          zIndex: isContained ? 1 : 9999,
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
        onMouseDown={(e) => {
          resetHideTimer();
          if (isContained) {
            // Activate keyboard boundary when the user interacts with the preview.
            (e.currentTarget as HTMLDivElement).focus({ preventScroll: true });
          }
        }}
      >
        {/* Stage floors (bottom → top via DOM order; avoid ad-hoc z-index):
            L1 content → L2 hit → L3 chrome → L4 loading */}
        {/* NOTE: This div is 100 % × 100 % and covers the whole overlay, so mask
            clicks land here (not on the overlay root). We mirror the same check. */}
        <div
          onClickCapture={clickGesture.onClickCapture}
          onClick={(e) => { if (closeOnMaskClick && e.target === e.currentTarget) onClose?.(); }}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <div ref={setMediaViewport} data-rip-media-viewport
            style={{ position: 'absolute', inset: `0 0 ${stripLiftPx}px 0` }}>
          {/* L1 — main + neighbor image layers (isolated so inner z-index cannot cover L4) */}
          <div
            data-rip-floor="content"
            style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}
          >
            <DisplayStageLayers
              layers={displayLayers}
              currentIndex={currentIndex}
              currentAlt={currentImage.alt ?? ''}
              liveDims={imageDims}
              liveTransform={transform.cssTransform}
              frozenBySrc={frozenBySrc}
              hideCurrentUntilDecoded={hideMainUntilDecoded}
              suppressTransformTransition={clickZoomEnabled || suppressTransformTransition}
              isPanning={isPanning || minimapDragging}
              imageShowReady={imageShowReady}
              bindLayerRef={bindLayerRef}
              onCurrentLoad={onCurrentLayerLoad}
              onCurrentError={() => {
                progressive.onMainImgError();
                setFailedSrc(currentImage.src);
                onImageError?.(currentIndex, currentImage.src);
              }}
              onNeighborLoad={onSlotImgLoad}
              underlay={
                progressive.showMinimapUnderlay && currentImage.minimapSrc ? (
                  <img
                    key={`${currentImage.minimapSrc}-${currentIndex}`}
                    ref={underlayElRef}
                    src={currentImage.minimapSrc}
                    alt=""
                    aria-hidden
                    draggable={false}
                    onLoad={() => markUnderlayPainted()}
                    onError={progressive.onMinimapError}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      pointerEvents: 'none',
                      display: 'block',
                      opacity: holdSrc
                        ? 0
                        : progressive.fullDecoded
                          ? 0
                          : 1,
                      transition: opacityTransition,
                      zIndex: progressive.fullDecoded ? 0 : 2,
                    }}
                  />
                ) : null
              }
            />
          </div>

          {/* L2 — pan / zoom hit target (live transform lives on the current layer only) */}
          <div
            data-rip-floor="hit"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              cursor: clickZoomEnabled
                ? clickGesture.dragging ? 'grabbing' : adaptive.nextScale > transform.scale ? 'zoom-in' : 'zoom-out'
                : mode === 'native' ? 'grab' : 'zoom-in',
              touchAction: 'none',
              userSelect: 'none',
            }}
            onPointerDown={(event) => {
              if (isContained) overlayRef.current?.focus({ preventScroll: true });
              if (isImagePoint(event.clientX, event.clientY)) clickGesture.onPointerDown(event);
            }}
            onPointerMove={clickGesture.onPointerMove}
            onPointerUp={clickGesture.onPointerUp}
            onPointerCancel={clickGesture.onPointerCancel}
            onLostPointerCapture={clickGesture.onPointerCancel}
            onDoubleClick={(event) => {
              if (isImagePoint(event.clientX, event.clientY)) handleDoubleClick();
            }}
            onClick={(event) => {
              if (closeOnMaskClick && !isImagePoint(event.clientX, event.clientY)) onClose?.();
            }}
          />

          </div>

          {/* L3 — chrome: close, ←/→, toolbar/filename, minimap, filmstrip, EXIF */}
          <div
            data-rip-floor="chrome"
            style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}
          >
            <ImagePreviewCloseButton
              onClick={() => onClose?.()}
              visible={controlsVisible}
              idleOpacity={idleOpacity}
              label={t.close}
            />

            {showMinimap && imageDims && containerSize && (
              <Minimap
                imageSrc={currentImage.minimapSrc ?? currentImage.src}
                thumbnail={currentImage.minimap}
                imageAlt={currentImage.alt ?? ''}
                nw={imageDims.naturalWidth}
                nh={imageDims.naturalHeight}
                cw={containerSize.width}
                ch={containerSize.height}
                scale={transform.scale}
                mode={mode}
                tx={transform.translateX}
                ty={transform.translateY}
                rotationDeg={transform.rotation}
                flipH={transform.flipH}
                flipV={transform.flipV}
                controlsVisible={controlsVisible}
                idleOpacity={minimapIdleOpacity}
                bottomPx={MINIMAP_BOTTOM + stripLiftPx}
                onPanByDelta={panByDelta}
                onJumpToNatural={panJumpToNatural}
                onUserActivity={resetHideTimer}
                onDragChange={setMinimapDragging}
                ariaLabel={t.minimapNav}
                minimapTooltip={t.tipMinimap}
              />
            )}

            {/* Flat ←/→ across the full list (including across groups). Hide at the
                absolute first / last image. Group jumps: toolbar ⏮/⏭ or PageUp/Down. */}
            {(() => {
              if (!showSideArrows) return null;
              const isAtStart = currentIndex === 0;
              const isAtEnd = currentIndex === images.length - 1;

              return (
                <>
                  {!isAtStart && (
                    <ImagePreviewNavArrow
                      direction="left"
                      {...pointerNavigation.bind('prev')}
                      label={t.prev}
                      visible={controlsVisible}
                      idleOpacity={idleOpacity}
                    />
                  )}
                  {!isAtEnd && (
                    <ImagePreviewNavArrow
                      direction="right"
                      {...pointerNavigation.bind('next')}
                      label={t.next}
                      visible={controlsVisible}
                      idleOpacity={idleOpacity}
                    />
                  )}
                </>
              );
            })()}

            {stripEntries.length > 0 && (
              <ThumbnailsStrip
                entries={stripEntries}
                activeFlatIndex={currentIndex}
                controlsVisible={controlsVisible}
                idleOpacity={idleOpacity}
                preloadStatus={showThumbnailPreloadStatus ? neighborPreloadStatus : undefined}
                ariaLabel={t.thumbnailsNav}
                thumbAria={t.thumbStripItem}
                loadingLabel={t.thumbnailLoading}
                errorLabel={t.thumbnailFailed}
                onVisibleIndexesChange={onThumbnailVisibleIndexesChange}
                onSelect={(index) => { pointerNavigation.cancel(); goTo(index); }}
                onUserActivity={resetHideTimer}
              />
            )}

            {showExif && exifOpen && (
              <ExifInfoPanel
                exif={currentImage.exif}
                strings={t}
                onUserActivity={resetHideTimer}
              />
            )}

            <Toolbar
              controlsVisible={controlsVisible}
              idleOpacity={idleOpacity}
              bottomPx={stripLiftPx + THUMBNAIL_STRIP_TOOLBAR_GAP_PX}
              mode={mode}
              nativePercent={nativePercent}
              fitEquivalentNativePercent={fitEquivalentNativePercent}
              stops={sortedStops}
              atMinStop={atMinStop}
              atMaxStop={atMaxStop}
              zoomInAvailable={(mode === 'native' ? nativePercent : fitEquivalentNativePercent ?? 0) < sortedStops[sortedStops.length - 1]}
              zoomOutAvailable={(mode === 'fit' ? fitEquivalentNativePercent ?? 0 : nativePercent) > sortedStops[0] || (mode === 'native' && zoomOutBelowMinBehaviour === 'fit')}
              totalImages={images.length}
              currentIndex={currentIndex}
              imageName={currentImage.name}
              showFlip={showFlip}
              showRotateCCW={showRotateCCW}
              showExif={showExif}
              exifOpen={exifOpen}
              showDelete={showDelete}
              showThumbnailToggle={showThumbnailToggle}
              thumbnailsVisible={showThumbnails}
              onToggleThumbnails={() => onThumbnailsVisibleChange?.(!showThumbnails)}
              showFullscreen
              isFullscreen={fullscreenActive}
              fullscreenToggleOnly={toggleOnly}
              toolbarExtra={toolbarExtra}
              showToolbarArrows={showToolbarArrows}
              zoomLocked={zoomLocked}
              strings={t}
              zoomLabelSlotPx={zoomLabelSlotPx}
              zoomDropdownWidthPx={zoomDropdownWidthPx}
              onToggleLock={() => setZoomLocked((v) => !v)}
              onToggleExif={() => setExifOpen((v) => !v)}
              onDeleteImage={deleteCurrentImage}
              onToggleFullscreen={toggleFullscreen}
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

          {/* L4 — loading / error (always topmost) */}
          <div
            data-rip-floor="loading"
            data-rip-loader={showCenterLoader ? 'on' : 'off'}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}
          >
            <div
              aria-label={t.loadingImage}
              aria-live="polite"
              aria-hidden={!showCenterLoader}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                visibility: showCenterLoader ? 'visible' : 'hidden',
                opacity: showCenterLoader ? 1 : 0,
                /* No fade — appear/disappear in lockstep with outgoing hold / reveal. */
                transition: 'none',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: '3px solid rgba(96, 165, 250, 0.28)',
                  borderTopColor: 'rgba(147, 197, 253, 0.95)',
                  animation: '_rip_spin 0.75s linear infinite',
                }}
              />
            </div>

            {imageLoadError && !thumbOnly && errorFallback && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                {errorFallback(currentIndex, currentImage.src)}
              </div>
            )}
          </div>

          {/* Above all floors — local pack only (file: / pack:local). */}
          {isLocalPackBuild ? (
            <div
              data-rip-local-pack-badge=""
              aria-hidden
              title="right-image-preview local pack build time"
              style={{
                position: 'absolute',
                top: 10,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 50,
                pointerEvents: 'none',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: 11,
                lineHeight: 1.3,
                fontWeight: 500,
                letterSpacing: '0.02em',
                color: 'rgba(255, 220, 220, 0.9)',
                background: 'rgba(140, 36, 36, 0.42)',
                padding: '3px 8px',
                borderRadius: 3,
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
            >
              {`local v${PACKAGE_VERSION} · ${LOCAL_PACK_BUILD_AT}`}
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);
