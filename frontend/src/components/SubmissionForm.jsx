import React, { useState } from 'react';
import { submitTask } from '../services/submissionService';
import Spinner from './Spinner';

/**
 * SubmissionForm — student submits a task (text or PDF).
 * Props:
 *   task       — the task object
 *   onSuccess  — callback after successful submission
 */
function SubmissionForm({ task, onSuccess }) {
  const [text, setText]       = useState('');
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Recompute on every render so the UI stays accurate if left open
  const deadline       = new Date(task.dueDate);
  const isPast         = new Date() > deadline;
  // Normalise submissionType — default to 'text' if field is missing (legacy data)
  const submissionType = task.submissionType || 'text';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    // Re-check deadline at submit time — not just at render time
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
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isPast) {
    return (
      <div className="deadline-passed-banner" role="alert">
        ⛔ Deadline has passed. Submissions are no longer accepted.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="submission-form" noValidate>
      {error && <p className="error-msg" role="alert">{error}</p>}

      {submissionType === 'text' ? (
        <div className="form-group">
          <label htmlFor="text-sub">Your Answer</label>
          <textarea
            id="text-sub"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your submission here..."
            rows={5}
            required
          />
        </div>
      ) : (
        <div className="form-group">
          <label htmlFor="file-sub">Upload PDF (max 5 MB)</label>
          <input
            id="file-sub"
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files[0] || null)}
            required
          />
          {file && <span className="file-name">📎 {file.name}</span>}
        </div>
      )}

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? <Spinner small /> : 'Submit'}
      </button>
    </form>
  );
}

export default SubmissionForm;
