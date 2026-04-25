import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, Trophy, Users, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDevice } from '@/contexts/DeviceContext';
import { addHapticFeedback } from '@/lib/mobileFeatures';
import { motion } from 'framer-motion';
import { isNativePlatform } from '@/lib/platform';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/dashboard' },
  { icon: BookOpen, label: 'Gallery', path: '/gallery' },
  { icon: Trophy, label: 'Trophies', path: '/achievements' },
  { icon: Users, label: 'Parents', path: '/parent-dashboard' },
  { icon: Crown, label: 'Pass', path: '/subscription' },
];

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPhone, isNative, safeAreaInsets } = useDevice();

  // Only show on phone devices
  if (!isPhone) return null;

  // Don't show on certain pages
  const hiddenPaths = ['/mission', '/profile', '/auth', '/reset-password'];
  if (hiddenPaths.some(path => location.pathname.startsWith(path))) return null;

  // Don't show on native welcome screen (root when not logged in)
  if (isNative && location.pathname === '/') return null;

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t border-border/50",
        isNative
          ? "bg-background/70 backdrop-blur-2xl backdrop-saturate-150"
          : "bg-background/80 backdrop-blur-xl"
      )}
      style={{ paddingBottom: isNative ? Math.max(safeAreaInsets.bottom, 8) : 8 }}
    >
      <div className="flex items-center justify-around px-1 pt-1.5 pb-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path === '/dashboard' && location.pathname === '/');
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => {
                addHapticFeedback('light');
                navigate(isNative ? item.path : item.path === '/dashboard' ? '/' : item.path);
              }}
              className={cn(
                "relative flex flex-col items-center justify-center min-w-[60px] min-h-[44px] rounded-xl transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn(
                  "h-[22px] w-[22px] transition-transform duration-150",
                  isActive && "text-primary scale-110"
                )} />
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </div>
              <span className={cn(
                "text-[10px] mt-1.5 font-semibold tracking-tight",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
