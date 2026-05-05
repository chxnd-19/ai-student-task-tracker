import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Clock, CheckCircle2, AlertCircle, TrendingUp,
  BookOpen, Users, Layers, ChevronRight, BarChart3, Flame,
} from 'lucide-react';
import { useClasses, useJoinClass }   from '../hooks/useClasses';
import { useTasks, useTaskSummary }   from '../hooks/useTasks';
import { fetchMySubmissions }         from '../services/submissionService';
import { useQuery }                   from '@tanstack/react-query';
import SubmissionForm    from '../components/SubmissionForm';
import ActivityFeed      from '../components/ActivityFeed';
import Pagination        from '../components/Pagination';
import { useSocket }     from '../hooks/useSocket';
import { useToast }      from '../hooks/useToast';
import Toast             from '../components/Toast';
import { SkeletonDashboard } from '../components/SkeletonLoader';
import ErrorState        from '../components/ErrorState';
import { getTaskStatus, STATUS_META } from '../utils/taskStatus';
import Layout            from '../components/Layout';
import { useAuth }       from '../context/AuthContext';

function StudentDashboard() {
  const { user } = useAuth();
  const { toast, showToast, clearToast } = useToast();

  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [activeTask, setActiveTask]           = useState(null);
  const [searchQuery, setSearchQuery]         = useState('');
  const [filterStatus, setFilterStatus]       = useState('all');
  const [page, setPage]                       = useState(1);

  // ── TanStack Query ──────────────────────────────────────────────────────────
  const {
    data: workspaces = [],
    isLoading: classesLoading,
    isError: classesError,
    refetch: refetchClasses,
    error: classesErr,
  } = useClasses();

  const joinMutation = useJoinClass();

  const {
    data: tasksResult,
    isLoading: tasksLoading,
  } = useTasks(
    { classId: activeWorkspace?._id, page },
    { enabled: !!activeWorkspace?._id }
  );

  const tasks      = tasksResult?.data       || [];
  const totalPages = tasksResult?.totalPages || 1;
  const totalTasks = tasksResult?.total      || 0;

  const { data: summary = { pending: 0, submitted: 0, overdue: 0, late: 0 } } =
    useTaskSummary(activeWorkspace?._id, { enabled: !!activeWorkspace?._id });

  const { data: submissionsRes } = useQuery({
    queryKey: ['submissions', 'my'],
    queryFn:  fetchMySubmissions,
    select:   (res) => res.data || [],
  });
  const submissions = submissionsRes || [];

  const { activities = [] } = useSocket(activeWorkspace?._id);

  // ── Auto-select first workspace ─────────────────────────────────────────────
  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspace) {
      setActiveWorkspace(workspaces[0]);
    }
  }, [workspaces, activeWorkspace]);

  // Reset page when workspace changes
  useEffect(() => { setPage(1); }, [activeWorkspace?._id]);

  // ── Join class ──────────────────────────────────────────────────────────────
  const [code, setCode] = useState('');
  const handleJoin = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      const joined = await joinMutation.mutateAsync(code.trim().toUpperCase());
      setCode('');
      setActiveWorkspace(joined);
      showToast(`Joined "${joined.name}" successfully!`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Join failed. Check the code.', 'error');
    }
  };

  const getSubmission = useCallback(
    (taskId) => submissions.find(s => String(s.taskId?._id || s.taskId) === String(taskId)),
    [submissions]
  );

  const handleSubmitSuccess = () => {
    showToast('Submission successful! ✅');
    setActiveTask(null);
  };

  // ── Analytics (memoized) ────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const total     = summary.pending + summary.submitted + summary.overdue + summary.late;
    const completed = summary.submitted + summary.late;
    return {
      total,
      completed,
      completionPct: total > 0 ? Math.round((completed / total) * 100) : 0,
      onTimePct:     completed > 0 ? Math.round((summary.submitted / completed) * 100) : 0,
    };
  }, [summary]);

  // ── Filtered tasks (memoized) ───────────────────────────────────────────────
  const filteredTasks = useMemo(() =>
    tasks
      .filter(task => {
        const sub    = getSubmission(task._id);
        const status = getTaskStatus(task, sub);
        return filterStatus === 'all' || status === filterStatus;
      })
      .filter(task =>
        !searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [tasks, filterStatus, searchQuery, getSubmission]
  );

  // ── Loading state ───────────────────────────────────────────────────────────
  if (classesLoading) return (
    <Layout>
      <div className="mb-6">
        <div className="animate-pulse bg-white/10 rounded h-7 w-48 mb-2" />
        <div className="animate-pulse bg-white/5 rounded h-4 w-32" />
      </div>
      <SkeletonDashboard />
    </Layout>
  );

  // ── Error state ─────────────────────────────────────────────────────────────
  if (classesError) return (
    <Layout>
      <ErrorState
        message={classesErr?.response?.data?.message || 'Failed to load classes.'}
        onRetry={refetchClasses}
      />
    </Layout>
  );

  return (
    <Layout>
      <Toast message={toast.message} type={toast.type} onClose={clearToast} />

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          Welcome back, {user?.name?.split(' ')[0] || 'Student'}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {summary.pending} pending · {workspaces.length} classes
        </p>      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-3 gap-6">

        {/* LEFT — 2 columns */}
        <div className="col-span-2 space-y-6">

          {/* STATS 2×2 */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: <Clock size={20} className="text-amber-400" />,    label: 'Pending',         value: summary.pending   },
              { icon: <CheckCircle2 size={20} className="text-emerald-400" />, label: 'Completed',  value: summary.submitted },
              { icon: <AlertCircle size={20} className="text-rose-400" />,label: 'Overdue',         value: summary.overdue   },
              { icon: <TrendingUp size={20} className="text-blue-400" />, label: 'Completion Rate', value: analytics.total > 0 ? `${analytics.completionPct}%` : '--' },
            ].map(({ icon, label, value }) => (
              <div key={label} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex justify-between items-center hover:border-white/20 transition-all">
                <div>
                  <div className="mb-2">{icon}</div>
                  <p className="text-sm text-gray-400">{label}</p>
                </div>
                <p className="text-3xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          {/* ANALYTICS SECTION */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
            <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-purple-400" />
              Analytics
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {/* Completion bar */}
              <div className="col-span-2 space-y-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Overall Completion</span>
                  <span className="text-white font-semibold">{analytics.completionPct}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-700"
                    style={{ width: `${analytics.completionPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>On-time Rate</span>
                  <span className="text-white font-semibold">{analytics.onTimePct}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                    style={{ width: `${analytics.onTimePct}%` }}
                  />
                </div>
              </div>
              {/* Streak / summary */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col items-center justify-center gap-1">
                <Flame size={22} className="text-orange-400" />
                <p className="text-2xl font-bold">{analytics.completed}</p>
                <p className="text-[10px] text-gray-400 text-center">Tasks Done</p>
              </div>
            </div>
            {/* Status breakdown */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              {[
                { label: 'Pending',   value: summary.pending,   color: 'bg-amber-500'  },
                { label: 'Done',      value: summary.submitted,  color: 'bg-emerald-500'},
                { label: 'Overdue',   value: summary.overdue,    color: 'bg-rose-500'   },
                { label: 'Late',      value: summary.late,       color: 'bg-orange-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white/5 rounded-lg p-2 text-center border border-white/10">
                  <div className={`w-2 h-2 rounded-full ${color} mx-auto mb-1`} />
                  <p className="text-lg font-bold">{value}</p>
                  <p className="text-[10px] text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ASSIGNMENTS */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Layers size={18} className="text-purple-400" />
                Active Assignments
              </h2>
              <span className="text-sm text-gray-400">{tasks.length} total</span>
            </div>

            {/* Search + Filter */}
            {tasks.length > 0 && (
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="submitted">Submitted</option>
                  <option value="overdue">Overdue</option>
                  <option value="late">Late</option>
                </select>
              </div>
            )}

            {/* Pagination */}
            <Pagination
              page={page}
              totalPages={totalPages}
              total={totalTasks}
              limit={20}
              onPageChange={setPage}
            />
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
              <div className="text-center text-gray-400 py-8">
                <BookOpen size={32} className="mx-auto text-white/10 mb-3" />
                <p className="text-sm font-medium">No assignments yet</p>
                <p className="text-xs text-white/20 mt-1">Join a class to see your tasks here.</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Layers size={28} className="mx-auto text-white/10 mb-3" />
                <p className="text-sm">No tasks match your filter.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map(task => {
                  const sub    = getSubmission(task._id);
                  const status = getTaskStatus(task, sub);
                  const meta   = STATUS_META[status];
                  return (
                    <div
                      key={task._id}
                      onClick={() => setActiveTask(activeTask?._id === task._id ? null : task)}
                      className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
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
                              style={{ color: meta.color, backgroundColor: meta.bg + '20', borderColor: meta.color + '40' }}
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
                          className={`text-white/30 transition-transform shrink-0 ${activeTask?._id === task._id ? 'rotate-90 text-purple-400' : ''}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            <Pagination
              page={page}
              totalPages={totalPages}
              total={totalTasks}
              limit={20}
              onPageChange={setPage}
            />
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="col-span-1 space-y-6">

          {/* JOIN CLASS */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
            <h3 className="text-sm font-medium mb-3">Join Class</h3>
            <form onSubmit={handleJoin} className="space-y-3">
              <input
                type="text"
                placeholder="ENTER CODE"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                className="w-full h-11 px-4 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center font-mono tracking-[0.3em] font-semibold"
                maxLength={6}
              />
              <button
                type="submit"
                disabled={joinMutation.isPending || !code.trim()}
                className="w-full h-11 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white font-medium hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joinMutation.isPending ? 'Joining...' : 'Join Class'}
              </button>
            </form>
          </div>

          {/* MY CLASSES */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
            <h3 className="text-sm font-medium mb-3">My Classes</h3>
            {workspaces.length === 0 ? (
              <div className="text-center text-gray-400 py-6">
                <BookOpen size={24} className="mx-auto text-white/10 mb-2" />
                <p className="text-sm">No classes yet</p>
                <p className="text-xs text-white/20 mt-1">Use a join code above.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {workspaces.map(cls => (
                  <div
                    key={cls._id}
                    onClick={() => setActiveWorkspace(cls)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                      activeWorkspace?._id === cls._id
                        ? 'bg-purple-500/20 border border-purple-500/40'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                        activeWorkspace?._id === cls._id ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/50'
                      }`}>
                        {cls.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${activeWorkspace?._id === cls._id ? 'text-white' : 'text-gray-300'}`}>
                          {cls.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {cls.students?.length || 0} students
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className={`shrink-0 ${activeWorkspace?._id === cls._id ? 'text-purple-400' : 'text-white/30'}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACTIVITY FEED */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
            <ActivityFeed limit={8} />
          </div>
        </div>
      </div>

      {/* SUBMISSION MODAL */}
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
