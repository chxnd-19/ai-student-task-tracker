import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import { BookOpen, PlusCircle } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';

export default function TeacherTasksPage() {
  const navigate = useNavigate();
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-[1400px] mx-auto px-8">
      <h2 className="text-4xl font-extrabold tracking-tight mb-8">All Tasks</h2>
      <EmptyState 
        icon={BookOpen}
        title="Classroom Archive"
        description="All tasks across your classes appear here. You can manage them directly from your active classroom on the dashboard."
        action={
          <Button onClick={() => navigate('/')} className="px-8">
            <PlusCircle size={18} className="mr-2" /> Go to Dashboard
          </Button>
        }
      />
    </motion.div>
  );
}
