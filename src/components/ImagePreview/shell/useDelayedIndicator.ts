import { useEffect, useMemo, useState } from 'react';

/** Each uninterrupted loading period owns a deadline; stopping hides the indicator in the same render. */
export function useDelayedIndicator(active: boolean, delayMs: number): boolean {
  const period = useMemo(() => ({ active, delayMs }), [active, delayMs]);
  const [elapsedPeriod, setElapsedPeriod] = useState<typeof period | null>(null);
  useEffect(() => {
    if (!period.active) return;
    const timer = setTimeout(() => setElapsedPeriod(period), period.delayMs);
    return () => clearTimeout(timer);
  }, [period]);
  return period.active && elapsedPeriod === period;
}
