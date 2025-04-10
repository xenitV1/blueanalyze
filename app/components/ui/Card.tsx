import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  glassEffect?: boolean;
  animate?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverEffect = false,
  glassEffect = false,
  animate = false,
}) => {
  const baseClasses = 'rounded-2xl p-6 shadow-lg';
  
  const glassClasses = glassEffect
    ? 'bg-white/20 backdrop-blur-lg border border-white/20 dark:bg-gray-800/30'
    : 'bg-white dark:bg-gray-800';
    
  const MainComponent = animate ? motion.div : 'div';

  const animationProps = animate
    ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
        whileHover: hoverEffect ? { y: -5 } : undefined,
      }
    : {};

  return (
    <MainComponent
      className={`${baseClasses} ${glassClasses} ${className}`}
      {...animationProps}
    >
      {children}
    </MainComponent>
  );
};

export default Card; 