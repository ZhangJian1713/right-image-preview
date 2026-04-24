import { useState, type CSSProperties, type RefObject } from 'react';
import type { ImagePreviewRef, ZoomState } from '../components/ImagePreview';
import { cardStyle, thumbImgStyle, thumbLabelStyle } from './demoStyles';
import type { DemoLocale, DemoStrings } from './demoLocale';

export function ThumbCard({
  src,
  alt,
  label,
  ariaLabel,
  clickHint,
  onClick,
}: {
  src: string;
  alt: string;
  label: string;
  ariaLabel: string;
  /** Shown on hover to signal “click to open viewer”. */
  clickHint: string;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      style={{
        ...cardStyle,
        borderColor: hover ? 'rgba(88,101,242,0.75)' : 'rgba(255,255,255,0.08)',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hover
          ? '0 16px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(88,101,242,0.35)'
          : cardStyle.boxShadow,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span style={{ position: 'relative', display: 'block' }}>
        <img src={src} alt={alt} style={thumbImgStyle} />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: hover ? 'rgba(6,8,14,0.55)' : 'rgba(6,8,14,0)',
            color: '#f0f4ff',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.02em',
            transition: 'background 0.18s ease',
            pointerEvents: 'none',
          }}
        >
          {hover ? (
            <>
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" strokeLinecap="round" />
              </svg>
              {clickHint}
            </>
          ) : null}
        </span>
      </span>
      <div style={thumbLabelStyle}>{label}</div>
    </button>
  );
}

function RefBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 12px',
        borderRadius: 6,
        border: '1px solid #3a3d4a',
        background: '#1a1d27',
        color: '#c8d0e8',
        cursor: 'pointer',
        fontSize: 12,
      }}
    >
      {label}
    </button>
  );
}

export function RefControls({
  previewRef,
  t,
}: {
  previewRef: RefObject<ImagePreviewRef | null>;
  t: DemoStrings;
}) {
  const [zoomInfo, setZoomInfo] = useState<ZoomState | null>(null);

  return (
    <section style={{ marginTop: 32 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#aaa', marginBottom: 10 }}>{t.refSectionTitle}</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <RefBtn label={t.refZoomIn} onClick={() => previewRef.current?.zoomIn()} />
        <RefBtn label={t.refZoomOut} onClick={() => previewRef.current?.zoomOut()} />
        <RefBtn label={t.refFit} onClick={() => previewRef.current?.fit()} />
        <RefBtn label={t.ref100} onClick={() => previewRef.current?.setNative(100)} />
        <RefBtn label={t.ref200} onClick={() => previewRef.current?.setNative(200)} />
        <RefBtn label={t.refPrev} onClick={() => previewRef.current?.prev()} />
        <RefBtn label={t.refNext} onClick={() => previewRef.current?.next()} />
        <RefBtn label={t.refRotateCW} onClick={() => previewRef.current?.rotateCW()} />
        <RefBtn label={t.refFlipH} onClick={() => previewRef.current?.flipHorizontal()} />
        <RefBtn label={t.refReadState} onClick={() => setZoomInfo(previewRef.current?.getState() ?? null)} />
      </div>
      {zoomInfo && (
        <pre
          style={{
            marginTop: 10,
            padding: '10px 14px',
            borderRadius: 8,
            background: '#1a1d27',
            border: '1px solid #2a2d3a',
            fontFamily: 'monospace',
            fontSize: 12,
            color: '#8ec7ff',
            overflowX: 'auto',
          }}
        >
          {JSON.stringify(zoomInfo, null, 2)}
        </pre>
      )}
    </section>
  );
}

export function LangSwitch({
  locale,
  onChange,
  t,
}: {
  locale: DemoLocale;
  onChange: (l: DemoLocale) => void;
  t: DemoStrings;
}) {
  const seg = (active: boolean, edge: 'left' | 'right'): CSSProperties => ({
    padding: '6px 14px',
    border: 'none',
    borderRight: edge === 'left' ? '1px solid #3a3d4a' : undefined,
    borderRadius: edge === 'left' ? '7px 0 0 7px' : '0 7px 7px 0',
    background: active ? 'rgba(88,101,242,0.45)' : '#1a1d27',
    color: '#c8d0e8',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
  });

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
      role="group"
      aria-label={t.langSwitchHint}
    >
      <span style={{ fontSize: 12, color: '#888' }}>{t.langLabel}</span>
      <div style={{ display: 'inline-flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #3a3d4a' }}>
        <button type="button" style={seg(locale === 'en', 'left')} onClick={() => onChange('en')} aria-pressed={locale === 'en'}>
          EN
        </button>
        <button type="button" style={seg(locale === 'zh', 'right')} onClick={() => onChange('zh')} aria-pressed={locale === 'zh'}>
          中文
        </button>
      </div>
    </div>
  );
}
