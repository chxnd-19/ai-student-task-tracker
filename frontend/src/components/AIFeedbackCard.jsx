import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2, AlertCircle, ListChecks, Award } from 'lucide-react';
import GlassCard from './GlassCard';

const AIFeedbackCard = ({ feedback }) => {
  if (!feedback) return null;

  if (feedback.status === 'pending') {
    return (
      <GlassCard className="!p-6 border border-primary/20 bg-primary/5 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="text-primary animate-spin-slow" size={20} />
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary">AI Analysis in Progress</h3>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Our AI is currently reviewing your submission. This usually takes a few seconds...
        </p>
      </GlassCard>
    );
  }

  if (feedback.status === 'failed') {
    return (
      <GlassCard className="!p-6 border border-danger/20 bg-danger/5">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="text-danger" size={20} />
          <h3 className="text-sm font-bold uppercase tracking-wider text-danger">Feedback Unavailable</h3>
        </div>
        <p className="text-xs text-muted">We encountered an issue while analyzing your submission. Please try again later.</p>
      </GlassCard>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <GlassCard className="!p-6 border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Sparkles size={120} className="text-primary" />
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20 text-primary">
              <Sparkles size={20} />
            </div>
            <h3 className="text-base font-bold tracking-tight">AI Academic Feedback</h3>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-primary">
              <Award size={16} />
              <span className="text-2xl font-black">{feedback.score}</span>
              <span className="text-[10px] font-bold text-muted mt-2">/100</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={14} className="text-success" />
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted">Summary</h4>
            </div>
            <p className="text-sm text-white/80 leading-relaxed font-medium">
              {feedback.summary}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <ListChecks size={14} className="text-primary" />
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted">Key Suggestions</h4>
            </div>
            <ul className="space-y-2">
              {feedback.suggestions?.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-xs text-white/70 bg-white/5 p-2.5 rounded-lg border border-white/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default AIFeedbackCard;
