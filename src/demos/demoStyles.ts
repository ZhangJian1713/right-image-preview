import type { CSSProperties } from 'react';

export const cardStyle: CSSProperties = {
  background: 'none',
  border: '2px solid transparent',
  borderRadius: 10,
  padding: 0,
  cursor: 'pointer',
  overflow: 'hidden',
  transition: 'border-color 0.15s, transform 0.15s',
  outline: 'none',
  textAlign: 'left',
};

export const thumbImgStyle: CSSProperties = {
  width: '100%',
  height: 140,
  objectFit: 'cover',
  display: 'block',
};

export const thumbLabelStyle: CSSProperties = {
  padding: '7px 10px',
  fontSize: 12,
  color: '#aaa',
  background: '#161822',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 10,
};

export const sectionHeadStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  margin: '0 0 6px',
};

export const sectionDescStyle: CSSProperties = {
  margin: '0 0 16px',
  color: '#888',
  fontSize: 13,
  lineHeight: 1.6,
};

export const dividerStyle: CSSProperties = {
  border: 'none',
  borderTop: '1px solid #2a2d3a',
  margin: '44px 0',
};
