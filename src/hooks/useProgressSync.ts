import { useEffect, useRef } from 'react';
import { PROGRESS_EVENT } from '@/lib/progressEvents';

/**
 * Subscribes a callback to multiple progress-change signals:
 *  - In-app progress event (XP/achievements saved)
 *  - Cross-tab localStorage `storage` events
 *  - Tab regaining focus / becoming visible
 *
 * The callback is debounced to avoid burst updates when multiple events fire.
 */
export const useProgressSync = (callback: () => void | Promise<void>): void => {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          void cbRef.current();
        } catch (e) {
          console.error('useProgressSync callback error', e);
        }
      }, 50);
    };

    const onStorage = (e: StorageEvent) => {
      if (!e.key) return trigger();
      if (e.key.startsWith('smq.')) trigger();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') trigger();
    };

    window.addEventListener(PROGRESS_EVENT, trigger);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', trigger);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(PROGRESS_EVENT, trigger);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', trigger);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
};
