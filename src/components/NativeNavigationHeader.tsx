import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDevice } from '@/contexts/DeviceContext';

interface NativeNavigationHeaderProps {
  title: string;
  subtitle?: string;
  scrollRef?: React.RefObject<HTMLDivElement>;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export function NativeNavigationHeader({
  title,
  subtitle,
  scrollRef,
  leftAction,
  rightAction,
}: NativeNavigationHeaderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isNative, safeAreaInsets } = useDevice();
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef?.current || window;
    const handleScroll = () => {
      const scrollTop = scrollRef?.current
        ? scrollRef.current.scrollTop
        : window.scrollY;
      setIsCollapsed(scrollTop > 60);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollRef]);

  return (
    <div
      ref={headerRef}
      className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30"
      style={{ paddingTop: isNative ? safeAreaInsets.top : 0 }}
    >
      {/* Inline nav bar */}
      <div className="flex items-center justify-between px-4 h-11">
        <div className="w-20 flex justify-start">{leftAction}</div>
        <motion.span
          className="text-base font-semibold text-foreground truncate"
          initial={{ opacity: 0 }}
          animate={{ opacity: isCollapsed ? 1 : 0 }}
          transition={{ duration: 0.15 }}
        >
          {title}
        </motion.span>
        <div className="w-20 flex justify-end">{rightAction}</div>
      </div>

      {/* Large title */}
      <motion.div
        className="px-5 overflow-hidden"
        animate={{
          height: isCollapsed ? 0 : 'auto',
          opacity: isCollapsed ? 0 : 1,
        }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h1 className="text-[34px] font-extrabold text-foreground tracking-tight leading-tight pb-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground pb-2">{subtitle}</p>
        )}
      </motion.div>
    </div>
  );
}
