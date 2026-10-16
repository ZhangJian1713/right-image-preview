import type { ReactNode } from 'react';

// ── SVG icon helpers ───────────────────────────────────────────────────────

export const Icon = ({ children, size = 18, strokeWidth = 2 }: {
  children: ReactNode; size?: number; strokeWidth?: number;
}) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round"
    width={size} height={size} aria-hidden="true">
    {children}
  </svg>
);

export const IconZoomIn = () => <Icon><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></Icon>;
export const IconZoomOut = () => <Icon><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></Icon>;
export const IconLeft = () => <Icon strokeWidth={2.5}><polyline points="15,18 9,12 15,6"/></Icon>;
export const IconRight = () => <Icon strokeWidth={2.5}><polyline points="9,18 15,12 9,6"/></Icon>;
export const IconPrevGroup = () => <Icon strokeWidth={2.5}><polyline points="19,18 13,12 19,6"/><polyline points="11,18 5,12 11,6"/></Icon>;
export const IconNextGroup = () => <Icon strokeWidth={2.5}><polyline points="5,18 11,12 5,6"/><polyline points="13,18 19,12 13,6"/></Icon>;
export const IconRotateCW = () => <Icon><path d="M21 2v6h-6"/><path d="M21 13a9 9 0 1 1-3-7.7L21 8"/></Icon>;
export const IconRotateCCW = () => <Icon><path d="M3 2v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/></Icon>;
export const IconFlipH = () => <Icon><path d="M12 3v18" strokeDasharray="2 2"/><path d="M5 8l-3 4 3 4"/><path d="M19 8l3 4-3 4"/></Icon>;
export const IconFlipV = () => <Icon><path d="M3 12h18" strokeDasharray="2 2"/><path d="M8 5l4-3 4 3"/><path d="M8 19l4 3 4-3"/></Icon>;

// 4 outward L-shaped corner brackets
export const IconFit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" width={18} height={18} aria-hidden="true">
    <path d="M3 9V3h6 M21 9V3h-6 M3 15v6h6 M21 15v6h-6"/>
  </svg>
);

// "1:1" text-style SVG — two seriffed "1"s with a colon, clearly communicates
// the native 1-to-1 pixel ratio without ambiguity.
export const IconOneToOne = () => (
  <svg viewBox="0 0 28 18" width={28} height={18} fill="none"
    stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true">
    {/* left "1" */}
    <line x1="7"  y1="3"  x2="7"  y2="15"/>
    <line x1="4"  y1="6"  x2="7"  y2="3"/>
    {/* colon */}
    <circle cx="14" cy="7"  r={1.1} fill="currentColor" stroke="none"/>
    <circle cx="14" cy="11" r={1.1} fill="currentColor" stroke="none"/>
    {/* right "1" */}
    <line x1="21" y1="3"  x2="21" y2="15"/>
    <line x1="18" y1="6"  x2="21" y2="3"/>
  </svg>
);

// Open padlock — zoom unlocked (changes on image switch)
export const IconLockOpen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" width={16} height={16} aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
  </svg>
);

// Closed padlock — zoom locked (preserved on image switch)
export const IconLockClosed = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" width={16} height={16} aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

// Info / metadata — EXIF panel toggle
export const IconExif = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" width={17} height={17} aria-hidden="true">
    <circle cx="12" cy="12" r="9"/>
    <line x1="12" y1="10" x2="12" y2="16"/>
    <circle cx="12" cy="7" r="0.9" fill="currentColor" stroke="none"/>
  </svg>
);

export const IconDelete = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" width={17} height={17} aria-hidden="true">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/>
    <path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

export const IconEnterFullscreen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" width={17} height={17} aria-hidden="true">
    <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
    <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
    <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
    <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
  </svg>
);

export const IconExitFullscreen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" width={17} height={17} aria-hidden="true">
    <path d="M8 3v3a2 2 0 0 1-2 2H3"/>
    <path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
    <path d="M3 16h3a2 2 0 0 1 2 2v3"/>
    <path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
  </svg>
);

