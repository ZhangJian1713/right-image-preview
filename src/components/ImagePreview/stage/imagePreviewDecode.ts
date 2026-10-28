interface DecodeTask {
  src: string;
  subscribe(callback: () => void, timeoutMs: number): () => void;
  cancel(): void;
}
/** Fully paintable bitmap cache; a reused DOM element must still match its URL. */
const decodeSettled = new WeakMap<HTMLImageElement, string>();
const decodeInflight = new WeakMap<HTMLImageElement, DecodeTask>();

/** Rendering callbacks for hold pacing; this is not a compositor presentation fence. */
export function afterDoubleAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

async function waitUntilFullyDecoded(img: HTMLImageElement): Promise<boolean> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(img);
      bmp.close();
      return true;
    } catch {
      /* fall through to decode() */
    }
  }
  if (typeof img.decode === 'function') {
    try { await img.decode(); return true; } catch { /* best-effort reveal without caching */ }
  }
  return false;
}

/**
 * Subscribe until a complete bitmap is paintable (or a safety timeout expires).
 * Cancel removes only this consumer; shared neighbor/main decode work can continue.
 */
export function scheduleRevealAfterDecode(
  img: HTMLImageElement,
  onReveal: () => void,
  timeoutMs: number,
): () => void {
  const src = img.src;
  const notify = () => { if (img.src === src) onReveal(); };
  if (decodeSettled.get(img) === src) {
    let active = true;
    queueMicrotask(() => { if (active) notify(); });
    return () => { active = false; };
  }

  const existing = decodeInflight.get(img);
  if (existing?.src === src) return existing.subscribe(notify, timeoutMs);
  existing?.cancel();
  const callbacks = new Set<() => void>();
  let finished = false;
  let timer: number | null = null;
  const clearDeadline = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  };
  const task: DecodeTask = {
    src,
    subscribe(callback, timeout) {
      callbacks.add(callback);
      if (timer === null) timer = window.setTimeout(() => finish(false), timeout);
      return () => {
        callbacks.delete(callback);
        if (callbacks.size === 0) clearDeadline();
      };
    },
    cancel() { finished = true; clearDeadline(); callbacks.clear(); },
  };
  const finish = (decoded: boolean) => {
    if (finished) return;
    finished = true;
    clearDeadline();
    if (decodeInflight.get(img) !== task) { callbacks.clear(); return; }
    decodeInflight.delete(img);
    // A timeout permits a best-effort reveal, but is not proof of a decoded bitmap.
    if (decoded && img.src === src) decodeSettled.set(img, src);
    // Set iteration respects cancellations performed by an earlier callback.
    for (const callback of callbacks) callback();
    callbacks.clear();
  };
  decodeInflight.set(img, task);
  const cancel = task.subscribe(notify, timeoutMs);
  void (async () => {
    const decoded = await waitUntilFullyDecoded(img);
    if (finished) return;
    // Decode confirmation is the gate. Stage geometry / outgoing and hold pacing
    // have their own owners; another rendering callback is not proof of presentation.
    finish(decoded);
  })();
  return cancel;
}
