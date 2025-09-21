import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { useMobileInteraction } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';

interface MobileOptimizedButtonProps extends ButtonProps {
  hapticFeedback?: 'light' | 'medium' | 'heavy';
  touchOptimized?: boolean;
}

export const MobileOptimizedButton: React.FC<MobileOptimizedButtonProps> = ({ 
  hapticFeedback = 'light',
  touchOptimized = true,
  onClick,
  size,
  className,
  children,
  ...props 
}) => {
  const { isNative, handleTouch } = useMobileInteraction();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Add haptic feedback for native platforms
    if (isNative) {
      handleTouch(hapticFeedback);
    }
    
    // Call original onClick handler
    onClick?.(e);
  };

  // Use mobile-optimized size by default on native platforms
  const mobileSize = isNative && touchOptimized ? (size || 'mobile') : size;

  return (
    <Button
      {...props}
      size={mobileSize}
      onClick={handleClick}
      className={cn(
        // Add mobile-specific touch styles
        isNative && touchOptimized && "active:scale-95 transition-transform",
        className
      )}
    >
      {children}
    </Button>
  );
};