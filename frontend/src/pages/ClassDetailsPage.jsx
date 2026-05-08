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
  Plus,
  Eye,
  Mail,
  Phone,
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
import { useAuth } from '../context/AuthContext';

function ClassDetailsPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  const [workspace, setWorkspace] = useState(null);
  const [tasks, setTasks]         = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [toast, setToast]         = useState({ message: '', type: 'success' });
  const [instructorProfile, setInstructorProfile] = useState(null);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      // Fetch class info and tasks in parallel.
      // Students also fetch their own submissions for status badges.
      const requests = [
        api.get("/api/classes"),
        fetchTasks({ classId }),
      ];
      if (!isTeacher) {
        requests.push(fetchMySubmissions());
      }

      const [wRes, tRes, sRes] = await Promise.all(requests);

      // Locate this class from the list
      const found = (wRes.data.data || []).find(w => w._id === classId);
      setWorkspace(found ?? null);

      // tRes is the shaped object from fetchTasks: { data, page, totalPages, total, limit }
      setTasks(tRes?.data ?? []);

      // sRes only exists for students
      setSubmissions(sRes?.data ?? []);

      // Fetch instructor profile for students (to show contact info)
      if (!isTeacher && found?.teacherId) {
        try {
          const tid = typeof found.teacherId === 'object'
            ? (found.teacherId.id || found.teacherId._id)
            : found.teacherId;
          if (tid) {
            const pRes = await api.get(`/api/profile/${tid}`);
            setInstructorProfile(pRes.data?.data?.profile ?? null);
          }
        } catch {
          // non-critical — silently ignore
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load class details.';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [classId, isTeacher]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getSubmission = (taskId) =>
    submissions.find((s) => String(s.taskId?._id || s.taskId) === String(taskId));

  // Refetch only submissions — avoids re-fetching class/tasks/profile on every submit
  const refreshSubmissions = useCallback(async () => {
    if (isTeacher) return;
    try {
      const sRes = await fetchMySubmissions();
      setSubmissions(sRes?.data ?? []);
    } catch {
      // non-critical — silently ignore
    }
  }, [isTeacher]);

  const handleSubmitSuccess = () => {
    setToast({ message: 'Submission successful! ✅', type: 'success' });
    setActiveTask(null);
    // Refresh only submissions — not the full page
    refreshSubmissions();
  };

  if (loading) return <Layout><div className="p-20"><Spinner text="Loading class details..." /></div></Layout>;
  if (loadError) return (
    <Layout>
      <div className="p-20 flex flex-col items-center gap-4 text-center">
        <p className="text-rose-400 font-medium">{loadError}</p>
        <button
          onClick={loadData}
          className="h-10 px-5 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-all"
        >
          Retry
        </button>
      </div>
    </Layout>
  );
  if (!workspace) return <Layout><div className="p-20 text-center text-white/40">Class not found.</div></Layout>;

  return (
    <Layout>
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
      
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-4">
          <button 
            onClick={() => navigate('/classes')}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
          >
            <ArrowLeft size={14} /> Back to Classes
          </button>
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 text-purple-500 font-black text-xs uppercase tracking-[0.3em]">
              <BookOpen size={14} />
              <span>Class Details</span>
            </div>
            <h1 className="text-5xl font-black tracking-tight text-white">{workspace.name}</h1>
            <div className="flex items-center flex-wrap gap-y-4 gap-x-6 mt-2">
              <div className="flex items-center gap-2 text-white/40 text-sm">
                <Users size={16} />
                <span className="font-bold">{workspace.subject || 'Class Info'}</span>
              </div>
              {workspace.teacher && (
                <div className="flex items-center gap-2 text-white/40 text-sm border-l border-white/10 pl-6">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-[10px] font-black">
                    {workspace.teacher.name[0]}
                  </div>
                  <span className="font-bold">Led by {workspace.teacher.name}</span>
                </div>
              )}
              <div className="px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-mono font-bold uppercase tracking-widest">
                Class Code: {workspace.joinCode || '—'}
              </div>
            </div>

            {/* Step 7: Instructor contact — visible to students only */}
            {!isTeacher && instructorProfile && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 pt-3 border-t border-white/5">
                {instructorProfile.department && (
                  <span className="text-xs text-white/40 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-purple-400" />
                    {instructorProfile.department}
                  </span>
                )}
                {instructorProfile.email && (
                  <a
                    href={`mailto:${instructorProfile.email}`}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5"
                  >
                    <Mail size={11} />
                    {instructorProfile.email}
                  </a>
                )}
                {instructorProfile.contact_number && (
                  <span className="text-xs text-white/40 flex items-center gap-1.5">
                    <Phone size={11} />
                    {instructorProfile.contact_number}
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        <div className="grid lg:grid-cols-[1fr_320px] gap-10 items-start">
          <section className="flex flex-col gap-6">
            <h2 className="text-2xl font-black tracking-tight">Active Assignments</h2>
            
            <div className="space-y-4">
            {tasks.length === 0 ? (
              <GlassCard className="p-20 flex flex-col items-center justify-center text-center gap-6 border-dashed border-white/10">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                  <Calendar size={40} />
                </div>
                {isTeacher ? (
                  <div className="flex flex-col items-center gap-4">
                    <div>
                      <h3 className="text-xl font-bold">No assignments yet</h3>
                      <p className="text-white/30 text-sm max-w-xs mt-1">
                        Create your first assignment to get started.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/dashboard`)}
                      className="flex items-center gap-2 h-10 px-5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                      <Plus size={16} />
                      Add Assignment
                    </button>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xl font-bold">No assignments posted</h3>
                    <p className="text-white/30 text-sm max-w-xs mt-1">
                      Assignments created by your instructor will appear here.
                    </p>
                  </div>
                )}
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

                          {/* ── Role-aware action ─────────────────────────── */}
                          {isTeacher ? (
                            /* Teacher: navigate to dashboard to review submissions */
                            <button
                              onClick={() => navigate('/teacher/dashboard')}
                              className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2"
                            >
                              <Eye size={14} />
                              Review Submissions
                            </button>
                          ) : (
                            /* Student: toggle submission form */
                            <button
                              onClick={() => setActiveTask(activeTask?._id === task._id ? null : task)}
                              className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2"
                            >
                              {sub ? 'Update Submission' : 'Submit Task'}
                              <ChevronRight size={14} />
                            </button>
                          )}
                        </div>

                        {/* ── Submission form — students only ───────────── */}
                        {!isTeacher && (
                          <AnimatePresence>
                            {activeTask?._id === task._id && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-6 pt-6 border-t border-white/5 space-y-6 overflow-hidden"
                              >
                                <SubmissionForm task={task} onSuccess={handleSubmitSuccess} />
                                {sub?.aiFeedback && (
                                  <AIFeedbackCard
                                    feedback={sub.aiFeedback}
                                    finalGrade={sub.finalGrade}
                                    reviewedByTeacher={sub.reviewedByTeacher}
                                  />
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        )}

                        {/* ── AI feedback — always visible once graded ──── */}
                        {!isTeacher && sub?.aiFeedback && activeTask?._id !== task._id && (
                          <div className="mt-4 pt-4 border-t border-white/5">
                            <AIFeedbackCard
                              feedback={sub.aiFeedback}
                              finalGrade={sub.finalGrade}
                              reviewedByTeacher={sub.reviewedByTeacher}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
            </div>
          </section>

          {!isTeacher && workspace.teacher && (
            <aside className="flex flex-col gap-6 sticky top-28">
              <h2 className="text-2xl font-black tracking-tight">Instructor</h2>
              <div className="glass-card p-6 border border-white/5 shadow-2xl bg-gradient-to-b from-white/[0.02] to-transparent">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-purple-500/20">
                    {workspace.teacher.name[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{workspace.teacher.name}</h3>
                    <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest mt-0.5">Faculty Lead</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {workspace.teacher.profile?.qualification && (
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1.5 flex items-center gap-2">
                         Qualification
                      </p>
                      <p className="text-sm font-bold text-white/90">{workspace.teacher.profile.qualification}</p>
                    </div>
                  )}
                  {workspace.teacher.profile?.department && (
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1.5 flex items-center gap-2">
                         Department
                      </p>
                      <p className="text-sm font-bold text-white/90">{workspace.teacher.profile.department}</p>
                    </div>
                  )}
                  {workspace.teacher.profile?.email && (
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-colors">
                      <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1.5 flex items-center gap-2">
                         Contact Email
                      </p>
                      <p className="text-sm font-bold text-purple-400 break-all">{workspace.teacher.profile.email}</p>
                    </div>
                  )}
                  {workspace.teacher.profile?.contact_number && (
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1.5 flex items-center gap-2">
                         Phone
                      </p>
                      <p className="text-sm font-bold text-white/90">{workspace.teacher.profile.contact_number}</p>
                    </div>
                  )}
                  {!workspace.teacher.profile?.email && !workspace.teacher.profile?.contact_number && (
                    <div className="p-10 text-center border border-dashed border-white/10 rounded-2xl">
                      <p className="text-xs text-white/20 italic">No contact info shared</p>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default ClassDetailsPage;
