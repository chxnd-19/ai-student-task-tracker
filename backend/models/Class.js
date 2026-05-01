const mongoose = require('mongoose');
const crypto   = require('crypto');

const classSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, trim: true },
    subject:   { type: String, required: true, trim: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    students:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // 6-character alphanumeric join code, unique across all classes
    joinCode:  {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(3).toString('hex').toUpperCase(), // e.g. "A3F9C2"
    },
  },
  { timestamps: true }
);

classSchema.index({ teacherId: 1 });
classSchema.index({ students: 1 });

module.exports = mongoose.model('Class', classSchema);
