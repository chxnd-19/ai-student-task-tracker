/**
 * taskStatus.js — single source of truth for task status classification.
 *
 * Every task belongs to EXACTLY ONE status bucket:
 *
 *   pending   — not submitted, deadline has NOT passed
 *   submitted — submitted on or before the deadline
 *   overdue   — not submitted, deadline HAS passed
 *   late      — submitted AFTER the deadline
 *
 * Usage:
 *   import { getTaskStatus, STATUS_META } from '../utils/taskStatus';
 *   const status = getTaskStatus(task, submission);
 *   const { label, color, icon } = STATUS_META[status];
 */

export const TASK_STATUS = {
  PENDING:   'pending',
  SUBMITTED: 'submitted',
  OVERDUE:   'overdue',
  LATE:      'late',
};

/**
 * Determine the status of a task for a specific student.
 *
 * @param {object} task        — task object with `dueDate` field
 * @param {object|null} sub    — submission object with `submittedAt` field, or null
 * @returns {string}           — one of TASK_STATUS values
 */
export function getTaskStatus(task, sub) {
  const deadline    = new Date(task.dueDate);
  const now         = new Date();

  if (!sub) {
    // No submission at all
    return now > deadline ? TASK_STATUS.OVERDUE : TASK_STATUS.PENDING;
  }

  // Has a submission — check if it was on time or late
  const submittedAt = new Date(sub.submittedAt);
  return submittedAt > deadline ? TASK_STATUS.LATE : TASK_STATUS.SUBMITTED;
}

/**
 * Compute summary counts for an array of tasks + their submissions.
 *
 * @param {object[]} tasks       — array of task objects
 * @param {object[]} submissions — array of submission objects for this student
 * @returns {{ pending, submitted, overdue, late }}
 */
export function computeTaskSummary(tasks, submissions) {
  const counts = { pending: 0, submitted: 0, overdue: 0, late: 0 };

  tasks.forEach((task) => {
    const sub    = submissions.find((s) => String(s.taskId?._id || s.taskId) === String(task._id));
    const status = getTaskStatus(task, sub);
    counts[status] += 1;
  });

  return counts;
}

/**
 * Visual metadata for each status — used for badges, cards, and tooltips.
 */
export const STATUS_META = {
  [TASK_STATUS.PENDING]: {
    label:   'Pending',
    color:   '#f59e0b',          // amber
    bg:      'rgba(245,158,11,0.1)',
    cssClass: 'status-pending',
    tooltip: 'Not yet submitted. Deadline has not passed.',
  },
  [TASK_STATUS.SUBMITTED]: {
    label:   'Submitted',
    color:   '#10b981',          // emerald
    bg:      'rgba(16,185,129,0.1)',
    cssClass: 'status-submitted',
    tooltip: 'Submitted on or before the deadline.',
  },
  [TASK_STATUS.OVERDUE]: {
    label:   'Overdue',
    color:   '#ef4444',          // red
    bg:      'rgba(239,68,68,0.1)',
    cssClass: 'status-overdue',
    tooltip: 'Deadline has passed and no submission was made.',
  },
  [TASK_STATUS.LATE]: {
    label:   'Late',
    color:   '#f97316',          // orange
    bg:      'rgba(249,115,22,0.1)',
    cssClass: 'status-late',
    tooltip: 'Submitted after the deadline.',
  },
};
