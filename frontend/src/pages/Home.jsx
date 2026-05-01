import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { fetchTasks, createTask, updateTask, deleteTask } from '../services/taskService';
import TaskCard from '../components/TaskCard';
import AddTask from '../components/AddTask';
import EditModal from '../components/EditModal';
import Spinner from '../components/Spinner';
import Toast from '../components/Toast';

const STATUS_FILTERS = ['all', 'pending', 'in-progress', 'completed'];

// ── localStorage helpers — persist filter selections across reloads ──────────
const LS_STATUS  = 'stt_statusFilter';
const LS_SUBJECT = 'stt_subjectFilter';
const readLS  = (key, fallback) => localStorage.getItem(key) ?? fallback;
const writeLS = (key, val)      => localStorage.setItem(key, val);

function Home() {
  const [tasks, setTasks]               = useState([]);
  const [statusFilter,  _setStatus]     = useState(() => readLS(LS_STATUS,  'all'));
  const [subjectFilter, _setSubject]    = useState(() => readLS(LS_SUBJECT, ''));
  const [editingTask,   setEditingTask] = useState(null);
  const [showAdd,       setShowAdd]     = useState(false);
  const [loading,       setLoading]     = useState(true);
  const [fetchError,    setFetchError]  = useState('');
  const [toast,         setToast]       = useState({ message: '', type: 'success' });

  // Pagination state — driven by server meta
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Ref to the current AbortController so we can cancel in-flight requests
  const abortRef = useRef(null);

  const setStatusFilter  = (v) => { _setStatus(v);  writeLS(LS_STATUS,  v); setPage(1); };
  const setSubjectFilter = (v) => { _setSubject(v); writeLS(LS_SUBJECT, v); setPage(1); };

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // ── Load tasks — cancels any previous in-flight request ───────────────
  const loadTasks = useCallback(async (pageNum = 1) => {
    // Abort the previous request if still pending
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setFetchError('');
    setLoading(true);
    try {
      const result = await fetchTasks({ page: pageNum }, controller.signal);
      // Guard: ignore result if this request was already aborted
      if (controller.signal.aborted) return;
      setTasks(result.data);
      setPage(result.page       ?? pageNum);
      setTotalPages(result.totalPages ?? 1);
    } catch (err) {
      // Ignore cancellation errors — they are expected on unmount/filter change
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      setFetchError(err.response?.data?.message || 'Could not load tasks. Please try again.');
    } finally {
      // Only clear loading if this request was not aborted
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Cancel any in-flight request on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // Reload when page number changes
  useEffect(() => { loadTasks(page); }, [loadTasks, page]);

  // ── Add — double-submit guard is in AddTask (loading flag) ────────────
  const handleAdd = async (form) => {
    const { data } = await createTask(form);
    setTasks((prev) => [data, ...prev]);
    setShowAdd(false);
    showToast('Task added successfully.');
  };

  // ── Delete — optimistic with index-preserving rollback ────────────────
  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?\nThis cannot be undone.`)) return;

    const idx      = tasks.findIndex((t) => t._id === id);
    const snapshot = tasks[idx];
    setTasks((prev) => prev.filter((t) => t._id !== id));

    try {
      await deleteTask(id);
      showToast('Task deleted.');
    } catch (err) {
      // Reinsert at original index
      setTasks((prev) => {
        const next = [...prev];
        next.splice(idx, 0, snapshot);
        return next;
      });
      showToast(err.response?.data?.message || 'Failed to delete task.', 'error');
    }
  };

  // ── Toggle status — optimistic with exact snapshot rollback ───────────
  const handleToggleStatus = async (task) => {
    const newStatus  = task.status === 'completed' ? 'pending' : 'completed';
    const original   = task;
    const optimistic = { ...task, status: newStatus };

    setTasks((prev) => prev.map((t) => (t._id === task._id ? optimistic : t)));

    try {
      const { data } = await updateTask(task._id, { ...task, status: newStatus });
      setTasks((prev) => prev.map((t) => (t._id === data._id ? data : t)));
      showToast(newStatus === 'completed' ? 'Task marked as completed.' : 'Task marked as pending.');
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t._id === original._id ? original : t)));
      showToast(err.response?.data?.message || 'Failed to update task.', 'error');
    }
  };

  // ── Save edit ──────────────────────────────────────────────────────────
  const handleSaveEdit = async (id, form) => {
    const { data } = await updateTask(id, form);
    setTasks((prev) => prev.map((t) => (t._id === data._id ? data : t)));
    showToast('Task updated successfully.');
  };

  // ── Derived values ─────────────────────────────────────────────────────
  const subjectOptions = useMemo(
    () => [...new Set(tasks.map((t) => t.student).filter(Boolean))].sort(),
    [tasks]
  );

  // Client-side filter applied on top of the current page of tasks
  const visible = useMemo(() => tasks.filter((t) => {
    const matchStatus  = statusFilter === 'all' || t.status === statusFilter;
    const matchSubject = !subjectFilter || t.student === subjectFilter;
    return matchStatus && matchSubject;
  }), [tasks, statusFilter, subjectFilter]);

  const count = (status) => tasks.filter((t) => t.status === status).length;

  // Overdue: not completed + dueDate strictly before today (midnight-normalised)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdueCount = tasks.filter(
    (t) => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < today
  ).length;

  const hasActiveFilters = statusFilter !== 'all' || subjectFilter !== '';
  const clearFilters = () => { setStatusFilter('all'); setSubjectFilter(''); };

  return (
    <div className="page">

      {/* ── Toast ── */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      {/* ── Page header ── */}
      <div className="dashboard-header">
        <div>
          <h2>My Tasks</h2>
          {overdueCount > 0 && (
            <p className="overdue-hint" role="alert">
              ⚠ {overdueCount} overdue task{overdueCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAdd((v) => !v)}
          aria-expanded={showAdd}
          aria-label={showAdd ? 'Cancel adding task' : 'Add new task'}
        >
          {showAdd ? '✕ Cancel' : '+ New Task'}
        </button>
      </div>

      {/* ── Stats chips ── */}
      <div className="stats-bar" role="region" aria-label="Task summary">
        <div className="stat-chip chip-pending">
          <span className="count">{count('pending')}</span>
          <span className="chip-label">Pending</span>
        </div>
        <div className="stat-chip chip-progress">
          <span className="count">{count('in-progress')}</span>
          <span className="chip-label">In Progress</span>
        </div>
        <div className="stat-chip chip-completed">
          <span className="count">{count('completed')}</span>
          <span className="chip-label">Completed</span>
        </div>
        {overdueCount > 0 && (
          <div className="stat-chip chip-overdue">
            <span className="count">{overdueCount}</span>
            <span className="chip-label">Overdue</span>
          </div>
        )}
        <div className="stat-chip chip-total">
          <span className="count">{tasks.length}</span>
          <span className="chip-label">Total</span>
        </div>
      </div>

      {/* ── Add task panel ── */}
      {showAdd && <AddTask onAdd={handleAdd} />}

      {/* ── Filter controls ── */}
      <div className="filter-section" role="search" aria-label="Filter tasks">
        <div className="filter-bar" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              className={`filter-btn ${statusFilter === f ? 'active' : ''}`}
              onClick={() => setStatusFilter(f)}
              aria-pressed={statusFilter === f}
              aria-label={`Show ${f === 'all' ? 'all' : f} tasks`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {subjectOptions.length > 0 && (
          <div className="subject-filter">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="subject-select"
              aria-label="Filter by subject or student"
            >
              <option value="">All Subjects</option>
              {subjectOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {hasActiveFilters && (
          <button
            className="btn btn-ghost btn-sm clear-btn"
            onClick={clearFilters}
            aria-label="Clear all filters"
          >
            ✕ Clear filters
          </button>
        )}
      </div>

      {/* ── Result count ── */}
      {!loading && !fetchError && tasks.length > 0 && (
        <p className="result-count" aria-live="polite">
          Showing {visible.length} of {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          {totalPages > 1 && ` — page ${page} of ${totalPages}`}
        </p>
      )}

      {/* ── Task list ── */}
      {loading ? (
        <Spinner text="Loading your tasks..." />
      ) : fetchError ? (
        <div className="error-banner" role="alert">
          <p>⚠ {fetchError}</p>
          <button className="btn btn-ghost btn-sm" onClick={() => loadTasks(page)}>Retry</button>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon" aria-hidden="true">📋</p>
          {tasks.length === 0 ? (
            <>
              <p>No tasks yet.</p>
              <p className="empty-sub">Click <strong>+ New Task</strong> to add your first task.</p>
            </>
          ) : (
            <>
              <p>No tasks match your filters.</p>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: '0.75rem' }} onClick={clearFilters}>
                Clear filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="task-grid" role="list" aria-label="Task list">
          {/* Keys use task._id only — never array index */}
          {visible.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              onEdit={setEditingTask}
            />
          ))}
        </div>
      )}

      {/* ── Pagination controls — only shown when more than one page exists ── */}
      {!loading && !fetchError && totalPages > 1 && (
        <div className="pagination" role="navigation" aria-label="Task pagination">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            ← Prev
          </button>
          <span className="pagination-info" aria-current="page">
            {page} / {totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            Next →
          </button>
        </div>
      )}

      {/* ── Edit modal ── */}
      <EditModal
        task={editingTask}
        onSave={handleSaveEdit}
        onClose={() => setEditingTask(null)}
      />
    </div>
  );
}

export default Home;
