// Lightweight event bus for progress updates (XP, achievements, character)
// Lets pages subscribe and re-render whenever localStorage progress changes.

export const PROGRESS_EVENT = 'smq:progress-updated';

export const emitProgressUpdate = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(PROGRESS_EVENT));
  } catch (e) {
    // no-op
  }
};

export const onProgressUpdate = (cb: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  const handler = () => cb();
  window.addEventListener(PROGRESS_EVENT, handler);
  return () => window.removeEventListener(PROGRESS_EVENT, handler);
};
