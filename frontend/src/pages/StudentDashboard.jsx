import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Timer,
  BookOpen,
  Calendar as CalendarIcon,
  ChevronRight,
  History,
  Search,
  Users,
  User as UserIcon,
  LayoutDashboard,
  FileText,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { fetchTasks, fetchTaskSummary } from '../services/taskService';
import { fetchMySubmissions } from '../services/submissionService';
import { fetchJoinedClasses, joinClass } from '../services/classService';
import SubmissionForm from '../components/SubmissionForm';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import { getTaskStatus, STATUS_META } from '../utils/taskStatus';
import Button from '../components/Button';

const DashboardSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="hero h-64 skeleton opacity-10" />
    <div className="dashboard-grid">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 skeleton opacity-10 rounded-2xl" />)}
    </div>
    <div className="h-40 skeleton opacity-10 rounded-2xl" />
  </div>
);

const CircularProgress = ({ percentage, size = 80, strokeWidth = 8, color = "#7c3aed" }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="circular-progress" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="bg" cx={size / 2} cy={size / 2} r={radius} />
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          cx={size / 2} cy={size / 2} r={radius}
          strokeDasharray={circumference}
          stroke={color}
          style={{ strokeWidth, strokeLinecap: 'round', fill: 'none' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white">{percentage}%</span>
      </div>
    </div>
  );
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  }
};

