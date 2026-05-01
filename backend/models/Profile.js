const mongoose = require('mongoose');

/**
 * Unified profile model for both students and teachers.
 * Role-specific fields are optional — only the relevant ones are filled.
 */
const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name:       { type: String, trim: true },
    college:    { type: String, trim: true },
    department: { type: String, trim: true },

    // ── Student-only fields ──────────────────────────────────────────────
    usn:         { type: String, trim: true },
    semester:    { type: Number, min: 1, max: 8 },
    year:        { type: Number, min: 1, max: 4 },
    overallSGPA: { type: Number, min: 0, max: 10 },
    currentSGPA: { type: Number, min: 0, max: 10 },

    // ── Teacher-only fields ──────────────────────────────────────────────
    teacherId:     { type: String, trim: true },
    qualification: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Profile', profileSchema);
