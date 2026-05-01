const Task = require('../models/Task');
const {
  MAX_TITLE_LEN, MAX_SUBJECT_LEN, MAX_DESCRIPTION_LEN,
  PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT,
} = require('../config/constants');

const TASK_PROJECTION = { __v: 0 };

const sanitize = (body) => ({
  ...body,
  title:       (body.title       || '').trim().slice(0, MAX_TITLE_LEN),
  subject:     (body.subject     || '').trim().slice(0, MAX_SUBJECT_LEN),
  description: (body.description || '').trim().slice(0, MAX_DESCRIPTION_LEN),
});

const validateTaskInput = ({ title, subject, dueDate }) => {
  if (!title)   return 'Title is required.';
  if (!subject) return 'Subject is required.';
  if (!dueDate) return 'Deadline is required.';
  if (Number.isNaN(Date.parse(dueDate))) return 'Deadline must be a valid date.';
  return null;
};

const toStartOfDayUTC = (dateStr) => {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const ok     = (res, data, status = 200) => res.status(status).json({ success: true,  data });
const okMsg  = (res, message)            => res.json({ success: true,  message });
const fail   = (res, message, status = 400) => res.status(status).json({ success: false, message });
const okPage = (res, data, meta)         => res.json({ success: true,  data, meta });

// ── GET /api/tasks ─────────────────────────────────────────────────────────
// Teacher: tasks they created, optionally filtered by classId
// Student: tasks in classes they joined (classId filter) OR legacy assignedTo
const getTasks = async (req, res) => {
  try {
    const sortBy = req.query.sort === 'deadline'
      ? { dueDate: 1, createdAt: -1 }
      : { createdAt: -1 };

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(PAGINATION_MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || PAGINATION_DEFAULT_LIMIT));
    const skip  = (page - 1) * limit;

    let filter;
    if (req.user.role === 'teacher') {
      filter = { createdBy: req.user._id };
      if (req.query.classId) filter.classId = req.query.classId;
    } else {
      // Student: tasks scoped to a specific class they belong to
      if (req.query.classId) {
        const Class = require('../models/Class');
        const cls = await Class.findOne({ _id: req.query.classId, students: req.user._id });
        if (!cls) return fail(res, 'Class not found or you are not a member.', 404);
        filter = { classId: req.query.classId };
      } else {
        // Legacy: tasks assigned directly to student
        filter = { assignedTo: { $in: [req.user._id] } };
      }
    }

    const [total, tasks] = await Promise.all([
      Task.countDocuments(filter),
      Task.find(filter, TASK_PROJECTION)
          .populate('createdBy', 'name email')
          .populate('assignedTo', 'name email')
          .sort(sortBy).skip(skip).limit(limit).lean(),
    ]);

    return okPage(res, tasks, { page, totalPages: Math.ceil(total / limit), total, limit });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

// ── GET /api/tasks/:id ─────────────────────────────────────────────────────
const getTaskById = async (req, res) => {
  try {
    const filter = req.user.role === 'teacher'
      ? { _id: req.params.id, createdBy: req.user._id }
      : { _id: req.params.id, assignedTo: { $in: [req.user._id] } };

    const task = await Task.findOne(filter, TASK_PROJECTION)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .lean();

    if (!task) return fail(res, 'Task not found.', 404);
    return ok(res, task);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

// ── POST /api/tasks — teacher only ────────────────────────────────────────
const createTask = async (req, res) => {
  const body  = sanitize(req.body);
  const error = validateTaskInput(body);
  if (error) return fail(res, error);

  try {
    let assignedTo = [];
    let classId    = null;

    if (body.classId) {
      // Class-based task: verify teacher owns the class, assign class students
      const Class = require('../models/Class');
      const cls = await Class.findOne({ _id: body.classId, teacherId: req.user._id });
      if (!cls) return fail(res, 'Class not found or you do not own it.', 404);
      classId    = cls._id;
      assignedTo = cls.students;
    } else {
      // Legacy: assign to all students in the system
      const User = require('../models/User');
      assignedTo = (await User.find({ role: 'student' }).select('_id').lean()).map((s) => s._id);
    }

    const task = await Task.create({
      ...body,
      dueDate:        toStartOfDayUTC(body.dueDate),
      createdBy:      req.user._id,
      classId,
      assignedTo,
      submissionType: body.submissionType || 'text',
    });
    const populated = await Task.findById(task._id, TASK_PROJECTION)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .lean();
    return ok(res, populated, 201);
  } catch (error) {
    return fail(res, error.message);
  }
};

// ── PUT /api/tasks/:id — teacher only ─────────────────────────────────────
const updateTask = async (req, res) => {
  const body  = sanitize(req.body);
  const error = validateTaskInput(body);
  if (error) return fail(res, error);

  try {
    // Re-sync assignedTo from class (or all students for legacy tasks)
    const existing = await Task.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!existing) return fail(res, 'Task not found.', 404);

    let assignedTo = existing.assignedTo;
    if (existing.classId) {
      const Class = require('../models/Class');
      const cls = await Class.findById(existing.classId);
      if (cls) assignedTo = cls.students;
    } else {
      const User = require('../models/User');
      assignedTo = (await User.find({ role: 'student' }).select('_id').lean()).map((s) => s._id);
    }

    const updated = await Task.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { ...body, dueDate: toStartOfDayUTC(body.dueDate), assignedTo, submissionType: body.submissionType || 'text' },
      { new: true, runValidators: true }
    );
    const task = await Task.findById(updated._id, TASK_PROJECTION)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .lean();
    return ok(res, task);
  } catch (error) {
    return fail(res, error.message);
  }
};

// ── DELETE /api/tasks/:id — teacher only ──────────────────────────────────
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!task) return fail(res, 'Task not found.', 404);
    return okMsg(res, 'Task deleted successfully.');
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

// ── GET /api/tasks/students — teacher only: list all students ─────────────
const getStudents = async (req, res) => {
  try {
    const User = require('../models/User');
    const students = await User.find({ role: 'student' }, 'name email').lean();
    return ok(res, students);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

// ── GET /api/tasks/students/:id — teacher only: view one student ──────────
// Returns the student's User record + their Profile (if any)
const getStudentById = async (req, res) => {
  try {
    const User    = require('../models/User');
    const Profile = require('../models/Profile');

    const student = await User.findOne({ _id: req.params.id, role: 'student' }, 'name email createdAt').lean();
    if (!student) return fail(res, 'Student not found.', 404);

    const profile = await Profile.findOne({ userId: req.params.id }).lean();

    // Submission stats for this student
    const Submission = require('../models/Submission');
    const Task       = require('../models/Task');

    const assignedTasks = await Task.find({ assignedTo: { $in: [req.params.id] }, createdBy: req.user._id }).select('_id dueDate').lean();
    const taskIds       = assignedTasks.map((t) => t._id);
    const submissions   = await Submission.find({ studentId: req.params.id, taskId: { $in: taskIds } }).select('taskId submittedAt status').lean();

    const now = new Date();
    const stats = { total: assignedTasks.length, submitted: 0, onTime: 0, late: 0, overdue: 0 };
    const subMap = {};
    submissions.forEach((s) => { subMap[String(s.taskId)] = s; });
    assignedTasks.forEach((task) => {
      const sub = subMap[String(task._id)];
      if (!sub) {
        if (now > new Date(task.dueDate)) stats.overdue += 1;
      } else {
        stats.submitted += 1;
        if (sub.status === 'late') stats.late += 1;
        else stats.onTime += 1;
      }
    });

    return ok(res, { student, profile: profile || {}, stats });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

// ── GET /api/tasks/summary — student only: task status counts ─────────────
// Accepts optional ?classId= to scope counts to a specific class.
// Returns { pending, submitted, overdue, late } for the authenticated student.
const getTaskSummary = async (req, res) => {
  try {
    const Submission = require('../models/Submission');
    const now = new Date();

    // Build filter: scope to classId if provided, otherwise all assigned tasks
    let taskFilter = { assignedTo: { $in: [req.user._id] } };
    if (req.query.classId) {
      // Verify student is a member of this class
      const Class = require('../models/Class');
      const cls = await Class.findOne({ _id: req.query.classId, students: req.user._id });
      if (!cls) return ok(res, { pending: 0, submitted: 0, overdue: 0, late: 0 });
      taskFilter = { classId: req.query.classId, assignedTo: { $in: [req.user._id] } };
    }

    const tasks = await Task.find(taskFilter).select('_id dueDate').lean();
    if (!tasks.length) return ok(res, { pending: 0, submitted: 0, overdue: 0, late: 0 });

    const taskIds     = tasks.map((t) => t._id);
    const submissions = await Submission.find({
      studentId: req.user._id,
      taskId:    { $in: taskIds },
    }).select('taskId submittedAt').lean();

    const subMap = {};
    submissions.forEach((s) => { subMap[String(s.taskId)] = s; });

    const counts = { pending: 0, submitted: 0, overdue: 0, late: 0 };
    tasks.forEach((task) => {
      const sub      = subMap[String(task._id)];
      const deadline = new Date(task.dueDate);
      if (!sub) {
        counts[now > deadline ? 'overdue' : 'pending'] += 1;
      } else {
        counts[new Date(sub.submittedAt) > deadline ? 'late' : 'submitted'] += 1;
      }
    });

    return ok(res, counts);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

module.exports = { getTasks, getTaskById, createTask, updateTask, deleteTask, getStudents, getStudentById, getTaskSummary };
