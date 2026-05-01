import React, { useState } from 'react';

const STATUS_LABELS = {
  'pending':     'Pending',
  'in-progress': 'In Progress',
  'completed':   'Completed',
};

const BADGE_CLASS = {
  'pending':     'badge-pending',
  'in-progress': 'badge-in-progress',
  'completed':   'badge-completed',
};

/**
 * isOverdue — returns true when:
 *   1. task is NOT completed
 *   2. task has a dueDate
 *   3. dueDate (at midnight) is strictly before today (at midnight)
 * Midnight normalization prevents timezone edge-cases from flipping the result.
 */
function isOverdue(task) {
  if (task.status === 'completed' || !task.dueDate) return false;
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

/**
 * TaskCard — displays a single task with status, meta, and action buttons.
 * Props:
 *   task            — task object from the API
 *   onDelete(id, title)  — called after user confirms deletion
 *   onToggleStatus(task) — toggles completed ↔ pending
 *   onEdit(task)         — opens the edit modal
 */
function TaskCard({ task, onDelete, onToggleStatus, onEdit }) {
  const completed = task.status === 'completed';
  const overdue   = isOverdue(task);

  // Local loading flags prevent duplicate API calls per action
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleToggle = async () => {
    if (toggling) return;
    setToggling(true);
    try { await onToggleStatus(task); }
    finally { setToggling(false); }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try { await onDelete(task._id, task.title); }
    finally { setDeleting(false); }
  };

  const cardClass = ['task-card', `status-${task.status}`, overdue ? 'overdue' : '']
    .filter(Boolean).join(' ');

  return (
    <div className={cardClass} role="listitem">

      {/* Overdue warning strip */}
      {overdue && (
        <div className="overdue-strip" role="alert" aria-label="This task is overdue">
          ⚠ Overdue
        </div>
      )}

      {/* Title + status badge */}
      <div className="task-card-header">
        <span className="task-title">{task.title}</span>
        <span
          className={`status-badge ${BADGE_CLASS[task.status]}`}
          aria-label={`Status: ${STATUS_LABELS[task.status]}`}
        >
          {STATUS_LABELS[task.status]}
        </span>
      </div>

      {/* Subject + deadline */}
      <div className="task-meta">
        {task.student && (
          <span className="meta-item">
            <span className="meta-icon" aria-hidden="true">👤</span>
            {task.student}
          </span>
        )}
        {task.dueDate && (
          <span className={`meta-item ${overdue ? 'meta-overdue' : ''}`}>
            <span className="meta-icon" aria-hidden="true">📅</span>
            {new Date(task.dueDate).toLocaleDateString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric',
            })}
            {overdue && <span className="overdue-label"> · Overdue</span>}
          </span>
        )}
      </div>

      {/* Optional description */}
      {task.description && (
        <p className="task-desc">{task.description}</p>
      )}

      {/* Actions */}
      <div className="task-actions">
        <button
          className={`btn btn-sm ${completed ? 'btn-undo' : 'btn-success'}`}
          onClick={handleToggle}
          disabled={toggling}
          aria-label={completed ? 'Mark task as pending' : 'Mark task as completed'}
          title={completed ? 'Mark as pending' : 'Mark as completed'}
        >
          {toggling ? '…' : completed ? '↩ Undo' : '✓ Complete'}
        </button>

        <button
          className="btn btn-sm btn-edit"
          onClick={() => onEdit(task)}
          aria-label={`Edit task: ${task.title}`}
          title="Edit task"
        >
          ✏ Edit
        </button>

        <button
          className="btn btn-sm btn-danger"
          onClick={handleDelete}
          disabled={deleting}
          aria-label={`Delete task: ${task.title}`}
          title="Delete task"
        >
          {deleting ? '…' : '🗑 Delete'}
        </button>
      </div>
    </div>
  );
}

export default TaskCard;
