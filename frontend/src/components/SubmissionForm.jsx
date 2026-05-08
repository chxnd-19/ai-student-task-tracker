import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Upload, FileText, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { submitTask } from '../services/submissionService';
import Spinner from './Spinner';

/**
 * SubmissionForm — student submits a task (text or PDF).
 *
 * Props:
 *   task      — the task object
 *   onSuccess — callback after successful submission
 */
function SubmissionForm({ task, onSuccess }) {
  const [text, setText]       = useState('');
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [submitted, setSubmitted] = useState(false);  // show AI pending state briefly
  const qc = useQueryClient();

  const deadline       = new Date(task.dueDate);
  const isPast         = new Date() > deadline;
  const submissionType = task.submissionType || 'text';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (new Date() > deadline) {
      return setError('Deadline has passed. Submission is no longer accepted.');
    }
    setError('');

    if (submissionType === 'text' && !text.trim()) {
      return setError('Please enter your text submission.');
    }
    if (submissionType === 'file' && !file) {
      return setError('Please select a PDF file to upload.');
    }

    setLoading(true);
    try {
      await submitTask(task._id, text, file);
      // Invalidate only the student's own submissions — not the whole dashboard.
      // This causes the AIFeedbackCard to appear as soon as grading completes.
      qc.invalidateQueries({ queryKey: ['submissions', 'my'] });
      // Show "AI evaluating" state briefly before calling onSuccess
      setSubmitted(true);
      setTimeout(() => onSuccess(), 1800);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Unable to submit right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── AI evaluation in progress state ──────────────────────────────────────
  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-4 p-5 rounded-xl bg-purple-500/10 border border-purple-500/20"
      >
        <Sparkles size={20} className="text-purple-400 animate-pulse shrink-0" />
        <div>
          <p className="text-sm font-semibold text-purple-300">Submission received!</p>
          <p className="text-xs text-white/40 mt-0.5">
            AI evaluation is starting in the background…
          </p>
        </div>
      </motion.div>
    );
  }

  // ── Deadline passed ───────────────────────────────────────────────────────
  if (isPast) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
        <Clock size={16} className="text-rose-400 shrink-0" />
        <p className="text-sm text-rose-300 font-medium">
          Deadline has passed. Submissions are no longer accepted.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20"
        >
          <AlertCircle size={15} className="text-rose-400 shrink-0" />
          <p className="text-sm text-rose-300">{error}</p>
        </motion.div>
      )}

      {/* ── Text submission ───────────────────────────────────────────────── */}
      {submissionType === 'text' && (
        <div className="space-y-2">
          <label
            htmlFor="text-sub"
            className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2 px-1"
          >
            <FileText size={11} />
            Your Answer
          </label>
          <textarea
            id="text-sub"
            value={text}
            onChange={(e) => { setText(e.target.value); setError(''); }}
            placeholder="Type your submission here..."
            rows={6}
            required
            style={{
              /* Explicit styles to guarantee visibility regardless of any
                 inherited or global CSS that might override Tailwind classes */
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              color:           '#ffffff',
              caretColor:      '#c084fc',
              minHeight:       '140px',
              resize:          'vertical',
              lineHeight:      '1.6',
            }}
            className={[
              // Layout & spacing
              'w-full px-4 py-4 rounded-xl',
              // Border — purple tint to match the design system
              'border border-purple-500/20',
              // Typography
              'text-sm font-normal',
              // Placeholder
              'placeholder:text-white/30',
              // Focus ring
              'focus:outline-none focus:border-purple-400/60',
              'focus:ring-2 focus:ring-purple-500/15',
              // Transition
              'transition-all duration-200',
              // Font
              'font-sans',
            ].join(' ')}
            onFocus={(e) => {
              e.target.style.borderColor     = '#c084fc';
              e.target.style.boxShadow       = '0 0 0 3px rgba(192,132,252,0.15)';
              e.target.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor     = 'rgba(168, 85, 247, 0.2)';
              e.target.style.boxShadow       = 'none';
              e.target.style.backgroundColor = 'rgba(15, 23, 42, 0.85)';
            }}
          />
          {/* Character count hint */}
          {text.length > 0 && (
            <p className="text-[10px] text-white/20 text-right px-1">
              {text.length} character{text.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* ── File submission ───────────────────────────────────────────────── */}
      {submissionType === 'file' && (
        <div className="space-y-2">
          <label
            htmlFor="file-sub"
            className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2 px-1"
          >
            <Upload size={11} />
            Upload PDF (max 5 MB)
          </label>
          <label
            htmlFor="file-sub"
            className={[
              'flex items-center gap-3 w-full px-4 py-4 rounded-xl cursor-pointer',
              'border border-dashed border-purple-500/20 hover:border-purple-400/40',
              'bg-white/[0.03] hover:bg-white/[0.05]',
              'transition-all duration-200',
            ].join(' ')}
          >
            <Upload size={16} className="text-purple-400 shrink-0" />
            <span className="text-sm text-white/50">
              {file ? (
                <span className="text-white/80 font-medium">📎 {file.name}</span>
              ) : (
                'Click to choose a PDF file…'
              )}
            </span>
            <input
              id="file-sub"
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => { setFile(e.target.files[0] || null); setError(''); }}
              required
            />
          </label>
        </div>
      )}

      {/* ── Submit button ─────────────────────────────────────────────────── */}
      <motion.button
        type="submit"
        disabled={loading}
        whileHover={{ scale: loading ? 1 : 1.02 }}
        whileTap={{ scale: loading ? 1 : 0.98 }}
        className={[
          'w-full h-12 flex items-center justify-center gap-2',
          'rounded-xl font-bold text-sm text-white',
          'bg-gradient-to-r from-purple-500 to-pink-500',
          'hover:from-purple-600 hover:to-pink-600',
          'shadow-lg shadow-purple-500/20',
          'transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        ].join(' ')}
      >
        {loading ? (
          <Spinner small />
        ) : (
          <>
            <Send size={16} />
            Submit
          </>
        )}
      </motion.button>
    </form>
  );
}

export default SubmissionForm;
