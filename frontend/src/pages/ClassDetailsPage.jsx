import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  BookOpen, 
  Calendar, 
  Users, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import api from '../services/api';
import Layout from '../components/Layout';
import GlassCard from '../components/GlassCard';
import Spinner from '../components/Spinner';
import SubmissionForm from '../components/SubmissionForm';
import AIFeedbackCard from '../components/AIFeedbackCard';
import { fetchTasks } from '../services/taskService';
import { fetchMySubmissions } from '../services/submissionService';
import { getTaskStatus, STATUS_META } from '../utils/taskStatus';
import Toast from '../components/Toast';

function ClassDetailsPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const loadData = useCallback(async () => {
    try {
      // Find the specific workspace from the list (or fetch it if backend has GET /classes/:id)
      const wRes = await api.get("/api/classes");
      const found = (wRes.data.data || []).find(w => w._id === classId);
      setWorkspace(found);

      const [tRes, sRes] = await Promise.all([
        fetchTasks({ classId }),
        fetchMySubmissions()
      ]);
      setTasks(tRes?.data || []);
      setSubmissions(sRes?.data || []);
    } catch (err) {
      console.error("Failed to load class details:", err);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getSubmission = (taskId) =>
    submissions.find((s) => String(s.taskId?._id || s.taskId) === String(taskId));

  const handleSubmitSuccess = () => {
    setToast({ message: 'Submission successful! ✅', type: 'success' });
    setActiveTask(null);
    loadData();
  };

  if (loading) return <Layout><div className="p-20"><Spinner text="Loading class details..." /></div></Layout>;
  if (!workspace) return <Layout><div className="p-20 text-center">Class not found.</div></Layout>;

  return (
    <Layout>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
      
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-4">
          <button 
            onClick={() => navigate('/classes')}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
          >
            <ArrowLeft size={14} /> Back to Registry
          </button>
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 text-purple-500 font-black text-xs uppercase tracking-[0.3em]">
              <BookOpen size={14} />
              <span>Workspace Details</span>
            </div>
            <h1 className="text-5xl font-black tracking-tight text-white">{workspace.name}</h1>
            <div className="flex items-center gap-6 mt-2">
              <div className="flex items-center gap-2 text-white/40 text-sm">
                <Users size={16} />
                <span className="font-bold">{workspace.subject || 'General'}</span>
              </div>
              <div className="px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-mono font-bold uppercase tracking-widest">
                Code: {workspace.code}
              </div>
            </div>
          </div>
        </header>

        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-black tracking-tight">Active Assignments</h2>
          
          <div className="space-y-4">
            {tasks.length === 0 ? (
              <GlassCard className="p-20 flex flex-col items-center justify-center text-center gap-6 border-dashed border-white/10">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                  <Calendar size={40} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">No assignments posted</h3>
                  <p className="text-white/30 text-sm max-w-xs mt-1">Assignments created by your instructor will appear here.</p>
                </div>
              </GlassCard>
            ) : (
              tasks.map((task, i) => {
                const sub = getSubmission(task._id);
                const status = getTaskStatus(task, sub);
                const meta = STATUS_META[status];
                return (
                  <motion.div 
                    key={task._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card p-6 flex flex-col gap-6 group"
                  >
                    <div className="flex items-start gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 font-black text-xl border border-white/5 group-hover:border-purple-500/30 transition-colors">
                        {task.title[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-lg font-bold group-hover:text-purple-400 transition-colors">{task.title}</h4>
                            <p className="text-sm text-white/40 line-clamp-1 mt-0.5">{task.description}</p>
                          </div>
                          <span className="status-badge" style={{ backgroundColor: meta.bg + '20', color: meta.color, borderColor: meta.color + '30' }}>
                            {meta.label}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-6 mt-5 text-[10px] font-black uppercase tracking-widest text-white/30">
                          <span className="flex items-center gap-2"><Clock size={14}/> Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          <div className="flex-1" />
                          <button 
                            onClick={() => setActiveTask(activeTask?._id === task._id ? null : task)}
                            className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2"
                          >
                            {sub ? 'Update Submission' : 'Submit Task'}
                            <ChevronRight size={14} />
                          </button>
                        </div>

                        <AnimatePresence>
                          {activeTask?._id === task._id && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-6 pt-6 border-t border-white/5 space-y-6 overflow-hidden"
                            >
                              <SubmissionForm task={task} onSuccess={handleSubmitSuccess} />
                              {sub?.aiFeedback && <AIFeedbackCard feedback={sub.aiFeedback} />}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}

export default ClassDetailsPage;
