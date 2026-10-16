// ── Design tokens ──────────────────────────────────────────────────────────
// Soft blue-grey palette — readable on dark bg without harsh white contrast.
export const C = {
  text:        '#cdd5e0',       // primary icon/text
  textMuted:   'rgba(175,190,210,0.65)', // secondary / counter
  textDisabled:'rgba(130,148,168,0.35)',
  active:      '#cdd5e0',       // same as text when active bg is set
  activeBg:    'rgba(255,255,255,0.16)',
  hoverBg:     'rgba(255,255,255,0.09)',
  divider:     'rgba(140,162,188,0.22)',
  lockActive:  '#7daaff',       // locked state accent colour
} as const;

