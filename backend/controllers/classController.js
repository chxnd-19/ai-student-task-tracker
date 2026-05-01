const Class = require('../models/Class');

const ok   = (res, data, status = 200) => res.status(status).json({ success: true,  data });
const fail = (res, message, status = 400) => res.status(status).json({ success: false, message });

// ── POST /api/classes — teacher creates a class ───────────────────────────
const createClass = async (req, res) => {
  const name    = (req.body.name    || '').trim();
  const subject = (req.body.subject || '').trim();

  if (!name)    return fail(res, 'Class name is required.');
  if (!subject) return fail(res, 'Subject is required.');

  try {
    const cls = await Class.create({ name, subject, teacherId: req.user._id });
    return ok(res, cls, 201);
  } catch (error) {
    return fail(res, error.message);
  }
};

// ── GET /api/classes/my — teacher sees their classes ─────────────────────
const getMyClasses = async (req, res) => {
  try {
    const classes = await Class.find({ teacherId: req.user._id })
      .populate('students', 'name email')
      .lean();
    return ok(res, classes);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

// ── GET /api/classes/joined — student sees classes they joined ────────────
const getJoinedClasses = async (req, res) => {
  try {
    const classes = await Class.find({ students: req.user._id })
      .populate('teacherId', 'name email')
      .lean();
    return ok(res, classes);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

// ── POST /api/classes/join — student joins via joinCode ───────────────────
const joinClass = async (req, res) => {
  const joinCode = (req.body.joinCode || '').trim().toUpperCase();
  if (!joinCode) return fail(res, 'Join code is required.');

  try {
    const cls = await Class.findOne({ joinCode });
    if (!cls) return fail(res, 'Invalid join code. Please check and try again.', 404);

    // Already a member
    if (cls.students.some((id) => String(id) === String(req.user._id))) {
      return fail(res, 'You have already joined this class.');
    }

    cls.students.push(req.user._id);
    await cls.save();

    const populated = await Class.findById(cls._id)
      .populate('teacherId', 'name email')
      .lean();
    return ok(res, populated);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

// ── DELETE /api/classes/:id — teacher deletes their class ─────────────────
const deleteClass = async (req, res) => {
  try {
    const cls = await Class.findOneAndDelete({ _id: req.params.id, teacherId: req.user._id });
    if (!cls) return fail(res, 'Class not found.', 404);
    return res.json({ success: true, message: 'Class deleted.' });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

module.exports = { createClass, getMyClasses, getJoinedClasses, joinClass, deleteClass };
