import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, User, Clock, Zap } from 'lucide-react';
import GlassCard from './GlassCard';

const LiveActivityPanel = ({ activities }) => {
  return (
    <GlassCard className="!p-4 h-full flex flex-col border-white/10">
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio size={16} className="text-primary" />
            <span className="absolute inset-0 bg-primary/40 rounded-full animate-ping" />
          </div>
          <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Live Activity</h3>
        </div>
        <Zap size={14} className="text-amber-500 fill-amber-500/20" />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
        <AnimatePresence initial={false}>
          {activities.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              className="text-center py-10"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Waiting for events...</p>
            </motion.div>
          ) : (
            activities.map((activity, i) => (
              <motion.div
                key={activity.timestamp + i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative pl-4 border-l border-white/5 group"
              >
                <div className="absolute left-[-1.5px] top-0 w-[3px] h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-white/90 truncate max-w-[120px]">
                    {activity.userName}
                  </span>
                  <span className="text-[10px] text-gray-500 whitespace-nowrap">
                    {activity.action}
                  </span>
                </div>
                
                {activity.details?.taskTitle && (
                  <p className="text-[10px] text-primary font-medium truncate mb-1">
                    {activity.details.taskTitle}
                  </p>
                )}

                <div className="flex items-center gap-1 text-[9px] text-gray-600 font-bold uppercase tracking-wider">
                  <Clock size={10} />
                  {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
};

export default LiveActivityPanel;
