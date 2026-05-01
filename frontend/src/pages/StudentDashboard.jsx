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
  const [expandedHistory, setExpandedHistory] = useState(null);
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

  const overallProgress = useMemo(() => {
    const total = tasks.length;
    if (total === 0) return 0;
    return Math.round((summary.submitted / total) * 100);
  }, [tasks.length, summary.submitted]);

  const statCards = [
    { key: 'pending',   icon: <Clock size={20} />,        ...STATUS_META.pending   },
    { key: 'submitted', icon: <CheckCircle2 size={20} />, ...STATUS_META.submitted },
    { key: 'overdue',   icon: <AlertCircle size={20} />,  ...STATUS_META.overdue   },
    { key: 'late',      icon: <Timer size={20} />,        ...STATUS_META.late      },
  ];

  if (loading && classes.length === 0) return <div className="max-w-[1440px] mx-auto px-8 py-12"><DashboardSkeleton /></div>;

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-[1440px] mx-auto px-8 pb-12 relative"
    >
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* ── Section 1: Hero ── */}
      <motion.header variants={itemVariants} className="hero animate-gradient">
        <div className="glow-blob top-[-100px] left-[-100px]" />
        <div className="glow-blob bottom-[-100px] right-[-100px]" style={{ animationDelay: '-5s' }} />
        
        <div className="z-10 flex-1">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-4"
          >
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Sparkles className="text-white" size={24} />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest text-white/70">Student Workspace</span>
          </motion.div>
          <h1 className="text-4xl font-black tracking-tight mb-2">
            Welcome back, {user?.name || 'Student'}!
          </h1>
          <p className="text-white/80 text-lg max-w-xl mb-8">
            {activeClass 
              ? `Viewing "${activeClass.name}". Keep up the good work!`
              : "Join a class to start your learning journey."}
          </p>
          
          <div className="flex items-center gap-4 max-w-md">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search assignments..." 
                className="w-full bg-white/10 border border-white/20 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-md transition-all"
              />
            </div>
          </div>
        </div>

        {activeClass && tasks.length > 0 && (
          <div className="hidden lg:flex items-center gap-8 bg-white/10 p-8 rounded-[32px] backdrop-blur-xl border border-white/20 z-10 shadow-2xl">
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Class Progress</p>
              <p className="text-3xl font-black text-white">{overallProgress === 100 ? 'Completed' : 'In Progress'}</p>
              <div className="flex items-center justify-end gap-1 text-emerald-400 text-sm font-bold mt-1">
                <CheckCircle2 size={14} />
                <span>{summary.submitted} / {tasks.length} Done</span>
              </div>
            </div>
            <CircularProgress percentage={overallProgress} size={100} strokeWidth={10} color="#fff" />
          </div>
        )}
      </motion.header>

      {/* ── Section 2: Stats Grid ── */}
      <motion.div variants={itemVariants} className="dashboard-grid mb-8">
        {statCards.map(({ key, icon, label, color, bg }) => (
          <GlassCard key={key} className="stats-card border-none !p-6">
            <div className="flex justify-between items-start">
              <motion.div 
                whileHover={{ rotate: [0, -10, 10, 0] }}
                className="w-10 h-10 rounded-xl flex items-center justify-center" 
                style={{ background: bg, color }}
              >
                {icon}
              </motion.div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-black" style={{ color }}>{summary[key] || 0}</p>
              <p className="text-xs text-muted font-medium mt-1">Assignments</p>
            </div>
          </GlassCard>
        ))}
      </motion.div>

      {/* ── Section 3: My Classes (Horizontal) ── */}
      <motion.section variants={itemVariants} className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Users size={20} className="text-primary" />
            My Classes
          </h2>
        </div>

        {/* ── Join Class Input (BELOW & LEFT ALIGNED) ── */}
        <form onSubmit={handleJoin} className="mt-3 flex gap-2 mb-6">
          <input
            type="text"
            placeholder="Enter class code"
            value={joinCode}
            onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
            className="w-64 px-4 py-2.5 rounded-xl bg-surface border border-border text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all uppercase text-sm"
          />
          <Button type="submit" disabled={joining} className="px-6 rounded-xl font-bold">
            {joining ? <Spinner small /> : 'Join'}
          </Button>
        </form>

        {joinError && <p className="text-danger text-xs mb-4 bg-danger/10 p-2 rounded-lg max-w-sm">{joinError}</p>}

        <div className="horizontal-scroll pb-2">
          {classes.length === 0 && !loading ? (
            <div className="p-4 bg-surface border border-border border-dashed rounded-2xl text-center w-full">
              <p className="text-muted text-sm">No classes joined yet.</p>
            </div>
          ) : classes.length === 0 && loading ? (
            <div className="flex gap-4">
              {[1,2,3].map(i => <div key={i} className="min-w-[280px] h-32 skeleton opacity-10 rounded-2xl" />)}
            </div>
          ) : (
            classes.map((cls) => (
              <motion.div
                key={cls._id}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveClass(cls)}
                className={`min-w-[280px] p-6 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${
                  activeClass?._id === cls._id 
                  ? 'bg-surface-hover border-primary/50 shadow-[0_20px_50px_rgba(124,58,237,0.2)]' 
                  : 'bg-surface border-border hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-4 mb-4">
                  <motion.div 
                    whileHover={{ rotate: 10 }}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-xl ${
                      activeClass?._id === cls._id ? 'bg-primary-gradient' : 'bg-white/10'
                    }`}
                  >
                    {cls.name ? cls.name[0] : '?'}
                  </motion.div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-black text-base leading-tight truncate">{cls.name}</h4>
                    <p className="text-xs text-muted mt-1 truncate">{cls.subject || 'No subject'}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-8">
                  <div className="text-xs font-bold text-muted">
                    {cls.teacher?.name || 'Instructor'}
                  </div>
                  <motion.div
                    whileHover={{ x: 5 }}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                      activeClass?._id === cls._id ? 'bg-primary text-white' : 'bg-white/5 text-muted group-hover:text-white'
                    }`}
                  >
                    <ChevronRight size={18} />
                  </motion.div>
                </div>
                
                {activeClass?._id === cls._id && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute top-4 right-4 w-3 h-3 rounded-full bg-primary shadow-[0_0_15px_rgba(124,58,237,0.8)]" 
                  />
                )}
              </motion.div>
            ))
          )}
        </div>
      </motion.section>

      {/* ── Section 4: Active Class Panel (Workspace) ── */}
      {activeClass ? (
        <motion.section variants={itemVariants} className="workspace-panel !p-10 !rounded-[40px]">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-12 border-b border-white/5 pb-10">
            <div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-3 text-primary"
              >
                <div className="w-8 h-1 bg-primary rounded-full" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Class Workspace</span>
              </motion.div>
              <h2 className="text-5xl font-black tracking-tighter mb-4 leading-none">
                {activeClass.name}
              </h2>
              <div className="flex flex-wrap items-center gap-8 text-muted text-sm font-bold">
                <span className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
                  <UserIcon size={18} className="text-primary" />
                  {activeClass.teacher?.name || 'Instructor not assigned'}
                </span>
                <span className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
                  <BookOpen size={18} className="text-primary" />
                  {activeClass.subject || 'No subject'}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col gap-6 w-full overflow-hidden">
              <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md overflow-x-auto no-scrollbar max-w-full">
                {[
                  { id: 'assignments', label: 'Assignments', icon: <Clock size={16} /> },
                  { id: 'materials',   label: 'Resources',   icon: <FileText size={16} /> },
                  { id: 'discussion',  label: 'Connect',    icon: <MessageSquare size={16} /> },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                      activeTab === tab.id ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {activeTab === tab.id && (
                      <motion.div 
                        layoutId="tab-pill"
                        className="absolute inset-0 bg-purple-600 rounded-xl shadow-lg shadow-purple-600/20" 
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                    <span className="relative z-10">{tab.icon}</span>
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {[1,2,3,4].map(i => <div key={i} className="h-48 skeleton opacity-10 rounded-3xl" />)}
              </motion.div>
            ) : tasks.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="premium-empty"
              >
                <div className="empty-illustration">📚</div>
                <div>
                  <h3 className="text-3xl font-black mb-3 leading-tight">No assignments yet</h3>
                  <p className="text-muted max-w-md mx-auto text-lg leading-relaxed">
                    You're all caught up! Check back later for new tasks.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="content"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="assignments-list"
              >
                {tasks.map((task) => {
                  const sub    = getSubmission(task._id);
                  const status = getTaskStatus(task, sub);
                  const meta   = STATUS_META[status];
                  const deadline = new Date(task.dueDate);

                  return (
                    <motion.div
                      key={task._id}
                      variants={itemVariants}
                      layout
                    >
                      <GlassCard
                        className="h-full flex flex-col !p-8 group border-none relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full" style={{ background: meta.color }} />
                        
                        <div className="flex justify-between items-start mb-8">
                          <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-md">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted">{task.subject || activeClass.subject}</span>
                          </div>
                          <motion.span
                            whileHover={{ scale: 1.1 }}
                            className="px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                            style={{ background: meta.bg, color: meta.color }}
                          >
                            {meta.label}
                          </motion.span>
                        </div>

                        <h3 className="text-2xl font-black mb-4 group-hover:text-primary transition-colors leading-tight">
                          {task.title}
                        </h3>
                        <p className="text-muted text-base mb-10 line-clamp-3 leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">
                          {task.description}
                        </p>

                        <div className="flex items-center justify-between mt-auto pt-8 border-t border-white/5">
                          <div className="flex items-center gap-3 text-sm font-bold text-muted">
                            <CalendarIcon size={18} className="text-primary" />
                            <span>{deadline.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</span>
                          </div>

                          <div className="flex gap-3">
                            {sub && (
                              <motion.button
                                whileHover={{ scale: 1.1, rotate: -10 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setExpandedHistory(expandedHistory === task._id ? null : task._id)}
                                className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/5"
                                title="View history"
                              >
                                <History size={20} className="text-muted" />
                              </motion.button>
                            )}
                            <Button
                              onClick={() => setActiveTask(activeTask?._id === task._id ? null : task)}
                              className="h-12 px-8 text-sm font-black rounded-2xl shadow-xl hover:shadow-primary/20"
                            >
                              {sub ? 'Update Submission' : 'Submit Now'}
                            </Button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {activeTask?._id === task._id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-10 pt-10 border-t border-white/10">
                                <SubmissionForm task={task} onSuccess={handleSubmitSuccess} />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      ) : !loading && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="workspace-panel !p-20 text-center flex flex-col items-center gap-6"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <LayoutDashboard size={40} />
          </div>
          <div>
            <h2 className="text-3xl font-black mb-2">Welcome to your Workspace</h2>
            <p className="text-muted max-w-md">Join a class above to start viewing assignments and tracking your progress.</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default StudentDashboard;
