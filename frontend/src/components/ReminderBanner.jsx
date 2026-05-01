import React from 'react';

const URGENCY_CONFIG = {
  overdue: { icon: '🔴', label: 'Overdue',      cls: 'reminder-overdue' },
  urgent:  { icon: '🟠', label: 'Due today',    cls: 'reminder-urgent'  },
  soon:    { icon: '🟡', label: 'Due soon',     cls: 'reminder-soon'    },
  normal:  { icon: '🟢', label: 'Upcoming',     cls: 'reminder-normal'  },
};

/**
 * ReminderBanner — shows unsubmitted tasks sorted by urgency.
 * Props:
 *   reminders — array from /api/submissions/reminders
 */
function ReminderBanner({ reminders }) {
  if (!reminders || reminders.length === 0) return null;

  return (
    <div className="reminder-banner">
      <p className="reminder-heading">⏰ Pending Assignments</p>
      <div className="reminder-list">
        {reminders.map((r) => {
          const cfg = URGENCY_CONFIG[r.urgency] || URGENCY_CONFIG.normal;
          return (
            <div key={String(r.taskId)} className={`reminder-item ${cfg.cls}`}>
              <span className="reminder-icon">{cfg.icon}</span>
              <div className="reminder-info">
                <span className="reminder-title">{r.title}</span>
                <span className="reminder-sub">
                  {r.subject} ·{' '}
                  {r.urgency === 'overdue'
                    ? 'Deadline passed'
                    : r.hoursLeft < 24
                    ? `${r.hoursLeft}h left`
                    : `${Math.floor(r.hoursLeft / 24)}d left`}
                </span>
              </div>
              <span className="reminder-badge">{cfg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ReminderBanner;
