import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, Trophy, Users, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDevice } from '@/contexts/DeviceContext';
import { addHapticFeedback } from '@/lib/mobileFeatures';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/' },
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

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: isNative ? Math.max(safeAreaInsets.bottom, 8) : 8 }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => {
                addHapticFeedback('light');
                navigate(item.path);
              }}
              className={cn(
                "flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-lg transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className={cn(
                "text-[10px] mt-1 font-medium",
                isActive && "text-primary"
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
