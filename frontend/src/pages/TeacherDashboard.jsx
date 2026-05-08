import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Users, BookOpen, BarChart3, Trash2, Edit3, Copy, Check, X,
  Calendar as CalendarIcon, ChevronRight, TrendingUp, Target, Sparkles,
} from 'lucide-react';
import { fetchTasks, createTask, updateTask, deleteTask, fetchStudents } from '../services/taskService';
import { fetchClassAnalytics } from '../services/submissionService';
import SubmissionList from '../components/SubmissionList';
import ActivityFeed from '../components/ActivityFeed';
import { useSocket } from '../hooks/useSocket';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { SkeletonDashboard } from '../components/SkeletonLoader';
import ErrorState from '../components/ErrorState';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const emptyTask = { title: '', subject: '', dueDate: '', description: '', status: 'pending', submissionType: 'text', priority: 'medium' };

function TeacherDashboard() {
  const { user } = useAuth();
  const { toast, showToast, clearToast } = useToast();

  const [workspaceName, setWorkspaceName]   = useState('');
  const [workspaces, setWorkspaces]         = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [loading, setLoading]               = useState(true);
  const [loadError, setLoadError]           = useState(null);
  const [tasksLoading, setTasksLoading]     = useState(false);
  const [tasks, setTasks]                   = useState([]);
  const [tasksTotal, setTasksTotal]         = useState(0);
  const [form, setForm]                     = useState(emptyTask);
  const [editId, setEditId]                 = useState(null);
  const [showForm, setShowForm]             = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [viewTask, setViewTask]             = useState(null);
  const [analytics, setAnalytics]           = useState({});
  const [showClassModal, setShowClassModal] = useState(false);
  const [copiedCode, setCopiedCode]         = useState(false);
  const [students, setStudents]             = useState([]);
  const [avgGrade, setAvgGrade]             = useState('--');
  const [completionRate, setCompletionRate] = useState(0);
  const [searchQuery, setSearchQuery]       = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const { activities = [] } = useSocket(activeWorkspace?._id, user?.id);
  // Calculate average grade from analytics (averageScore is 0–100)
  const calculateAverageGrade = useCallback((analyticsData) => {
    const taskAnalytics = Object.values(analyticsData || {});
    if (taskAnalytics.length === 0) return '--';

    const scores = taskAnalytics
      .map(t => t.averageScore)
      .filter(s => s !== null && s !== undefined);

    if (scores.length === 0) return '--';

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

    if (avg >= 90) return 'A';
    if (avg >= 80) return 'B';
    if (avg >= 70) return 'C';
    if (avg >= 60) return 'D';
    return 'F';
  }, []);

  // Calculate completion rate using real submission counts from analytics
  const calculateCompletionRate = useCallback((analyticsData, totalStudents, totalTasks) => {
    if (!totalStudents || !totalTasks) return 0;

    const totalPossible = totalStudents * totalTasks;
    let totalSubmissions = 0;

    Object.values(analyticsData || {}).forEach(task => {
      // backend field is "submitted", not "submissions"
      totalSubmissions += (task.submitted ?? 0);
    });

    return Math.round((totalSubmissions / totalPossible) * 100);
  }, []);

  // ── Grade distribution — derived from analytics averageScore per task ──────
  const gradeDistribution = useMemo(() => {
    const scores = Object.values(analytics)
      .map(t => t.averageScore)
      .filter(s => s !== null && s !== undefined);
    if (scores.length === 0) return null;
    const dist = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    scores.forEach(s => {
      if (s >= 90)      dist.A++;
      else if (s >= 80) dist.B++;
      else if (s >= 70) dist.C++;
      else if (s >= 60) dist.D++;
      else              dist.F++;
    });
    const total = scores.length;
    return Object.entries(dist).map(([grade, count]) => ({
      grade,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }, [analytics]);

  // ── Class performance insights — derived from AI feedback weaknesses ────────
  const classInsights = useMemo(() => {
    // Collect all improvement strings from analytics (averageScore + task title)
    const taskList = Object.values(analytics);
    if (taskList.length === 0) return null;

    const avgScores = taskList
      .filter(t => t.averageScore !== null && t.averageScore !== undefined)
      .map(t => t.averageScore);

    if (avgScores.length === 0) return null;

    const overallAvg = Math.round(avgScores.reduce((a, b) => a + b, 0) / avgScores.length);
    const topTask    = taskList.reduce((best, t) =>
      (t.averageScore ?? 0) > (best.averageScore ?? 0) ? t : best, taskList[0]);
    const weakTask   = taskList.reduce((worst, t) =>
      (t.averageScore ?? 100) < (worst.averageScore ?? 100) ? t : worst, taskList[0]);

    return { overallAvg, topTask, weakTask };
  }, [analytics]);

  const fetchWorkspaces = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get("/api/classes");
      setWorkspaces(res.data.data || []);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Failed to load classes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreateWorkspace = async (e) => {
    if (e) e.preventDefault();
    if (!workspaceName.trim()) return;

    try {
      const res = await api.post("/api/classes", { name: workspaceName });
      const workspace = res.data.data;
      setWorkspaceName("");
      setShowClassModal(false);
      setWorkspaces(prev => [...prev, workspace]);
      showToast(`Class "${workspace.name}" created!`);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to create class", "error");
    }
  };

  const loadWorkspaceData = useCallback(async (cls) => {
    if (!cls?._id) return;
    setTasksLoading(true);
    try {
      const [tRes, aRes, sRes] = await Promise.all([
        fetchTasks({ classId: cls._id }),
        fetchClassAnalytics(cls._id),
        fetchStudents(cls._id)
      ]);
      const tasksData    = tRes?.data    ?? [];
      const studentsData = sRes?.data    ?? [];
      
      setTasks(tasksData);
      setTasksTotal(tRes?.total ?? tasksData.length);
      setStudents(studentsData);
      
      const map = {};
      (aRes?.data?.tasks ?? []).forEach((t) => { 
        if (t?.taskId) map[String(t.taskId)] = t; 
      });
      setAnalytics(map);
      
      // Calculate average grade
      const grade = calculateAverageGrade(map);
      setAvgGrade(grade);
      
      // Calculate completion rate using the real total (not just the current page)
      const rate = calculateCompletionRate(map, studentsData.length, tRes?.total ?? tasksData.length);
      setCompletionRate(rate);
    } catch (err) {
      // loadWorkspaceData failure is non-fatal — tasks/analytics just won't show
    } finally {
      setTasksLoading(false);
    }
  }, [calculateAverageGrade, calculateCompletionRate]);

  useEffect(() => {
    if (activeWorkspace?._id) {
      loadWorkspaceData(activeWorkspace);
    }
  }, [activeWorkspace?._id, loadWorkspaceData]);

  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspace) {
      setActiveWorkspace(workspaces[0]);
    }
  }, [workspaces, activeWorkspace]);

  const copyJoinCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      showToast("Code copied to clipboard!");
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !activeWorkspace) return;
    setSubmitting(true);
    try {
      if (editId) {
        const { data } = await updateTask(editId, form);
        setTasks((prev) => prev.map((t) => (t._id === data._id ? data : t)));
        showToast('Task updated.');
      } else {
        const { data } = await createTask({ ...form, classId: activeWorkspace._id });
        setTasks((prev) => [data, ...prev]);
        showToast('Task created.');
      }
      setForm(emptyTask); setEditId(null); setShowForm(false);
    } catch (err) {
      showToast('Failed to save task.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <Layout>
      <div className="mb-6">
        <div className="animate-pulse bg-white/10 rounded h-7 w-48 mb-2" />
        <div className="animate-pulse bg-white/5 rounded h-4 w-32" />
      </div>
      <SkeletonDashboard />
    </Layout>
  );

  if (loadError) return (
    <Layout>
      <ErrorState message={loadError} onRetry={fetchWorkspaces} />
    </Layout>
  );

  return (
    <Layout>
      <div className="glow-blob top-0 -right-20 w-[500px] h-[500px] bg-purple-500/10" />
      <div className="glow-blob bottom-0 -left-20 w-[600px] h-[600px] bg-blue-500/10" />

      <Toast message={toast.message} type={toast.type} onClose={clearToast} />

      {/* HEADER */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold mb-2">
          <Users size={14} />
          <span>Instructor Portal</span>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Class Management</h1>
            <p className="text-sm text-gray-400 mt-1">Manage your assignments and track student progress</p>
          </div>
          <button 
            onClick={() => setShowClassModal(true)}
            className="h-11 px-6 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Plus size={18} />
            Create New Class
          </button>
        </div>
      </div>

      {/* GRID LAYOUT */}
      <div className="grid grid-cols-3 gap-6">
        
        {/* LEFT - 2 COLUMNS */}
        <div className="col-span-2 space-y-6">
          
          {/* STATS - 2x2 GRID */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
              <div className="flex justify-between items-center">
                <div>
                  <Users size={20} className="text-blue-400 mb-2" />
                  <p className="text-sm text-gray-400">Active Students</p>
                </div>
                <p className="text-3xl font-bold">{students.length}</p>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
              <div className="flex justify-between items-center">
                <div>
                  <BookOpen size={20} className="text-purple-400 mb-2" />
                  <p className="text-sm text-gray-400">Assignments</p>
                </div>
                <p className="text-3xl font-bold">{tasksTotal}</p>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
              <div className="flex justify-between items-center">
                <div>
                  <Target size={20} className="text-emerald-400 mb-2" />
                  <p className="text-sm text-gray-400">Completion Rate</p>
                </div>
                <p className="text-3xl font-bold">{completionRate}%</p>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
              <div className="flex justify-between items-center">
                <div>
                  <TrendingUp size={20} className="text-amber-400 mb-2" />
                  <p className="text-sm text-gray-400">Avg. Grade</p>
                </div>
                <p className="text-3xl font-bold">{avgGrade}</p>
              </div>
            </div>
          </div>

          {/* ANALYTICS SECTION */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
            <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-purple-400" />
              Class Analytics
            </h2>

            {/* ── Summary stats ── */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Total Tasks',  value: tasksTotal,           color: 'text-purple-400' },
                { label: 'Students',     value: students.length,      color: 'text-blue-400'   },
                { label: 'Completion',   value: `${completionRate}%`, color: 'text-emerald-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* ── Completion progress ── */}
            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Completion Rate</span>
                <span className="text-white font-semibold">{completionRate}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                />
              </div>
            </div>

            {/* ── Grade distribution chart ── */}
            {gradeDistribution ? (
              <div className="mb-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">
                  Grade Distribution
                </p>
                <div className="space-y-2">
                  {gradeDistribution.map(({ grade, count, pct }) => {
                    const gradeColor = {
                      A: 'bg-emerald-500',
                      B: 'bg-teal-500',
                      C: 'bg-amber-500',
                      D: 'bg-orange-500',
                      F: 'bg-rose-500',
                    }[grade] ?? 'bg-white/20';
                    const textColor = {
                      A: 'text-emerald-400',
                      B: 'text-teal-400',
                      C: 'text-amber-400',
                      D: 'text-orange-400',
                      F: 'text-rose-400',
                    }[grade] ?? 'text-white/40';
                    return (
                      <div key={grade} className="flex items-center gap-3">
                        <span className={`text-xs font-black w-4 shrink-0 ${textColor}`}>{grade}</span>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className={`h-full rounded-full ${gradeColor}`}
                          />
                        </div>
                        <span className="text-[10px] text-white/30 w-8 text-right shrink-0">
                          {count > 0 ? `${pct}%` : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mb-5 p-3 rounded-lg bg-white/[0.02] border border-white/5 text-center">
                <p className="text-xs text-white/20">Grade distribution available after AI grading completes</p>
              </div>
            )}

            {/* ── Class performance insights ── */}
            {classInsights && (
              <div className="space-y-2 pt-4 border-t border-white/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                  Performance Insights
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <span className="text-xs text-white/50">Best performing assignment</span>
                    <span className="text-xs font-bold text-emerald-400 truncate max-w-[140px]">
                      {classInsights.topTask?.title ?? '—'}
                      {classInsights.topTask?.averageScore != null && (
                        <span className="ml-1 text-emerald-300">({classInsights.topTask.averageScore}/100)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <span className="text-xs text-white/50">Needs most attention</span>
                    <span className="text-xs font-bold text-amber-400 truncate max-w-[140px]">
                      {classInsights.weakTask?.title ?? '—'}
                      {classInsights.weakTask?.averageScore != null && (
                        <span className="ml-1 text-amber-300">({classInsights.weakTask.averageScore}/100)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-xs text-white/50">Overall class average</span>
                    <span className="text-xs font-bold text-white/70">{classInsights.overallAvg}/100</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ASSIGNMENTS */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <BookOpen size={18} className="text-purple-400" />
                {activeWorkspace ? `Assignments in ${activeWorkspace.name}` : 'Select a Class'}
              </h2>
              {activeWorkspace && (
                <button 
                  onClick={() => setShowForm(true)}
                  className="h-10 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-all flex items-center gap-2"
                >
                  <Plus size={16} /> Add Assignment
                </button>
              )}
            </div>

            {/* Search + Filter bar */}
            {tasks.length > 0 && (
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Search assignments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            )}

            {tasksLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-4">
                    <div className="animate-pulse bg-white/10 rounded-lg w-10 h-10 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="animate-pulse bg-white/10 rounded h-3 w-3/4" />
                      <div className="animate-pulse bg-white/5 rounded h-2.5 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <Sparkles size={40} className="mx-auto text-white/10 mb-4" />
                <p className="text-sm mb-4">No assignments yet</p>
                {activeWorkspace && (
                  <button 
                    onClick={() => setShowForm(true)} 
                    className="h-10 px-6 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-all"
                  >
                    Create First Assignment
                  </button>
                )}
              </div>
            ) : (              <div className="space-y-3">
                {tasks
                  .filter(t => filterPriority === 'all' || t.priority === filterPriority)
                  .filter(t => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.subject.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((task) => {
                  const analyticsData = analytics[String(task._id)] || {};
                  const priorityColors = { high: 'text-rose-400 bg-rose-500/10 border-rose-500/20', medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20', low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
                  const priorityColor = priorityColors[task.priority] || priorityColors.medium;
                  return (
                    <div 
                      key={task._id}
                      className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center text-white/70 font-semibold text-sm">
                            {task.title[0]}
                          </div>
                          <div>
                            <h4 className="text-sm font-medium">{task.title}</h4>
                            <p className="text-xs text-gray-400">{task.subject}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${priorityColor}`}>
                            {task.priority || 'medium'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { setForm(task); setEditId(task._id); setShowForm(true); }} 
                            className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                          >
                            <Edit3 size={14}/>
                          </button>
                          <button 
                            onClick={async () => { 
                              if(confirm('Delete assignment?')) { 
                                await deleteTask(task._id); 
                                loadWorkspaceData(activeWorkspace); 
                              } 
                            }} 
                            className="p-2 rounded-lg bg-white/5 text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          >
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-white/5 rounded-lg p-2 text-center border border-white/10">
                          <p className="text-xs text-gray-400">Submissions</p>
                          <p className="text-lg font-semibold">{analyticsData.submitted ?? 0}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 text-center border border-white/10">
                          <p className="text-xs text-gray-400">Pending</p>
                          <p className="text-lg font-semibold">{analyticsData.missed ?? Math.max(0, (students?.length ?? 0) - (analyticsData.submitted ?? 0))}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 text-center border border-white/10">
                          <p className="text-xs text-gray-400">Late</p>
                          <p className="text-lg font-semibold text-rose-400">{analyticsData.late ?? 0}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/10">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <CalendarIcon size={12}/> {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                        <button 
                          onClick={() => setViewTask(task)}
                          className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 text-xs font-medium"
                        >
                          Review Work
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LIVE ACTIVITY */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all min-h-[120px]">
            <ActivityFeed limit={8} />
          </div>
        </div>

        {/* RIGHT SIDEBAR - 1 COLUMN */}
        <div className="col-span-1 space-y-6">
          
          {/* JOIN CODE */}
          {activeWorkspace && (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
              <h3 className="text-sm font-medium mb-3">Class Join Code</h3>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-3 relative">
                <span className="text-2xl font-mono font-bold text-purple-400 tracking-widest">
                  {activeWorkspace.joinCode || '—'}
                </span>
                <button 
                  onClick={() => copyJoinCode(activeWorkspace.joinCode)}
                  className="absolute -right-2 -bottom-2 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                >
                  {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-xs text-gray-400">Share this code with your students</p>
            </div>
          )}

          {/* MY CLASSES */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">My Classes</h3>
              <button 
                onClick={() => setShowClassModal(true)} 
                className="text-xs text-purple-400 font-medium hover:text-purple-300 transition-colors"
              >
                New
              </button>
            </div>
            
            <div className="space-y-2">
              {workspaces.map((cls) => (
                <button
                  key={cls._id}
                  onClick={() => setActiveWorkspace(cls)}
                  className={`w-full p-3 rounded-lg transition-all text-left flex items-center gap-3 ${
                    activeWorkspace?._id === cls._id 
                      ? 'bg-purple-500/20 border border-purple-500/40' 
                      : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                    activeWorkspace?._id === cls._id 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-white/10 text-white/50'
                  }`}>
                    {cls.name[0]}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      activeWorkspace?._id === cls._id ? 'text-white' : 'text-gray-300'
                    }`}>
                      {cls.name}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Users size={10} /> {cls.joinCode || '—'}
                    </p>
                  </div>
                  
                  {activeWorkspace?._id === cls._id && (
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {showClassModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0b0f1a]/80 backdrop-blur-md" 
              onClick={() => setShowClassModal(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md glass-card p-10 bg-[#111827] border border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black">Create Class</h2>
                <button onClick={() => setShowClassModal(false)} className="text-white/20 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleCreateWorkspace} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] px-1">Class Name</label>
                  <input
                    className="input-glass"
                    placeholder="e.g. Advanced Calculus"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    required autoFocus
                  />
                </div>
                <button type="submit" className="btn-primary w-full h-14">Create Class</button>
              </form>
            </motion.div>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0b0f1a]/80 backdrop-blur-md" 
              onClick={() => setShowForm(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl glass-card p-10 bg-[#111827] border border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black">{editId ? 'Edit Assignment' : 'New Assignment'}</h2>
                <button onClick={() => setShowForm(false)} className="text-white/20 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest px-1">Title</label>
                    <input className="input-glass" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest px-1">Subject</label>
                    <input className="input-glass" value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 font-black uppercase tracking-widest px-1">Due Date</label>
                  <input type="date" className="input-glass" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 font-black uppercase tracking-widest px-1">Priority</label>
                  <select className="input-glass" value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 font-black uppercase tracking-widest px-1">Description</label>
                  <textarea rows="3" className="input-glass" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} required />
                </div>
                <button type="submit" className="btn-primary w-full h-14" disabled={submitting}>
                  {submitting ? 'Processing...' : (editId ? 'Update Assignment' : 'Publish Assignment')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submissions Modal */}
      {viewTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#0b0f1a]/95 backdrop-blur-xl" onClick={() => setViewTask(null)} />
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-5xl h-[80vh] glass-card bg-[#111827] overflow-hidden flex flex-col">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black">{viewTask.title}</h2>
                <p className="text-xs text-white/30 uppercase font-black tracking-widest mt-1">Reviewing submissions from students</p>
              </div>
              <button onClick={() => setViewTask(null)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <SubmissionList taskId={viewTask._id} />
            </div>
          </motion.div>
        </div>
      )}
    </Layout>
  );
}

export default TeacherDashboard;
