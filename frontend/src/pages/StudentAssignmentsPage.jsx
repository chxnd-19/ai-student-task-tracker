import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchTasks } from '../services/taskService';
import GlassCard from '../components/GlassCard';
import Spinner from '../components/Spinner';
import { Calendar, BookOpen, Clock, Inbox } from 'lucide-react';
import EmptyState from '../components/EmptyState';

const pageVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

function StudentAssignmentsPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await fetchTasks();
        setTasks(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants} className="dashboard-container max-w-[1400px] mx-auto px-8">
      <h2 className="text-4xl font-extrabold tracking-tight mb-8">My Assignments</h2>
      
      {loading ? (
        <div className="flex justify-center p-20"><Spinner /></div>
      ) : (Array.isArray(tasks) ? tasks : []).length === 0 ? (
        <EmptyState 
          icon={Inbox}
          title="No Assignments Yet"
          description="Your teachers haven't posted any assignments for your classes. Enjoy the free time or check back later!"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(Array.isArray(tasks) ? tasks : []).map(task => (
            <GlassCard key={task._id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded">{task.subject}</span>
                <span className="text-xs text-muted flex items-center gap-1"><Clock size={12}/> {new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
              <h3 className="text-xl font-bold mb-2">{task.title}</h3>
              <p className="text-sm text-muted line-clamp-2">{task.description}</p>
            </GlassCard>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default StudentAssignmentsPage;
