import React from 'react';
import { motion } from 'framer-motion';

const GlassCard = ({ children, className = '', ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.8, 
        ease: [0.16, 1, 0.3, 1] 
      }}
      className={`glass-card ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