function StudentDashboard({ user }) {
  const [classes,     setClasses]    = useState([]);
  const [activeClass, setActiveClass] = useState(null);
  const [joinCode,    setJoinCode]   = useState('');
  const [joining,     setJoining]    = useState(false);
  const [joinError,   setJoinError]  = useState('');

  const [tasks,       setTasks]      = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [activeTask,  setActiveTask] = useState(null);
  const [activeTab,    setActiveTab]  = useState('assignments');

  const [summary, setSummary] = useState({ pending: 0, submitted: 0, overdue: 0, late: 0 });

  const [toast, setToast] = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToast({ message, type });

  const loadClasses = useCallback(async () => {
    try {
      const { data } = await fetchJoinedClasses();
      setClasses(data);
      if (data.length > 0 && !activeClass) setActiveClass(data[0]);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load classes.', 'error');
    }
  }, [activeClass]);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  const loadTasks = useCallback(async (cls) => {
    if (!cls) { 
      setTasks([]); 
      setSubmissions([]); 
      setSummary({ pending: 0, submitted: 0, overdue: 0, late: 0 });
      setLoading(false); 
      return; 
    }
    setLoading(true);
    try {
      const [t, s, sum] = await Promise.all([
        fetchTasks({ classId: cls._id }),
        fetchMySubmissions(),
        fetchTaskSummary(cls._id),
      ]);
      setTasks(t.data);
      setSubmissions(s.data);
      setSummary(sum.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load assignments.', 'error');
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  }, []);

  useEffect(() => { loadTasks(activeClass); }, [activeClass, loadTasks]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (joining || !joinCode.trim()) return;
    setJoinError('');
    setJoining(true);
    try {
      const { data } = await joinClass(joinCode.trim());
      setClasses((prev) => [...prev, data]);
      setJoinCode('');
      setActiveClass(data);
      showToast(`Joined "${data.name}" successfully!`);
    } catch (err) {
      setJoinError(err.response?.data?.message || 'Failed to join class.');
    } finally {
      setJoining(false);
    }
  };

  const getSubmission = (taskId) =>
    submissions.find((s) => String(s.taskId?._id || s.taskId) === String(taskId));

  const handleSubmitSuccess = () => {
    showToast('Submission successful! ✅');
    setActiveTask(null);
    loadTasks(activeClass);
  };

  const statCards = [
    { key: 'pending',   icon: <Clock size={18} />,        label: "Pending",   color: "#f59e0b", shadow: "rgba(245, 158, 11, 0.2)" },
    { key: 'submitted', icon: <CheckCircle2 size={18} />, label: "Completed", color: "#10b981", shadow: "rgba(16, 185, 129, 0.2)" },
    { key: 'overdue',   icon: <AlertCircle size={18} />,  label: "Overdue",   color: "#ef4444", shadow: "rgba(239, 68, 68, 0.2)" },
    { key: 'late',      icon: <Timer size={18} />,        label: "Late",      color: "#f97316", shadow: "rgba(249, 115, 22, 0.2)" },
  ];

  if (loading && classes.length === 0) return <div className="max-w-[1440px] mx-auto px-8 py-12"><DashboardSkeleton /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05060f] to-[#0b1020] radial-glow-before glow-after-pink relative px-8 pb-12 transition-all duration-300 ease-out">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* ── Main Responsive Grid ── */}
      <div className="grid lg:grid-cols-[2fr_1fr] gap-6 max-w-[1440px] mx-auto pt-8">
        
        {/* ── LEFT COLUMN: Welcome, Stats, Assignments ── */}
        <div className="flex flex-col gap-6">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
            <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
              Welcome back, <span className="text-primary">{user?.name || 'Student'}!</span>
            </h1>
            <p className="text-xs text-gray-400 tracking-wide">Manage your academic progress and track active tasks.</p>
          </motion.div>

          {/* Stats 2x2 Grid */}
          <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-2 gap-4">
            {statCards.map(({ key, icon, label, color, tint }) => (
              <GlassCard 
                key={key} 
                className={`!p-4 !rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/20 backdrop-blur shadow-lg shadow-black/40 shadow-[0_0_25px_rgba(255,255,255,0.05)] hover:scale-[1.02] transition-all duration-300 ease-out relative overflow-hidden ${tint}`}
              >
                <div className="flex flex-col gap-3 relative z-10">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center icon-glow shadow-inner" style={{ background: color + '15', color }}>
                    {icon}
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold tracking-wide uppercase mb-1">{label}</p>
                    <p className="text-2xl font-bold text-white leading-none tracking-tight">{summary[key] || 0}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Assignment Section */}
          <section className="bg-gradient-to-b from-white/10 to-white/5 border border-white/20 rounded-2xl p-6 shadow-lg shadow-black/40 space-y-4 transition-all duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {activeClass ? activeClass.name : 'All Assignments'}
              </h2>
              
              {activeClass && (
                <div className="flex gap-2 bg-white/5 p-1 rounded-full w-fit">
                  {['assignments', 'materials', 'discussion'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`${
                        activeTab === tab
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                          : "bg-white/10 text-gray-300 hover:bg-white/20"
                      } px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 capitalize`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1,2,3,4].map(i => <div key={i} className="h-48 skeleton rounded-2xl opacity-10" />)}
                </div>
              ) : !activeClass ? (
                <div className="flex justify-center py-12">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary animate-pulse shadow-[0_0_30px_rgba(124,58,237,0.2)]">
                      <Sparkles size={40} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Select a Workspace</h3>
                    <p className="text-xs text-gray-400 max-w-xs mx-auto tracking-wide">Join a class or select one from your workspaces to see your assignments.</p>
                  </div>
                </div>
              ) : activeTab === "assignments" ? (
                tasks.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-black/20">
                    <LayoutDashboard className="mx-auto mb-4 text-white/20" size={32} />
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">No active assignments</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tasks.map((task) => {
                      const sub    = getSubmission(task._id);
                      const status = getTaskStatus(task, sub);
                      const meta   = STATUS_META[status];
                      return (
                        <GlassCard 
                          key={task._id} 
                          className="!p-5 !rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/20 shadow-lg shadow-black/40 hover:shadow-xl hover:shadow-purple-500/10 hover:scale-[1.02] transition-all duration-300 ease-out flex flex-col group"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-white/25">{task.subject || activeClass.subject}</span>
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                          </div>
                          <h4 className="text-base font-bold mb-2 text-white line-clamp-1 tracking-tight group-hover:text-primary transition-colors">{task.title}</h4>
                          <p className="text-xs text-gray-400 mb-6 line-clamp-2 leading-relaxed tracking-wide">{task.description}</p>
                          <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                              <Clock size={14} className="text-primary/60" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </div>
                            <Button onClick={() => setActiveTask(activeTask?._id === task._id ? null : task)} className="h-8 px-5 text-[10px] uppercase font-black tracking-widest hover:scale-[1.02] active:scale-[0.97] transition-all">{sub ? 'Update' : 'Submit'}</Button>
                          </div>
                          {activeTask?._id === task._id && (
                            <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                              <SubmissionForm task={task} onSuccess={handleSubmitSuccess} />
                            </div>
                          )}
                        </GlassCard>
                      );
                    })}
                  </div>
                )
              ) : activeTab === "materials" ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12 bg-black/20 rounded-2xl border border-dashed border-white/10">
                  <BookOpen className="mx-auto mb-4 text-white/20" size={40} />
                  <h3 className="text-lg font-bold text-white mb-2">Class Materials</h3>
                  <p className="text-xs text-gray-400">No materials have been shared for this workspace yet.</p>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12 bg-black/20 rounded-2xl border border-dashed border-white/10">
                  <MessageSquare className="mx-auto mb-4 text-white/20" size={40} />
                  <h3 className="text-lg font-bold text-white mb-2">Discussion Board</h3>
                  <p className="text-xs text-gray-400">Join the conversation with your peers and instructor.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        {/* ── RIGHT COLUMN: Join Class, Search, Workspaces ── */}
        <div className="flex flex-col gap-6">
          
          {/* Join Class Card */}
          <section className="lg:scale-[1.02] bg-gradient-to-b from-white/10 to-white/5 border border-white/20 rounded-2xl p-8 relative overflow-hidden group shadow-lg shadow-black/40 transition-all duration-300 ease-out">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 blur-xl -z-10 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-4 mb-6">
              <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(124,58,237,0.3)] shadow-inner">
                <Plus size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Join Class</h3>
                <p className="text-xs text-gray-400 tracking-wide uppercase">Enter access code</p>
              </div>
            </div>
            <form onSubmit={handleJoin} className="space-y-4">
              <input
                type="text"
                placeholder="E.g. CODE12"
                value={joinCode}
                onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
                className="w-full px-5 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all uppercase font-mono text-lg tracking-widest placeholder:text-white/10"
                maxLength={6}
              />
              <Button type="submit" disabled={joining} className="w-full h-12 rounded-xl font-black text-xs uppercase tracking-[0.2em] !bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:brightness-110 active:scale-[0.97] transition-all">
                {joining ? <Spinner small /> : 'Join Workspace'}
              </Button>
            </form>
            {joinError && <p className="text-danger text-[10px] mt-3 font-bold text-center bg-danger/10 p-3 rounded-xl border border-danger/20">{joinError}</p>}
          </section>

          {/* Quick Search */}
          <section className="bg-gradient-to-b from-white/10 to-white/5 border border-white/20 rounded-2xl p-4 shadow-lg shadow-black/40 transition-all duration-300 hover:scale-[1.02]">
            <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.2em] mb-4 px-1">Quick Search</h3>
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" size={15} />
              <input disabled placeholder="Search assignments..." className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs cursor-not-allowed text-white/30 focus:ring-2 focus:ring-purple-500 transition-all" />
            </div>
          </section>

          {/* My Workspaces */}
          <section className="bg-gradient-to-b from-white/10 to-white/5 border border-white/20 rounded-2xl p-4 shadow-lg shadow-black/40 transition-all duration-300">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">My Workspaces</h3>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shadow-inner">{classes.length}</span>
            </div>
            <div className="space-y-2">
              {classes.map(cls => (
                <div
                  key={cls._id}
                  onClick={() => setActiveClass(cls)}
                  className={`p-3.5 rounded-xl border transition-all duration-300 cursor-pointer flex items-center gap-4 hover:scale-[1.02] ${
                    activeClass?._id === cls._id 
                      ? 'bg-white/10 border-purple-500/30 shadow-inner shadow-purple-500/10' 
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/10 hover:border-white/10'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-base flex-shrink-0 transition-colors shadow-inner ${
                    activeClass?._id === cls._id ? 'bg-primary text-white shadow-lg shadow-primary/40' : 'bg-white/5 text-white/30'
                  }`}>
                    {cls.name[0]}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="text-sm font-bold text-white/90 mb-0.5 truncate tracking-tight">{cls.name}</h4>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{cls.subject}</p>
                  </div>
                  {activeClass?._id === cls._id && <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(124,58,237,1)]" />}
                </div>
              ))}
              {classes.length === 0 && (
                <p className="text-center py-6 text-[10px] text-gray-400 uppercase tracking-widest font-black opacity-20">No active workspaces</p>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
