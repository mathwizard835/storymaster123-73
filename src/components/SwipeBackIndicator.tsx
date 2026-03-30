import { Capacitor } from '@capacitor/core';

interface SwipeBackIndicatorProps {
  progress: number;
}

export function SwipeBackIndicator({ progress }: SwipeBackIndicatorProps) {
  if (!Capacitor.isNativePlatform() || progress <= 0) return null;

  return (
    <div
      className="fixed left-0 top-1/2 -translate-y-1/2 z-[9999] pointer-events-none"
      style={{
        opacity: progress,
        transform: `translate(${progress * 20}px, -50%)`,
      }}
    >
      <div
        className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center"
        style={{ transform: `scale(${0.5 + progress * 0.5})` }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 4L6 8L10 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
