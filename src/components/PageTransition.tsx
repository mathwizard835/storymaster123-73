import { motion } from 'framer-motion';
import React from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1], // iOS-like ease
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
};
