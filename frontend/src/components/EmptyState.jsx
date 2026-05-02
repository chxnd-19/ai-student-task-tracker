import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from './GlassCard';

/**
 * A polished, reusable empty state component for the dashboard.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Lucide icon component
 * @param {string} props.title - Main title text
 * @param {string} props.description - Helper description text
 * @param {React.ReactNode} props.action - Optional action button or element
 */
const EmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      <GlassCard className="p-20 flex flex-col items-center text-center border-dashed border-2 bg-white/[0.02] border-white/10 hover:border-primary/40 transition-all duration-700 group relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full scale-150 animate-pulse" />
          <div className="relative w-28 h-28 rounded-[40px] bg-white/5 flex items-center justify-center text-primary border border-white/10 backdrop-blur-2xl shadow-2xl transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
            {Icon && <Icon size={56} strokeWidth={1.5} />}
          </div>
        </div>
        
        <h3 className="text-4xl font-black mb-4 tracking-tighter text-white group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-white/40 max-w-lg mx-auto mb-12 text-xl leading-relaxed font-medium">
          {description}
        </p>
        
        {action && (
          <div className="relative z-10 scale-125">
            {action}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
};

export default EmptyState;
