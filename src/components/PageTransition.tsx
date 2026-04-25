import { motion } from 'framer-motion';
import React from 'react';
import { isNativePlatform } from '@/lib/platform';

interface PageTransitionProps {
  children: React.ReactNode;
}

// iOS-style push transitions for native, subtle fade for web
const nativeVariants = {
  initial: {
    opacity: 0,
    x: '25%',
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 350,
      damping: 32,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    x: '-15%',
    scale: 0.98,
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 1, 1] as [number, number, number, number],
    },
  },
};

const webVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.15,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  },
};

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const isNative = isNativePlatform();

  return (
    <motion.div
      variants={isNative ? nativeVariants : webVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
};
