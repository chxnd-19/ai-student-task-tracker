import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Spinner from './Spinner';
import Button from './Button';

function EditModal({ task, onSave, onClose }) {
  const [form, setForm]       = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [errors, setErrors]   = useState({});

  const titleRef   = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    if (task) {
      previousFocus.current = document.activeElement;
      setForm({
        title:       task.title       || '',
        student:     task.student     || '',
        dueDate:     task.dueDate ? task.dueDate.slice(0, 10) : '',
        description: task.description || '',
        status:      task.status      || 'pending',
      });
      setErrors({});
      setError('');
      setTimeout(() => titleRef.current?.focus(), 100);
    } else {
      previousFocus.current?.focus();
    }
  }, [task]);

  if (!task) return null;

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim())   errs.title   = 'Title is required.';
    if (!form.student.trim()) errs.student = 'Subject is required.';
    if (!form.dueDate)        errs.dueDate = 'Deadline is required.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await onSave(task._id, form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {task && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-lg bg-[#111827] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black tracking-tight">Edit Milestone</h3>
                <p className="text-muted text-sm mt-1">Update the details of this assignment.</p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {error && (
                <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-sm font-bold">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted ml-1">Title</label>
                <input
                  ref={titleRef}
                  value={form.title}
                  onChange={set('title')}
                  className={`w-full bg-white/5 border ${errors.title ? 'border-danger/50' : 'border-white/10'} rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                />
                {errors.title && <p className="text-danger text-xs ml-1 font-bold">{errors.title}</p>}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted ml-1">Subject</label>
                  <input
                    value={form.student}
                    onChange={set('student')}
                    className={`w-full bg-white/5 border ${errors.student ? 'border-danger/50' : 'border-white/10'} rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted ml-1">Deadline</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={set('dueDate')}
                    className={`w-full bg-white/5 border ${errors.dueDate ? 'border-danger/50' : 'border-white/10'} rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted ml-1">Notes</label>
                <textarea
                  value={form.description}
                  onChange={set('description')}
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button variant="ghost" onClick={onClose} className="flex-1 py-4">Cancel</Button>
                <Button type="submit" disabled={loading} className="flex-1 py-4 shadow-xl shadow-primary/20">
                  {loading ? <Spinner small /> : 'Save Changes'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default EditModal;
