const mongoose = require('mongoose');

// Each resubmission is stored as a version entry
const versionSchema = new mongoose.Schema({
  textSubmission: { type: String, trim: true },
  fileUrl:        { type: String },
  submittedAt:    { type: Date, default: Date.now },
}, { _id: false });

const submissionSchema = new mongoose.Schema(
  {
    taskId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Current (latest) submission content
    textSubmission: { type: String, trim: true },
    fileUrl:        { type: String },

    status:      { type: String, enum: ['submitted', 'late'], default: 'submitted' },
    submittedAt: { type: Date, default: Date.now },

    // Full version history — every submit/resubmit appended here
    versions: { type: [versionSchema], default: [] },
  },
  { timestamps: true }
);

// One submission document per student per task (versions live inside it)
submissionSchema.index({ taskId: 1, studentId: 1 }, { unique: true });
submissionSchema.index({ studentId: 1 });
submissionSchema.index({ taskId: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
