import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

const EDGE_THRESHOLD = 30; // px from left edge to start
const SWIPE_MIN_DISTANCE = 80; // min px to trigger back
const SWIPE_MAX_Y = 50; // max vertical movement

export function useSwipeBack(enabled: boolean = true) {
  const navigate = useNavigate();
  const [swipeProgress, setSwipeProgress] = useState(0);
  const touchRef = useRef<{ startX: number; startY: number; active: boolean }>({
    startX: 0,
    startY: 0,
    active: false,
  });

  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch.clientX <= EDGE_THRESHOLD) {
        touchRef.current = { startX: touch.clientX, startY: touch.clientY, active: true };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchRef.current.active) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchRef.current.startX;
      const dy = Math.abs(touch.clientY - touchRef.current.startY);

      if (dy > SWIPE_MAX_Y) {
        touchRef.current.active = false;
        setSwipeProgress(0);
        return;
      }

      if (dx > 0) {
        setSwipeProgress(Math.min(dx / SWIPE_MIN_DISTANCE, 1));
      }
    };

    const onTouchEnd = () => {
      if (touchRef.current.active && swipeProgress >= 1) {
        navigate(-1);
      }
      touchRef.current.active = false;
      setSwipeProgress(0);
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled, navigate, swipeProgress]);

  return { swipeProgress };
}
