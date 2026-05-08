import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, CheckCircle2, AlertCircle, TrendingUp,
  ThumbsUp, Lightbulb, Award, User, ChevronDown,
  BarChart2, Zap, Star, RefreshCw, ShieldAlert,
} from 'lucide-react';

/**
 * GradingTimeline — shows the 4-step grading lifecycle as a horizontal stepper.
 * Steps: Submitted → AI Graded → Instructor Reviewed → Finalized
 */
function GradingTimeline({ aiStatus, reviewedByTeacher }) {
  const steps = [
    { label: 'Submitted',    done: true },
    { label: 'AI Graded',    done: aiStatus === 'completed' || aiStatus === 'failed' },
    { label: 'Reviewed',     done: reviewedByTeacher },
    { label: 'Finalized',    done: reviewedByTeacher },
  ];

  return (
    <div className="flex items-center gap-0 mb-1">
      {steps.map((step, i) => {
        const isActive = !step.done && (i === 0 || steps[i - 1].done);
        const isFailed = i === 1 && aiStatus === 'failed';
        return (
          <React.Fragment key={step.label}>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border transition-all ${
                isFailed
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : step.done
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : isActive
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-400 animate-pulse'
                  : 'bg-white/5 border-white/10 text-white/20'
              }`}>
                {isFailed ? '✕' : step.done ? '✓' : i + 1}
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wide text-center leading-tight ${
                isFailed ? 'text-rose-400' : step.done ? 'text-emerald-400' : isActive ? 'text-purple-400' : 'text-white/20'
              }`}>
                {isFailed ? 'Failed' : step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 mb-4 transition-all ${steps[i].done ? 'bg-emerald-500/30' : 'bg-white/10'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * AIFeedbackCard — full AI evaluation display for a submission.
 *
 * Props:
 *   feedback          — the aiFeedback object from the submission document
 *   finalGrade        — { score, grade, feedback, graded_by } (optional)
 *   reviewedByTeacher — boolean
 *   onRetry           — optional callback; if provided, shows retry button on failed state
 */
const AIFeedbackCard = ({ feedback, finalGrade, reviewedByTeacher, onRetry }) => {
  const [showRubric, setShowRubric] = useState(false);

  if (!feedback) return null;

  // ── Pending ───────────────────────────────────────────────────────────────
  if (feedback.status === 'pending') {
    return (
      <div className="p-5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-4">
        <Sparkles size={20} className="text-purple-400 animate-pulse shrink-0" />
        <div>
          <p className="text-sm font-semibold text-purple-300">AI is evaluating your submission…</p>
          <p className="text-xs text-white/40 mt-0.5">
            This usually takes a few seconds. The page will update automatically.
          </p>
        </div>
      </div>
    );
  }

  // ── Failed ────────────────────────────────────────────────────────────────
  if (feedback.status === 'failed') {
    return (
      <div className="p-5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-3">
        <div className="flex items-center gap-4">
          <AlertCircle size={20} className="text-rose-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-300">Evaluation pending. Instructor review required.</p>
            <p className="text-xs text-white/40 mt-0.5">
              {feedback.feedback || 'AI grading is currently unavailable for this submission.'}
            </p>
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-2 rounded-lg transition-all"
          >
            <RefreshCw size={12} />
            Retry AI Evaluation
          </button>
        )}
      </div>
    );
  }

  // ── Determine which grade to display ─────────────────────────────────────
  // Teacher override → show finalGrade; otherwise show aiFeedback
  const display = (reviewedByTeacher && finalGrade) ? finalGrade : feedback;
  const score   = display.score ?? feedback.score ?? 0;
  const grade   = display.grade ?? feedback.grade ?? _scoreToGrade(score);
  const isTeacher = (display.graded_by ?? feedback.graded_by) === 'teacher';

  const scoreColor =
    score >= 80 ? 'text-emerald-400' :
    score >= 60 ? 'text-amber-400'   :
                  'text-rose-400';
  const barColor =
    score >= 80 ? 'bg-emerald-500' :
    score >= 60 ? 'bg-amber-500'   :
                  'bg-rose-500';
  const scoreBg =
    score >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' :
    score >= 60 ? 'bg-amber-500/10  border-amber-500/20'   :
                  'bg-rose-500/10   border-rose-500/20';

  // ── Review status badge ───────────────────────────────────────────────────
  const StatusBadge = () => {
    if (reviewedByTeacher) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wide text-blue-400 bg-blue-500/10 border-blue-500/20">
          <Star size={9} />
          Instructor Reviewed
        </span>
      );
    }
    if (feedback.status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wide text-purple-400 bg-purple-500/10 border-purple-500/20">
          <Sparkles size={9} />
          AI Graded
        </span>
      );
    }
    return null;
  };

  // ── Confidence badge ──────────────────────────────────────────────────────
  const ConfidenceBadge = () => {
    const conf = feedback.confidence;
    if (!conf || reviewedByTeacher) return null;
    const map = {
      high:   { label: 'High Confidence',   cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
      medium: { label: 'Medium Confidence', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
      low:    { label: 'Low Confidence — Instructor review recommended', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: true },
    };
    const entry = map[conf] ?? map.medium;
    return (
      <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wide ${entry.cls}`}>
        {entry.icon && <ShieldAlert size={9} />}
        {entry.label}
      </span>
    );
  };

  const rubricEntries = Object.entries(feedback.rubric || {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-xl bg-white/5 border border-white/10 overflow-hidden"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2 flex-wrap">
          {isTeacher
            ? <User size={16} className="text-blue-400 shrink-0" />
            : <Sparkles size={16} className="text-purple-400 shrink-0" />
          }
          <span className="text-sm font-semibold">
            {isTeacher ? 'Instructor Feedback' : 'AI Evaluation'}
          </span>
          <StatusBadge />
          <ConfidenceBadge />
        </div>

        {/* Score + letter grade */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${scoreBg}`}>
          <Award size={14} className={scoreColor} />
          <span className={`text-xl font-black tabular-nums ${scoreColor}`}>{score}</span>
          <span className="text-[10px] text-white/30 font-bold">/100</span>
          <span className={`text-lg font-black ml-1 ${scoreColor}`}>{grade}</span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* ── Grading timeline ───────────────────────────────────────────── */}
        <GradingTimeline
          aiStatus={feedback.status}
          reviewedByTeacher={reviewedByTeacher}
        />

        {/* ── Score bar ──────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-white/30 font-bold uppercase tracking-widest">
            <span>Score</span>
            <span>{score}/100</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className={`h-full rounded-full ${barColor}`}
            />
          </div>
        </div>

        {/* ── Summary ────────────────────────────────────────────────────── */}
        {(display.feedback || feedback.feedback) && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5">
            <TrendingUp size={14} className="text-white/30 shrink-0 mt-0.5" />
            <p className="text-sm text-white/70 leading-relaxed">
              {display.feedback || feedback.feedback}
            </p>
          </div>
        )}

        {/* ── Strengths ──────────────────────────────────────────────────── */}
        {feedback.strengths?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <ThumbsUp size={12} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                Strengths
              </span>
            </div>
            <ul className="space-y-2">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-white/70 leading-relaxed">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Weaknesses / Areas to Improve ──────────────────────────────── */}
        {feedback.improvements?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <AlertCircle size={12} className="text-rose-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">
                Areas to Improve
              </span>
            </div>
            <ul className="space-y-2">
              {feedback.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-white/70 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Suggestions ────────────────────────────────────────────────── */}
        {feedback.suggestions?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Lightbulb size={12} className="text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                How to Improve
              </span>
            </div>
            <ul className="space-y-2">
              {feedback.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-white/70 leading-relaxed">
                  <Zap size={11} className="text-amber-400 shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Rubric breakdown (collapsible) ─────────────────────────────── */}
        {rubricEntries.length > 0 && (
          <div>
            <button
              onClick={() => setShowRubric(v => !v)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors w-full"
            >
              <BarChart2 size={12} />
              Rubric Breakdown
              <ChevronDown
                size={12}
                className={`ml-auto transition-transform ${showRubric ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {showRubric && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-3">
                    {rubricEntries.map(([dim, pts]) => {
                      const pct = Math.round((pts / 25) * 100);
                      const c   = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500';
                      const tc  = pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-rose-400';
                      return (
                        <div key={dim}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-white/60 font-medium">{dim}</span>
                            <span className={`font-black tabular-nums ${tc}`}>{pts}/25</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className={`h-full rounded-full ${c}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Final grade footer (when teacher has reviewed) ─────────────── */}
        {reviewedByTeacher && finalGrade && (
          <div className="pt-3 border-t border-white/5 flex items-center gap-2">
            <Star size={13} className="text-amber-400 shrink-0" />
            <p className="text-xs text-white/50">
              Final grade set by instructor:{' '}
              <span className={`font-black ${scoreColor}`}>
                {finalGrade.score}/100 ({finalGrade.grade})
              </span>
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Local helper (mirrors backend logic, used for display only)
function _scoreToGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export default React.memo(AIFeedbackCard);
