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
      <div className="glass-card p-20 flex flex-col items-center text-center border-dashed border bg-white/[0.01] border-white/5 hover:border-purple-500/30 transition-all duration-700 group relative overflow-hidden rounded-[32px]">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-purple-500/20 blur-[60px] rounded-full scale-150 group-hover:bg-purple-500/30 transition-all" />
          <div className="relative w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center text-purple-400 border border-white/10 backdrop-blur-3xl shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-3 group-hover:text-purple-300 animate-float">
            {Icon && <Icon size={48} strokeWidth={1.5} />}
          </div>
        </div>
        
        <h3 className="text-3xl font-black mb-3 tracking-tight text-white">{title}</h3>
        <p className="text-white/40 max-w-sm mx-auto mb-10 text-lg leading-relaxed font-medium">
          {description}
        </p>
        
        {action && (
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative z-10"
          >
            {action}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default EmptyState;
