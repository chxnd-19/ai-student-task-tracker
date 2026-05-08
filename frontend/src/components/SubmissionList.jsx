import React, { useState, useEffect } from 'react';
import {
  FileQuestion, Award, Edit3, Check, X,
  ChevronDown, ChevronUp, Star, Sparkles, User, RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import { fetchSubmissionsForTask, retryGrading } from '../services/submissionService';
import AIFeedbackCard from './AIFeedbackCard';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * SubmissionList — teacher view of all submissions for a task.
 *
 * Props:
 *   submissions — array passed directly (optional)
 *   taskId      — fetch submissions for this task if submissions not passed
 */
function SubmissionList({ submissions, taskId }) {
  const [expandedId, setExpandedId]     = useState(null);
  const [data, setData]                 = useState([]);
  const [loading, setLoading]           = useState(false);
  const [overrideId, setOverrideId]     = useState(null);
  const [overrideForm, setOverrideForm] = useState({
    score: '', feedback: '', strengths: '', improvements: '',
  });
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState('');

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (Array.isArray(submissions)) { setData(submissions); return; }
    if (!taskId) return;

    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchSubmissionsForTask(taskId);
        if (mounted) setData(res?.data ?? []);
      } catch { if (mounted) setData([]); }
      finally  { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [submissions, taskId]);

  const safeData = Array.isArray(data) ? data : [];

  // ── Teacher override submit ─────────────────────────────────────────────────
  const handleOverrideSave = async (submissionId) => {
    const score = parseInt(overrideForm.score, 10);
    if (isNaN(score) || score < 0 || score > 100) {
      setSaveError('Score must be 0–100.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const payload = {
        score,
        feedback: overrideForm.feedback.trim(),
      };
      // Parse comma-separated strengths / improvements if provided
      if (overrideForm.strengths.trim()) {
        payload.strengths = overrideForm.strengths.split('\n').map(s => s.trim()).filter(Boolean);
      }
      if (overrideForm.improvements.trim()) {
        payload.improvements = overrideForm.improvements.split('\n').map(s => s.trim()).filter(Boolean);
      }

      const res = await api.put(`/api/submissions/${submissionId}/grade`, payload);
      setData(prev => prev.map(s =>
        s._id === submissionId
          ? {
              ...s,
              aiFeedback:        res.data.data?.aiFeedback        ?? s.aiFeedback,
              finalGrade:        res.data.data?.finalGrade        ?? s.finalGrade,
              reviewedByTeacher: res.data.data?.reviewedByTeacher ?? true,
            }
          : s
      ));
      setOverrideId(null);
    } catch (err) {
      setSaveError(err.response?.data?.message || err.response?.data?.detail || 'Failed to save grade.');
    } finally {
      setSaving(false);
    }
  };

  // ── Approve AI grade (no score change, just marks reviewed) ───────────────
  const handleApproveAI = async (submissionId, sub) => {
    if (!sub.aiFeedback || sub.aiFeedback.status !== 'completed') return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await api.put(`/api/submissions/${submissionId}/grade`, {
        score:       sub.aiFeedback.score,
        feedback:    sub.aiFeedback.feedback,
        strengths:   sub.aiFeedback.strengths ?? [],
        improvements: sub.aiFeedback.improvements ?? [],
      });
      setData(prev => prev.map(s =>
        s._id === submissionId
          ? {
              ...s,
              aiFeedback:        res.data.data?.aiFeedback        ?? s.aiFeedback,
              finalGrade:        res.data.data?.finalGrade        ?? s.finalGrade,
              reviewedByTeacher: true,
            }
          : s
      ));
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Failed to approve grade.');
    } finally {
      setSaving(false);
    }
  };

  const openOverride = (s) => {
    setOverrideId(s._id);
    setOverrideForm({
      score:        s.aiFeedback?.score ?? '',
      feedback:     s.aiFeedback?.feedback ?? '',
      strengths:    (s.aiFeedback?.strengths ?? []).join('\n'),
      improvements: (s.aiFeedback?.improvements ?? []).join('\n'),
    });
    setSaveError('');
  };

  // ── Review status badge ─────────────────────────────────────────────────────
  const ReviewBadge = ({ sub }) => {
    if (sub.reviewedByTeacher) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wide text-blue-400 bg-blue-500/10 border-blue-500/20">
          <Star size={9} /> Instructor Reviewed
        </span>
      );
    }
    const st = sub.aiFeedback?.status;
    if (st === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wide text-purple-400 bg-purple-500/10 border-purple-500/20">
          <Sparkles size={9} className="animate-pulse" /> Pending Review
        </span>
      );
    }
    if (st === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wide text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
          <Sparkles size={9} /> AI Graded
        </span>
      );
    }
    return null;
  };

  // ── Score badge ─────────────────────────────────────────────────────────────
  const ScoreBadge = ({ sub }) => {
    // Prefer finalGrade if teacher has reviewed
    const fb = (sub.reviewedByTeacher && sub.finalGrade) ? sub.finalGrade : sub.aiFeedback;
    if (!fb || fb.status === 'pending') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-semibold">
          Grading…
        </span>
      );
    }
    if (fb.status === 'failed') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30 font-semibold">
          No grade
        </span>
      );
    }
    const score = fb.score ?? 0;
    const grade = fb.grade ?? _scoreToGrade(score);
    const color = score >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : score >= 60 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                :               'text-rose-400 bg-rose-500/10 border-rose-500/20';
    const icon  = sub.reviewedByTeacher ? <Star size={10} /> : <Sparkles size={10} />;
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${color}`}>
        {icon}
        {score}/100 · {grade}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-white/5 rounded-lg h-16" />
        ))}
      </div>
    );
  }

  if (!safeData.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/30">
        <FileQuestion size={48} strokeWidth={1} className="mb-4" />
        <p className="font-bold">No submissions yet</p>
        <p className="text-xs mt-1">When students submit their work, it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {safeData.map((s) => (
        <div
          key={s._id}
          className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all"
        >
          {/* ── Row header ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-sm font-bold text-purple-300">
                {(s.studentId?.name || 'U')[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold">{s.studentId?.name || 'Unknown Student'}</p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">
                    {new Date(s.submittedAt).toLocaleString()}
                  </p>
                  {s.studentId?.profile?.usn && (
                    <span className="text-[10px] text-purple-400 font-mono font-bold">
                      · {s.studentId.profile.usn}
                    </span>
                  )}
                  {s.studentId?.profile?.semester && (
                    <span className="text-[10px] text-white/20">
                      · Sem {s.studentId.profile.semester}
                    </span>
                  )}
                  {s.status === 'late' && (
                    <span className="text-amber-400 font-semibold text-[10px] uppercase tracking-widest">⏰ Late</span>
                  )}
                  <ReviewBadge sub={s} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ScoreBadge sub={s} />

              {/* Approve AI Grade — only when AI graded and not yet reviewed */}
              {s.aiFeedback?.status === 'completed' && !s.reviewedByTeacher && overrideId !== s._id && (
                <button
                  onClick={() => handleApproveAI(s._id, s)}
                  disabled={saving}
                  className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 font-bold transition-all disabled:opacity-40"
                  title="Approve AI grade as final"
                >
                  <Check size={11} /> Approve
                </button>
              )}

              {overrideId === s._id ? (
                <button
                  onClick={() => setOverrideId(null)}
                  className="p-1.5 rounded-lg bg-white/5 text-white/30 hover:text-white transition-all"
                  title="Cancel"
                >
                  <X size={14} />
                </button>
              ) : (
                <button
                  onClick={() => openOverride(s)}
                  className="p-1.5 rounded-lg bg-white/5 text-white/30 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                  title="Override grade"
                >
                  <Edit3 size={14} />
                </button>
              )}

              <button
                onClick={() => setExpandedId(expandedId === s._id ? null : s._id)}
                className="p-1.5 rounded-lg bg-white/5 text-white/30 hover:text-white transition-all"
              >
                {expandedId === s._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {/* ── Teacher override form ───────────────────────────────────────── */}
          {overrideId === s._id && (
            <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4 bg-white/[0.02]">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                <User size={11} /> Override Grade
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/30 mb-1 block">Score (0–100)</label>
                  <input
                    type="number" min="0" max="100"
                    value={overrideForm.score}
                    onChange={e => setOverrideForm(f => ({ ...f, score: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/30 mb-1 block">Overall Feedback</label>
                  <input
                    type="text"
                    placeholder="Summary comment…"
                    value={overrideForm.feedback}
                    onChange={e => setOverrideForm(f => ({ ...f, feedback: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/30 mb-1 block">
                    Strengths <span className="text-white/20">(one per line)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder={"Strong technical understanding\nWell-structured response"}
                    value={overrideForm.strengths}
                    onChange={e => setOverrideForm(f => ({ ...f, strengths: e.target.value }))}
                    style={{ backgroundColor: 'rgba(15,23,42,0.8)', color: '#fff', caretColor: '#c084fc' }}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/30 mb-1 block">
                    Areas to Improve <span className="text-white/20">(one per line)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder={"Needs more detail on deployment\nCould improve clarity"}
                    value={overrideForm.improvements}
                    onChange={e => setOverrideForm(f => ({ ...f, improvements: e.target.value }))}
                    style={{ backgroundColor: 'rgba(15,23,42,0.8)', color: '#fff', caretColor: '#c084fc' }}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                {saveError && <p className="text-xs text-rose-400">{saveError}</p>}
                <button
                  onClick={() => handleOverrideSave(s._id)}
                  disabled={saving}
                  className="ml-auto h-9 px-5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-all"
                >
                  <Check size={14} />
                  {saving ? 'Saving…' : 'Save Override'}
                </button>
              </div>
            </div>
          )}

          {/* ── Expanded content ────────────────────────────────────────────── */}
          {expandedId === s._id && (
            <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
              {/* Submission text */}
              {s.textSubmission && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
                    Student Answer
                  </p>
                  <p className="text-sm text-white/70 leading-relaxed bg-white/5 rounded-lg p-3 border border-white/10 whitespace-pre-wrap">
                    {s.textSubmission}
                  </p>
                </div>
              )}

              {/* File link */}
              {s.fileUrl && (
                <a
                  href={`${API_BASE}${s.fileUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  📄 Download submitted file
                </a>
              )}

              {/* Full AI feedback card — shown for completed and failed states */}
              {s.aiFeedback && (s.aiFeedback.status === 'completed' || s.aiFeedback.status === 'failed') && (
                <AIFeedbackCard
                  feedback={s.aiFeedback}
                  finalGrade={s.finalGrade}
                  reviewedByTeacher={s.reviewedByTeacher}
                  onRetry={s.aiFeedback.status === 'failed' ? async () => {
                    try {
                      await retryGrading(s._id);
                      // Optimistically update local state to show pending spinner
                      setData(prev => prev.map(sub =>
                        sub._id === s._id
                          ? { ...sub, aiFeedback: { ...sub.aiFeedback, status: 'pending', feedback: 'Re-evaluation in progress…' } }
                          : sub
                      ));
                    } catch (err) {
                      // Surface the error — 409 means already graded
                      const msg = err.response?.data?.detail || err.response?.data?.message || 'Retry failed.';
                      setSaveError(msg);
                    }
                  } : undefined}
                />
              )}

              {/* Version history with score trend */}
              {(s.versions?.length ?? 0) > 1 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
                    Submission History ({s.versions.length} versions)
                  </p>
                  <div className="space-y-2">
                    {[...(s.versions ?? [])].reverse().map((v, i, arr) => {
                      const vNum = arr.length - i;
                      // Score trend: compare to previous version (arr is reversed, so next = older)
                      const prevScore = arr[i + 1]?.aiScore ?? null;
                      const currScore = v.aiScore ?? null;
                      let trend = null;
                      if (currScore !== null && prevScore !== null) {
                        if (currScore > prevScore)      trend = { icon: '↑', cls: 'text-emerald-400' };
                        else if (currScore < prevScore) trend = { icon: '↓', cls: 'text-rose-400' };
                        else                            trend = { icon: '→', cls: 'text-white/30' };
                      }
                      return (
                        <div key={i} className="text-xs text-white/40 bg-white/5 rounded-lg p-3 border border-white/10">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-white/60">v{vNum}</span>
                            <div className="flex items-center gap-2">
                              {currScore !== null && (
                                <span className="text-[10px] font-bold text-purple-400">{currScore}/100</span>
                              )}
                              {trend && (
                                <span className={`text-[10px] font-black ${trend.cls}`}>{trend.icon}</span>
                              )}
                              <span className="text-[10px] text-white/20">
                                {new Date(v.submittedAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          {v.textSubmission && (
                            <p className="text-white/50 line-clamp-2">{v.textSubmission}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function _scoreToGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export default React.memo(SubmissionList);
