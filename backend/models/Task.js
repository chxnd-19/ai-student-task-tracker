const mongoose = require('mongoose');
const { MAX_TITLE_LEN, MAX_SUBJECT_LEN, MAX_DESCRIPTION_LEN } = require('../config/constants');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String, required: true, trim: true,
      maxlength: [MAX_TITLE_LEN, `Title must be ${MAX_TITLE_LEN} characters or fewer.`],
    },
    subject: {
      type: String, required: true, trim: true,
      maxlength: [MAX_SUBJECT_LEN, `Subject must be ${MAX_SUBJECT_LEN} characters or fewer.`],
    },
    description: {
      type: String, trim: true,
      maxlength: [MAX_DESCRIPTION_LEN, `Description must be ${MAX_DESCRIPTION_LEN} characters or fewer.`],
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending',
    },
    dueDate: { type: Date, required: true },

    // Teacher who created this task
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Class this task belongs to (null = legacy global task)
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },

    // Students this task is assigned to (kept for backward compat with legacy tasks)
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Submission type expected from students
    submissionType: { type: String, enum: ['text', 'file'], default: 'text' },
  },
  { timestamps: true }
);

taskSchema.index({ createdBy: 1 });
taskSchema.index({ classId: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
