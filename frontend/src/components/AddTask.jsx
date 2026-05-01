import React, { useState, useRef, useEffect } from 'react';
import Spinner from './Spinner';

const empty = { title: '', student: '', dueDate: '', description: '', status: 'pending' };

/**
 * AddTask — collapsible inline form for creating a new task.
 * - Auto-focuses the title input when mounted.
 * - Validates title, subject, and deadline before submitting.
 * - Disables the submit button while the API call is in flight.
 *
 * Props:
 *   onAdd(form) — async callback; parent handles API call + state update
 */
function AddTask({ onAdd }) {
  const [form, setForm]       = useState(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [errors, setErrors]   = useState({});

  // Auto-focus the title field when the panel opens
  const titleRef = useRef(null);
  useEffect(() => { titleRef.current?.focus(); }, []);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    // Clear the per-field error as the user types
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // Client-side validation — mirrors backend rules
  const validate = () => {
    const errs = {};
    if (!form.title.trim())   errs.title   = 'Title is required.';
    if (!form.student.trim()) errs.student = 'Subject / Student is required.';
    if (!form.dueDate)        errs.dueDate = 'Deadline is required.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Double-submit guard — bail out if a request is already in flight
    if (loading) return;
    setError('');

    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await onAdd(form);
      setForm(empty);
      setErrors({});
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-task-panel" role="region" aria-label="Add new task">
      <h3>➕ Add New Task</h3>

      {error && <p className="error-msg" role="alert">{error}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="add-title">Title <span className="required" aria-hidden="true">*</span></label>
            <input
              id="add-title"
              ref={titleRef}
              placeholder="e.g. Math Assignment"
              value={form.title}
              onChange={set('title')}
              className={errors.title ? 'input-error' : ''}
              aria-required="true"
              aria-describedby={errors.title ? 'add-title-err' : undefined}
            />
            {errors.title && <span id="add-title-err" className="field-error" role="alert">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="add-student">Subject / Student <span className="required" aria-hidden="true">*</span></label>
            <input
              id="add-student"
              placeholder="e.g. John Doe"
              value={form.student}
              onChange={set('student')}
              className={errors.student ? 'input-error' : ''}
              aria-required="true"
              aria-describedby={errors.student ? 'add-student-err' : undefined}
            />
            {errors.student && <span id="add-student-err" className="field-error" role="alert">{errors.student}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="add-due">Deadline <span className="required" aria-hidden="true">*</span></label>
            <input
              id="add-due"
              type="date"
              value={form.dueDate}
              onChange={set('dueDate')}
              className={errors.dueDate ? 'input-error' : ''}
              aria-required="true"
              aria-describedby={errors.dueDate ? 'add-due-err' : undefined}
            />
            {errors.dueDate && <span id="add-due-err" className="field-error" role="alert">{errors.dueDate}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="add-status">Status</label>
            <select id="add-status" value={form.status} onChange={set('status')}>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="add-desc">Description <span className="optional">(optional)</span></label>
          <textarea
            id="add-desc"
            placeholder="Any extra details..."
            value={form.description}
            onChange={set('description')}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          aria-label="Submit new task"
        >
          {loading ? <Spinner small /> : 'Add Task'}
        </button>
      </form>
    </div>
  );
}

export default AddTask;
