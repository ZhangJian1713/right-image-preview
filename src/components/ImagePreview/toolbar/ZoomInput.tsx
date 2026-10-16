import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DelayedTooltip } from '../DelayedTooltip';
import type { LocaleStrings } from '../locale';
import type { NativePercent, ZoomMode } from '../types';
import { ZOOM_DROPDOWN_MAX_WIDTH_PX } from '../imagePreviewTuning';
import { C } from './palette';

// ── ZoomInput ──────────────────────────────────────────────────────────────

interface ZoomInputProps {
  mode: ZoomMode;
  nativePercent: NativePercent;
  fitEquivalentNativePercent?: number;
  stops: NativePercent[];
  onFit(): void;
  onSetNative(percent: NativePercent): void;
  strings: LocaleStrings;
  zoomLabelSlotPx: number;
  zoomDropdownWidthPx: number;
}

export function ZoomInput({
  mode,
  nativePercent,
  fitEquivalentNativePercent,
  stops,
  onFit,
  onSetNative,
  strings,
  zoomLabelSlotPx,
  zoomDropdownWidthPx,
}: ZoomInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayLabel = mode === 'fit'
    ? (fitEquivalentNativePercent !== undefined
        ? `${Math.round(fitEquivalentNativePercent)}%`
        : '—')
    : `${Math.round(nativePercent)}%`;
  const currentStopMatch = mode === 'native' ? Math.round(nativePercent) : null;

  const open = useCallback(() => {
    setInputValue(
      mode === 'fit'
        ? (fitEquivalentNativePercent !== undefined
            ? String(Math.round(fitEquivalentNativePercent))
            : '')
        : String(Math.round(nativePercent)),
    );
    setIsOpen(true);
  }, [mode, nativePercent, fitEquivalentNativePercent]);

  const maxStop = useMemo(() => Math.max(...stops), [stops]);

  const commit = useCallback((raw: string) => {
    const trimmed = raw.trim().replace('%', '');
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num > 0) onSetNative(Math.min(num, maxStop));
    setIsOpen(false);
  }, [maxStop, onSetNative]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('mousedown', handler);
    };
  }, [isOpen]);

  const sortedDesc = [...stops].sort((a, b) => b - a);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        flexShrink: 0,
        width: zoomLabelSlotPx,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {isOpen ? (
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(inputValue);
            if (e.key === 'Escape') setIsOpen(false);
            e.stopPropagation();
          }}
          style={{
            width: '100%',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(180,200,225,0.3)',
            borderRadius: 5, color: C.text, fontSize: 13,
            padding: '3px 4px', outline: 'none', boxSizing: 'border-box',
          }}
        />
      ) : (
        <DelayedTooltip content={strings.tipZoomLevel}>
          <span
            onClick={open}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); open(); }
            }}
            style={{
              display: 'block',
              width: '100%',
              boxSizing: 'border-box',
              textAlign: 'center',
              fontSize: 13, color: C.text, cursor: 'pointer',
              padding: '3px 5px', borderRadius: 5,
              border: '1px solid transparent',
              fontVariantNumeric: 'tabular-nums',
              transition: 'border-color 0.15s',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLSpanElement).style.borderColor = 'rgba(180,200,225,0.28)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLSpanElement).style.borderColor = 'transparent'; }}
          >
            {displayLabel}
          </span>
        </DelayedTooltip>
      )}

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            /* Wider than the narrow % trigger so “Fit (n%)” / preset rows fit; clamp on small viewports. */
            width: zoomDropdownWidthPx,
            minWidth: 0,
            maxWidth: `min(92vw, ${ZOOM_DROPDOWN_MAX_WIDTH_PX}px)`,
            background: 'rgba(12,16,26,0.97)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(140,162,188,0.18)',
            borderRadius: 9,
            padding: '4px 0',
            boxShadow: '0 -6px 24px rgba(0,0,0,0.55)',
            zIndex: 200,
            boxSizing: 'border-box',
          }}
        >
          {sortedDesc.map((stop) => (
            <DropdownRow
              key={stop}
              label={`${stop}%`}
              tip={strings.tipZoomRowPercent(stop)}
              active={currentStopMatch === stop}
              onMouseDown={() => { onSetNative(stop); setIsOpen(false); }}
            />
          ))}
          <div style={{ height: 1, background: C.divider, margin: '3px 0' }} />
          <DropdownRow
            label={
              fitEquivalentNativePercent !== undefined
                ? strings.fitApprox(Math.round(fitEquivalentNativePercent))
                : strings.fit
            }
            tip={
              fitEquivalentNativePercent !== undefined
                ? strings.tipZoomRowFitApprox(Math.round(fitEquivalentNativePercent))
                : strings.tipZoomRowFit
            }
            active={mode === 'fit'}
            onMouseDown={() => { onFit(); setIsOpen(false); }}
          />
        </div>
      )}
    </div>
  );
}

interface DropdownRowProps {
  label: string;
  tip: string;
  active: boolean;
  onMouseDown(): void;
}

function DropdownRow({ label, tip, active, onMouseDown }: DropdownRowProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <DelayedTooltip content={tip}>
      <div
        onMouseDown={(e) => { e.preventDefault(); onMouseDown(); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          columnGap: 8,
          padding: '5px 8px',
          cursor: 'pointer',
          background: active ? 'rgba(88,101,242,0.18)' : hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
          transition: 'background 0.1s',
          boxSizing: 'border-box',
          width: '100%',
          minWidth: 0,
        }}
      >
      <span
        style={{
          flex: '1 1 auto',
          minWidth: 0,
          fontSize: 13,
          color: active ? '#8fa8ff' : C.text,
          fontWeight: active ? 600 : 400,
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </span>
      <span
        style={{
          width: 14,
          flex: '0 0 14px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {active && (
          <svg viewBox="0 0 16 16" fill="currentColor" width={12} height={12}
            style={{ color: '#8fa8ff' }} aria-hidden="true">
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
          </svg>
        )}
      </span>
    </div>
    </DelayedTooltip>
  );
}

