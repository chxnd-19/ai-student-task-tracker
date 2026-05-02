import React from 'react';
import { motion } from 'framer-motion';

const GlassCard = ({ children, className = '', ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -6, 
        scale: 1.02,
        boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(139, 92, 246, 0.15)" 
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`card ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
