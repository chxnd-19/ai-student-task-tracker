import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/Button';
import { 
  Plus, 
  Users, 
  BookOpen, 
  BarChart3, 
  Trash2, 
  Edit3, 
  Copy,
  Check,
  X,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { fetchTasks, createTask, updateTask, deleteTask } from '../services/taskService';
import { fetchMyClasses, createClass, deleteClass } from '../services/classService';
import { fetchSubmissionsForTask, fetchClassAnalytics } from '../services/submissionService';
import SubmissionList from '../components/SubmissionList';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import GlassCard from '../components/GlassCard';

const emptyTask  = { title: '', subject: '', dueDate: '', description: '', status: 'pending', submissionType: 'text' };
const emptyClass = { name: '', subject: '', description: '' };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  }
};

function TeacherDashboard({ user }) {
  const [classes,      setClasses]     = useState([]);
  const [activeClass,  setActiveClass] = useState(null);
  const [classForm,    setClassForm]   = useState(emptyClass);
  const [showClassForm, setShowClassForm] = useState(false);
  const [classSubmitting, setClassSubmitting] = useState(false);
  const [classError,   setClassError]  = useState('');

  const [tasks,        setTasks]       = useState([]);
  const [loading,      setLoading]     = useState(false);
  const [form,         setForm]        = useState(emptyTask);
  const [editId,       setEditId]      = useState(null);
  const [showForm,     setShowForm]    = useState(false);
  const [submitting,   setSubmitting]  = useState(false);
  const [formError,    setFormError]   = useState('');

  const [viewTask,     setViewTask]    = useState(null);
  const [submissions,  setSubmissions] = useState([]);
  const [subLoading,   setSubLoading]  = useState(false);
  const [analytics,    setAnalytics]   = useState({});

  const [showClassModal, setShowClassModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const copyJoinCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const [toast, setToast] = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToast({ message, type });

  const loadClasses = useCallback(async () => {
    try {
      const { data } = await fetchMyClasses();
      setClasses(data);
      if (data.length > 0 && !activeClass) {
        setActiveClass(data[0]);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load classes.', 'error');
    }
  }, [activeClass]);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  const loadTasks = useCallback(async (cls) => {
    if (!cls) { setTasks([]); setAnalytics({}); return; }
    setLoading(true);
    try {
      const { data } = await fetchTasks({ classId: cls._id });
      setTasks(data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load tasks.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async (cls) => {
    if (!cls) return;
    try {
      const { data } = await fetchClassAnalytics(cls._id);
      const map = {};
      (data.tasks || []).forEach((t) => { map[String(t.taskId)] = t; });
      setAnalytics(map);
    } catch {
    }
  }, []);

  useEffect(() => { loadTasks(activeClass); }, [activeClass, loadTasks]);
  useEffect(() => { if (activeClass) loadAnalytics(activeClass); }, [activeClass, tasks, loadAnalytics]);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (classSubmitting) return;
    setClassError('');
    setClassSubmitting(true);
    try {
      const { data } = await createClass(classForm);
      setClasses((prev) => [data, ...prev]);
      setClassForm(emptyClass);
      setShowClassModal(false);
      setActiveClass(data);
      showToast(`Class "${data.name}" created. Join code: ${data.joinCode}`);
    } catch (err) {
      setClassError(err.response?.data?.message || 'Failed to create class.');
    } finally {
      setClassSubmitting(false);
    }
  };

  const handleDeleteClass = async (cls) => {
    if (!window.confirm(`Delete class "${cls.name}"? All tasks in this class will still exist.`)) return;
    try {
      await deleteClass(cls._id);
      setClasses((prev) => prev.filter((c) => c._id !== cls._id));
      if (activeClass?._id === cls._id) setActiveClass(null);
      showToast('Class deleted.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed.', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !activeClass) return;
    setFormError('');
    setSubmitting(true);
    try {
      if (editId) {
        const { data } = await updateTask(editId, form);
        setTasks((prev) => prev.map((t) => (t._id === data._id ? data : t)));
        showToast('Task updated.');
      } else {
        const { data } = await createTask({ ...form, classId: activeClass._id });
        setTasks((prev) => [data, ...prev]);
        showToast('Task created.');
      }
      setForm(emptyTask); setEditId(null); setShowForm(false);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save task.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (task) => {
    setForm({
      title: task.title, subject: task.subject,
      dueDate: task.dueDate?.slice(0, 10) || '',
      description: task.description || '',
      status: task.status,
      submissionType: task.submissionType || 'text',
    });
    setEditId(task._id);
    setShowForm(true);
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    const idx  = tasks.findIndex((t) => t._id === id);
    const snap = tasks[idx];
    setTasks((prev) => prev.filter((t) => t._id !== id));
    try {
      await deleteTask(id);
      showToast('Task deleted.');
    } catch (err) {
      setTasks((prev) => { const n = [...prev]; n.splice(idx, 0, snap); return n; });
      showToast(err.response?.data?.message || 'Delete failed.', 'error');
    }
  };

  const handleViewSubmissions = async (task) => {
    setViewTask(task);
    setSubLoading(true);
    try {
      const { data } = await fetchSubmissionsForTask(task._id);
      setSubmissions(data);
      if (activeClass) loadAnalytics(activeClass);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load submissions.', 'error');
    } finally {
      setSubLoading(false);
    }
  };

  const totalStudents = activeClass?.students?.length || 0;
  const activeTasksCount = tasks.filter(t => t.status === 'pending').length;

  // Lock body scroll whenever any modal is open
  const anyModalOpen = showForm || showClassModal || !!viewTask;
  useEffect(() => {
    document.body.style.overflow = anyModalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [anyModalOpen]);

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="dashboard-container max-w-[1400px] mx-auto px-8"
    >
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <motion.h1 
            variants={itemVariants}
            className="text-4xl font-extrabold tracking-tight mb-2 bg-primary-gradient bg-clip-text text-transparent"
          >
            Instructor Portal
          </motion.h1>
          <motion.p variants={itemVariants} className="text-muted text-lg">
            Manage your classes and assignments with precision.
          </motion.p>
        </div>
        <motion.div variants={itemVariants}>
          <Button 
            onClick={() => { setShowForm(true); setEditId(null); setForm(emptyTask); }}
            className="h-12 px-8"
          >
            <Plus size={20} className="mr-2" />
            New Assignment
          </Button>
        </motion.div>
      </header>

      {/* Stats Grid */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <motion.div variants={itemVariants}>
          <GlassCard className="flex items-center gap-6 h-full p-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Users size={28} />
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-1">Total Students</h3>
              <p className="text-4xl font-bold">{totalStudents}</p>
            </div>
          </GlassCard>
        </motion.div>
        <motion.div variants={itemVariants}>
          <GlassCard className="flex items-center gap-6 h-full p-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <BookOpen size={28} />
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-1">Active Tasks</h3>
              <p className="text-4xl font-bold">{activeTasksCount}</p>
            </div>
          </GlassCard>
        </motion.div>
        <motion.div variants={itemVariants}>
          <GlassCard className="flex items-center gap-6 h-full p-8">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <BarChart3 size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-1">Class Code</h3>
              {activeClass?.joinCode ? (
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10 group cursor-pointer" onClick={() => copyJoinCode(activeClass.joinCode)}>
                  <span className="text-2xl font-mono font-bold">{activeClass.joinCode}</span>
                  <button className="text-muted group-hover:text-primary transition-colors">
                    {copiedCode ? <Check size={20} className="text-success" /> : <Copy size={20} />}
                  </button>
                </div>
              ) : (
                <p className="text-4xl font-bold text-primary">---</p>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10 items-start">
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold">My Classes</h2>
            <Button
              variant="secondary"
              className="h-9 px-3 text-xs"
              onClick={() => { setShowClassModal(true); setClassError(''); setClassForm(emptyClass); }}
            >
              <Plus size={14} className="mr-1" /> Create
            </Button>
          </div>
          
          <div className="space-y-3">
            {classes.length === 0 ? (
              <GlassCard className="text-center p-8 opacity-60">
                <p className="text-sm">No classes yet.</p>
              </GlassCard>
            ) : (
              classes.map((cls) => (
                <motion.div 
                  key={cls._id}
                  whileHover={{ x: 4 }}
                  onClick={() => setActiveClass(cls)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${
                    activeClass?._id === cls._id 
                    ? 'bg-surface-hover border-primary shadow-[0_0_20px_rgba(124,58,237,0.2)]' 
                    : 'bg-surface border-border hover:border-white/20'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white ${
                    activeClass?._id === cls._id ? 'bg-primary-gradient' : 'bg-white/10'
                  }`}>
                    {cls.name[0]}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm leading-tight">{cls.name}</h4>
                    <p className="text-xs text-muted mt-1">{cls.subject}</p>
                  </div>
                  <button 
                    className="p-2 text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
                    onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls); }}
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div variants={containerVariants} className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Assignments</h2>
            {activeClass && <p className="text-muted text-sm font-medium">{tasks.length} tasks in {activeClass.name}</p>}
          </div>

          {loading ? (
            <div className="flex justify-center p-20"><Spinner text="Loading tasks..." /></div>
          ) : tasks.length === 0 ? (
            <GlassCard className="text-center py-20 bg-surface/30 border-dashed">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <BookOpen size={32} className="text-muted" />
              </div>
              <h3 className="text-xl font-bold mb-2">No assignments yet</h3>
              <p className="text-muted mb-6">Start by creating your first task for this class.</p>
              <Button onClick={() => setShowForm(true)}>Create Assignment</Button>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {tasks.map((task) => {
                const stats = analytics[String(task._id)];
                const completionRate = stats?.completionRate || 0;

                return (
                  <motion.div
                    key={task._id}
                    variants={itemVariants}
                    layoutId={task._id}
                  >
                    <GlassCard className="h-full flex flex-col p-8 group">
                      <div className="flex justify-between items-start mb-6">
                        <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{task.subject}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(task)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"><Edit3 size={16} /></button>
                          <button onClick={() => handleDelete(task._id, task.title)} className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center text-danger hover:bg-danger/20 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </div>

                      <h3 className="text-2xl font-bold mb-6 group-hover:text-primary transition-colors">{task.title}</h3>
                      
                      <div className="mb-8">
                        <div className="flex justify-between text-xs font-bold mb-3">
                          <span className="text-muted uppercase tracking-wider">Completion Status</span>
                          <span className="text-primary">{completionRate}%</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${completionRate}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-primary-gradient"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                            <p className="text-[10px] text-muted uppercase font-bold mb-1">On Time</p>
                            <p className="text-lg font-bold">{stats?.onTime || 0}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                            <p className="text-[10px] text-muted uppercase font-bold mb-1">Late</p>
                            <p className="text-lg font-bold text-amber-500">{stats?.late || 0}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                            <p className="text-[10px] text-muted uppercase font-bold mb-1">Missed</p>
                            <p className="text-lg font-bold text-danger">{stats?.missed || 0}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                        <div className="flex items-center gap-2 text-sm text-muted font-medium">
                          <CalendarIcon size={16} />
                          <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <Button 
                          variant="ghost"
                          onClick={() => handleViewSubmissions(task)}
                          className="text-xs h-9"
                        >
                          View Submissions
                        </Button>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Add/Edit Task Modal ── */}
      {createPortal(
        <AnimatePresence>
          {showForm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
              onClick={() => setShowForm(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                className="w-full max-w-xl bg-[#0f172a] p-8 rounded-[24px] border border-white/10 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">{editId ? 'Edit Assignment' : 'Create Assignment'}</h2>
                  <button onClick={() => setShowForm(false)} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors"><X size={24} /></button>
                </div>

                {formError && (
                  <p className="text-danger text-sm mb-6 bg-danger/10 p-3 rounded-xl border border-danger/20">{formError}</p>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted uppercase tracking-wider">Title</label>
                      <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="e.g. Final Project" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted uppercase tracking-wider">Subject</label>
                      <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} placeholder="e.g. Computer Science" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted uppercase tracking-wider">Due Date</label>
                      <input type="date" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-muted uppercase tracking-wider">Type</label>
                      <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" value={form.submissionType} onChange={(e) => setForm({...form, submissionType: e.target.value})}>
                        <option value="text">Text Submission</option>
                        <option value="file">PDF File Upload</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-muted uppercase tracking-wider">Description</label>
                    <textarea className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Describe the requirements..." />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button variant="ghost" className="flex-1 h-12" onClick={() => setShowForm(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1 h-12" disabled={submitting}>
                      {submitting ? <Spinner small /> : editId ? 'Save Changes' : 'Create Task'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Create Class Modal ── */}
      {createPortal(
        <AnimatePresence>
          {showClassModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
              onClick={() => setShowClassModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                className="w-full max-w-md bg-[#0f172a] p-8 rounded-[24px] border border-white/10 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold">Create Class</h2>
                    <p className="text-xs text-muted mt-1">A unique join code will be generated.</p>
                  </div>
                  <button onClick={() => setShowClassModal(false)} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors"><X size={24} /></button>
                </div>

                {classError && <p className="text-danger text-sm mb-4 bg-danger/10 p-3 rounded-lg border border-danger/20">{classError}</p>}

                <form onSubmit={handleCreateClass} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-muted uppercase tracking-wider">Class Name</label>
                    <input
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="e.g. Advanced Mathematics"
                      value={classForm.name}
                      onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                      required autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-muted uppercase tracking-wider">Subject</label>
                    <input
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="e.g. Mathematics"
                      value={classForm.subject}
                      onChange={(e) => setClassForm({ ...classForm, subject: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-muted uppercase tracking-wider">Description</label>
                    <textarea
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="Brief description..."
                      rows={3}
                      value={classForm.description}
                      onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button variant="ghost" className="flex-1 h-12" onClick={() => setShowClassModal(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1 h-12" disabled={classSubmitting}>
                      {classSubmitting ? <Spinner small /> : 'Create Class'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Submissions Modal ── */}
      {createPortal(
        <AnimatePresence>
          {viewTask && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
              onClick={() => setViewTask(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-4xl bg-[#0f172a] rounded-[32px] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
                  <div>
                    <h3 className="text-2xl font-bold">Submissions</h3>
                    <p className="text-sm text-muted font-medium mt-1">{viewTask.title}</p>
                  </div>
                  <button onClick={() => setViewTask(null)} className="w-12 h-12 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors"><X size={28} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8">
                  {subLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Spinner size="large" />
                      <p className="text-muted font-medium">Fetching submissions...</p>
                    </div>
                  ) : (
                    <SubmissionList submissions={submissions} />
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}

export default TeacherDashboard;
