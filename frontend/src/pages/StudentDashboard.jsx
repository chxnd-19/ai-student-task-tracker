import React, { useEffect, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import api from '../services/api';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  BookOpen,
  Users,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { fetchTasks, fetchTaskSummary } from '../services/taskService';
import { fetchMySubmissions } from '../services/submissionService';
import SubmissionForm from '../components/SubmissionForm';
import LiveActivityPanel from '../components/LiveActivityPanel';
import { useSocket } from '../hooks/useSocket';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';
import { getTaskStatus, STATUS_META } from '../utils/taskStatus';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

function StudentDashboard() {
  const { user } = useAuth();
  // State Management
  const [code, setCode] = useState("");
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [summary, setSummary] = useState({ pending: 0, submitted: 0, overdue: 0, late: 0 });
  const [activeTask, setActiveTask] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [joining, setJoining] = useState(false);

  const { activities = [] } = useSocket(activeWorkspace?._id);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const res = await api.get("/api/classes");
      setWorkspaces(res.data.data || []);
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleJoin = async (e) => {
    if (e) e.preventDefault();
    if (!code.trim() || joining) return;

    setJoining(true);
    try {
      const res = await api.post("/api/classes/join", { code: code.trim() });
      const workspace = res.data.data;
      
      // Prevent duplicates
      setWorkspaces(prev => {
        if (prev.some(w => w._id === workspace._id)) return prev;
        return [...prev, workspace];
      });
      
      setCode("");
      setActiveWorkspace(workspace);
      showToast(`Joined workspace "${workspace.name}" successfully!`);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Join failed. Please check the code.";
      showToast(msg, "error");
    } finally {
      setJoining(false);
    }
  };

  const loadWorkspaceData = useCallback(async (cls) => {
    if (!cls?._id) return;
    try {
      const [tRes, sRes, sumRes] = await Promise.all([
        fetchTasks({ classId: cls._id }),
        fetchMySubmissions(),
        fetchTaskSummary(cls._id),
      ]);
      setTasks(tRes?.data || []);
      setSubmissions(sRes?.data || []);
      setSummary(sumRes?.data || { pending: 0, submitted: 0, overdue: 0, late: 0 });
    } catch (err) {
      console.error("[StudentDashboard] Session load failed:", err);
      showToast("Failed to sync workspace data.", "error");
    }
  }, [showToast]);

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

  const getSubmission = (taskId) =>
    submissions.find((s) => String(s.taskId?._id || s.taskId) === String(taskId));

  const handleSubmitSuccess = () => {
    showToast('Submission successful! ✅');
    setActiveTask(null);
    if (activeWorkspace?._id) loadWorkspaceData(activeWorkspace);
  };

  // Dynamic Attendance Calculation
  const totalRelevantTasks = summary.submitted + summary.pending;
  const attendanceRate = totalRelevantTasks > 0 
    ? Math.round((summary.submitted / totalRelevantTasks) * 100) 
    : 0;
  
  const displayRate = totalRelevantTasks > 0 ? `${attendanceRate}%` : '--';

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner text="Loading..." />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
      
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          Welcome back, {user?.name?.split(' ')[0] || 'Student'}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {summary.pending} pending • {workspaces.length} classes
        </p>
      </div>

      {/* GRID LAYOUT - 3 COLUMNS */}
      <div className="grid grid-cols-3 gap-6">
        
        {/* LEFT SIDE - 2 COLUMNS */}
        <div className="col-span-2 space-y-6">
          
          {/* STATS GRID - 2x2 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex justify-between items-center transition-all duration-200 hover:border-white/20">
              <div>
                <Clock size={20} className="text-amber-400 mb-2" />
                <p className="text-sm text-gray-400">Pending</p>
              </div>
              <p className="text-3xl font-semibold">{summary.pending}</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex justify-between items-center transition-all duration-200 hover:border-white/20">
              <div>
                <CheckCircle2 size={20} className="text-emerald-400 mb-2" />
                <p className="text-sm text-gray-400">Complete</p>
              </div>
              <p className="text-3xl font-semibold">{summary.submitted}</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex justify-between items-center transition-all duration-200 hover:border-white/20">
              <div>
                <AlertCircle size={20} className="text-rose-400 mb-2" />
                <p className="text-sm text-gray-400">Overdue</p>
              </div>
              <p className="text-3xl font-semibold">{summary.overdue}</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex justify-between items-center transition-all duration-200 hover:border-white/20">
              <div>
                <TrendingUp size={20} className="text-blue-400 mb-2" />
                <p className="text-sm text-gray-400">Completion Rate</p>
              </div>
              <p className="text-3xl font-semibold">{displayRate}</p>
            </div>
          </div>

          {/* ACTIVE ASSIGNMENTS */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 transition-all duration-200 hover:border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Layers size={18} className="text-purple-400" />
                Active Assignments
              </h2>
              <span className="text-sm text-gray-400">{tasks.length} total</span>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <BookOpen size={32} className="mx-auto text-white/10 mb-3" />
                <p className="text-sm">No active assignments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => {
                  const sub = getSubmission(task._id);
                  const status = getTaskStatus(task, sub);
                  const meta = STATUS_META[status];
                  return (
                    <div
                      key={task._id}
                      onClick={() => setActiveTask(activeTask?._id === task._id ? null : task)}
                      className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center text-white/70 font-semibold text-sm shrink-0">
                          {task.title[0]}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium truncate">{task.title}</h4>
                            <span 
                              className="text-xs px-2.5 py-1 rounded-full border font-medium ml-2 shrink-0"
                              style={{ 
                                color: meta.color, 
                                backgroundColor: meta.bg + '20', 
                                borderColor: meta.color + '40' 
                              }}
                            >
                              {meta.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1.5">
                              <Clock size={12} /> 
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Users size={12} /> 
                              {task.subject}
                            </span>
                          </div>
                        </div>

                        <ChevronRight 
                          size={18} 
                          className={`text-white/30 transition-transform duration-200 shrink-0 ${
                            activeTask?._id === task._id ? 'rotate-90 text-purple-400' : ''
                          }`} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR - 1 COLUMN */}
        <div className="col-span-1 space-y-6">
          
          {/* JOIN CLASS */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 transition-all duration-200 hover:border-white/20">
            <h3 className="text-sm font-medium mb-3">Join Class</h3>
            <form onSubmit={handleJoin} className="space-y-3">
              <input
                type="text"
                placeholder="ENTER CODE"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full h-11 px-4 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center font-mono tracking-[0.3em] font-semibold"
                maxLength={6}
              />
              <button
                type="submit"
                disabled={joining || !code.trim()}
                className="w-full h-11 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white font-medium hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joining ? "Joining..." : "Join Class"}
              </button>
            </form>
          </div>

          {/* MY CLASSES */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 transition-all duration-200 hover:border-white/20">
            <h3 className="text-sm font-medium mb-3">My Classes</h3>
            
            {workspaces.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p className="text-sm">No classes yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {workspaces.map((cls) => (
                  <div
                    key={cls._id}
                    onClick={() => setActiveWorkspace(cls)}
                    className={`flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition cursor-pointer ${
                      activeWorkspace?._id === cls._id 
                        ? 'bg-purple-500/20 border border-purple-500/40' 
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                          activeWorkspace?._id === cls._id 
                            ? 'bg-purple-500 text-white' 
                            : 'bg-white/10 text-white/50'
                        }`}
                      >
                        {cls.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          activeWorkspace?._id === cls._id ? 'text-white' : 'text-gray-300'
                        }`}>
                          {cls.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {cls.taskCount || 0} tasks • {cls.students?.length || 0} students
                        </p>
                      </div>
                    </div>
                    <ChevronRight 
                      size={16} 
                      className={`shrink-0 ${activeWorkspace?._id === cls._id ? 'text-purple-400' : 'text-white/30'}`} 
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LIVE ACTIVITY */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 transition-all duration-200 hover:border-white/20 min-h-[120px]">
            <h3 className="text-sm font-medium mb-3">Live Activity</h3>
            {activities.length === 0 ? (
              <div className="text-center text-gray-400 py-6">
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <LiveActivityPanel activities={activities} />
            )}
          </div>
        </div>
      </div>

      {/* SUBMISSION FORM MODAL */}
      <AnimatePresence>
        {activeTask && (
          <SubmissionForm
            task={activeTask}
            existingSubmission={getSubmission(activeTask._id)}
            onClose={() => setActiveTask(null)}
            onSuccess={handleSubmitSuccess}
          />
        )}
      </AnimatePresence>
    </Layout>
  );
}

export default StudentDashboard;
