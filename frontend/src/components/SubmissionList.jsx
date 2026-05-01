import React, { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * SubmissionList — teacher view of all submissions for a task.
 * Shows current submission + expandable version history.
 */
function SubmissionList({ submissions }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!submissions.length) {
    return <p className="empty-sub-msg">No submissions yet.</p>;
  }

  return (
    <div className="submission-list">
      {submissions.map((s) => (
        <div key={s._id} className="submission-card">
          {/* Header: student name + status badge */}
          <div className="submission-header">
            <span className="student-name">👤 {s.studentId?.name || 'Unknown'}</span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {s.versions?.length > 1 && (
                <span className="version-count-badge">{s.versions.length} versions</span>
              )}
              <span className={`sub-badge sub-badge-${s.status}`}>
                {s.status === 'late' ? '⏰ Late' : '✅ Submitted'}
              </span>
            </div>
          </div>

          {/* Latest submission time */}
          <p className="sub-date">
            Last submitted: {new Date(s.submittedAt).toLocaleString()}
          </p>

          {/* Current content */}
          {s.textSubmission && (
            <div className="sub-text">
              <strong>Answer:</strong>
              <p>{s.textSubmission}</p>
            </div>
          )}
          {s.fileUrl && (
            <a
              href={`${API_BASE}${s.fileUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
            >
              📄 Download PDF
            </a>
          )}

          {/* Version history toggle */}
          {s.versions?.length > 1 && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: '0.5rem' }}
              onClick={() => setExpandedId(expandedId === s._id ? null : s._id)}
            >
              {expandedId === s._id ? '▲ Hide history' : `▼ Show history (${s.versions.length} versions)`}
            </button>
          )}

          {expandedId === s._id && (
            <div className="version-history">
              <p className="version-history-title">📋 Submission History</p>
              {[...s.versions].reverse().map((v, i) => (
                <div key={i} className="version-entry">
                  <span className="version-num">v{s.versions.length - i}</span>
                  <span className="version-date">{new Date(v.submittedAt).toLocaleString()}</span>
                  {v.textSubmission && <p className="version-text">{v.textSubmission}</p>}
                  {v.fileUrl && (
                    <a
                      href={`${API_BASE}${v.fileUrl}`}
                      target="_blank" rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                    >📄 PDF</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default SubmissionList;
