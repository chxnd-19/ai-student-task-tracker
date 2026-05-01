const Profile = require('../models/Profile');

const ok   = (res, data, status = 200) => res.status(status).json({ success: true,  data });
const fail = (res, message, status = 400) => res.status(status).json({ success: false, message });

// ── GET /api/profile — get logged-in user's profile ───────────────────────
const getProfile = async (req, res) => {
  try {
    // Return empty object if no profile yet — frontend handles the empty state
    const profile = await Profile.findOne({ userId: req.user._id }).lean();
    return ok(res, profile || {});
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

// ── PUT /api/profile — create or update profile ───────────────────────────
const upsertProfile = async (req, res) => {
  const role = req.user.role;
  const body = req.body;

  // Validate SGPA fields for students
  if (role === 'student') {
    if (body.overallSGPA !== undefined && (isNaN(body.overallSGPA) || body.overallSGPA < 0 || body.overallSGPA > 10)) {
      return fail(res, 'Overall SGPA must be a number between 0 and 10.');
    }
    if (body.currentSGPA !== undefined && (isNaN(body.currentSGPA) || body.currentSGPA < 0 || body.currentSGPA > 10)) {
      return fail(res, 'Current SGPA must be a number between 0 and 10.');
    }
    if (body.semester !== undefined && (!Number.isInteger(Number(body.semester)) || body.semester < 1 || body.semester > 8)) {
      return fail(res, 'Semester must be an integer between 1 and 8.');
    }
    if (body.year !== undefined && (!Number.isInteger(Number(body.year)) || body.year < 1 || body.year > 4)) {
      return fail(res, 'Year must be an integer between 1 and 4.');
    }
  }

  // Build allowed fields based on role
  const allowed = ['name', 'college', 'department'];
  if (role === 'student') allowed.push('usn', 'semester', 'year', 'overallSGPA', 'currentSGPA');
  if (role === 'teacher') allowed.push('teacherId', 'qualification');

  const update = {};
  allowed.forEach((field) => {
    if (body[field] !== undefined) update[field] = body[field];
  });

  try {
    const profile = await Profile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return ok(res, profile);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

module.exports = { getProfile, upsertProfile };
