import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import { BookOpen } from 'lucide-react';

export default function TeacherTasksPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-[1400px] mx-auto px-8">
      <h2 className="text-4xl font-extrabold tracking-tight mb-8">All Tasks</h2>
      <GlassCard className="text-center py-20 border-dashed">
        <BookOpen size={40} className="text-muted mx-auto mb-4" />
        <p className="text-muted text-lg">All tasks across your classes appear here.</p>
        <p className="text-muted text-sm mt-2">Use the Dashboard to manage tasks per class.</p>
      </GlassCard>
    </motion.div>
  );
}
