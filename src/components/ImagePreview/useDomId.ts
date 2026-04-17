import * as React from 'react';
import { useRef } from 'react';

let fallbackSerial = 0;

/**
 * Stable DOM id (e.g. SVG `mask` / `url(#id)`). Prefers React 18+ `useId`; falls back for React 17
 * or hosts where `useId` is missing from the resolved `react` package.
 *
 * The `useId` branch is chosen from `typeof React.useId`, which is fixed for the lifetime of the app.
 */
export function useDomId(prefix: string): string {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- feature detect is stable per app bundle
  const fromReact = typeof React.useId === 'function' ? React.useId().replace(/:/g, '_') : null;

  const fallbackRef = useRef<string | null>(null);
  if (fromReact !== null) return fromReact;
  if (fallbackRef.current === null) {
    fallbackRef.current = `${prefix}-${++fallbackSerial}`;
  }
  return fallbackRef.current;
}
