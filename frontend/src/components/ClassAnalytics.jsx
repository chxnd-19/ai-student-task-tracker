import React from 'react';

/**
 * ClassAnalytics — teacher view of submission stats for a class.
 * Props:
 *   analytics — { tasks: [...], summary: {...} } from /api/submissions/analytics/class/:id
 */
function ClassAnalytics({ analytics }) {
  if (!analytics) return null;
  const { tasks = [], summary = {} } = analytics;

  return (
    <div className="analytics-panel">
      <h3 className="analytics-title">📊 Class Analytics</h3>

      {/* Summary row */}
      <div className="analytics-summary">
        <div className="analytics-chip">
          <span className="analytics-chip-value">{summary.avgCompletion ?? 0}%</span>
          <span className="analytics-chip-label">Avg Completion</span>
        </div>
        <div className="analytics-chip">
          <span className="analytics-chip-value">{summary.totalSubmissions ?? 0}</span>
          <span className="analytics-chip-label">Total Submissions</span>
        </div>
        <div className="analytics-chip analytics-chip-late">
          <span className="analytics-chip-value">{summary.totalLate ?? 0}</span>
          <span className="analytics-chip-label">Late</span>
        </div>
        <div className="analytics-chip">
          <span className="analytics-chip-value">{summary.totalStudents ?? 0}</span>
          <span className="analytics-chip-label">Students</span>
        </div>
      </div>

      {/* Per-task breakdown */}
      {tasks.length === 0 ? (
        <p className="analytics-empty">No tasks yet.</p>
      ) : (
        <div className="analytics-task-list">
          {tasks.map((t) => (
            <div key={String(t.taskId)} className="analytics-task-row">
              <div className="analytics-task-info">
                <span className="analytics-task-title">{t.title}</span>
                <span className="analytics-task-subject">{t.subject}</span>
              </div>

              {/* Progress bar */}
              <div className="analytics-bar-wrap">
                <div className="analytics-bar">
                  <div
                    className="analytics-bar-fill analytics-bar-ontime"
                    style={{ width: `${t.totalStudents ? (t.onTime / t.totalStudents) * 100 : 0}%` }}
                    title={`On time: ${t.onTime}`}
                  />
                  <div
                    className="analytics-bar-fill analytics-bar-late"
                    style={{ width: `${t.totalStudents ? (t.late / t.totalStudents) * 100 : 0}%` }}
                    title={`Late: ${t.late}`}
                  />
                </div>
                <span className="analytics-bar-pct">{t.completionRate}%</span>
              </div>

              <div className="analytics-task-counts">
                <span className="count-chip count-ontime">✓ {t.onTime}</span>
                <span className="count-chip count-late">⏰ {t.late}</span>
                <span className="count-chip count-missed">✗ {t.missed}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ClassAnalytics;
