const Submission = require('../models/Submission');
const Task       = require('../models/Task');
const Class      = require('../models/Class');

const ok   = (res, data, status = 200) => res.status(status).json({ success: true,  data });
const fail = (res, message, status = 400) => res.status(status).json({ success: false, message });

// ── POST /api/submissions — student submits or resubmits a task ───────────
const submitTask = async (req, res) => {
  const { taskId, textSubmission } = req.body;
  if (!taskId) return fail(res, 'taskId is required.');

  try {
    const task = await Task.findOne({ _id: taskId, assignedTo: req.user._id });
    if (!task) return fail(res, 'Task not found or not assigned to you.', 404);

    const now            = new Date();
    const isLate         = now > task.dueDate;
    const fileUrl        = req.file ? `/uploads/${req.file.filename}` : undefined;
    const submissionType = task.submissionType || 'text';

    if (submissionType === 'file' && !fileUrl) {
      return fail(res, 'This task requires a PDF file upload.');
    }
    if (submissionType === 'text' && !textSubmission?.trim()) {
      return fail(res, 'Text submission is required.');
    }

    const versionEntry = {
      textSubmission: textSubmission?.trim(),
      fileUrl,
      submittedAt: now,
    };

    // Upsert: create on first submit, push new version on resubmit
    const submission = await Submission.findOneAndUpdate(
      { taskId, studentId: req.user._id },
      {
        $set: {
          textSubmission: textSubmission?.trim(),
          fileUrl,
          status:      isLate ? 'late' : 'submitted',
          submittedAt: now,
        },
        $push: { versions: versionEntry },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return ok(res, submission, 201);
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 'Submission conflict. Please try again.');
    }
    return fail(res, error.message, 500);
  }
};

// ── GET /api/submissions/task/:taskId — teacher views all submissions ─────
const getSubmissionsForTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.taskId, createdBy: req.user._id });
    if (!task) return fail(res, 'Task not found.', 404);

    const submissions = await Submission.find({ taskId: req.params.taskId })
      .populate('studentId', 'name email')
      .lean();

    return ok(res, submissions);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

// ── GET /api/submissions/my — student views their own submissions ─────────
const getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ studentId: req.user._id })
      .populate('taskId', 'title subject dueDate submissionType')
      .lean();
    return ok(res, submissions);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

// ── GET /api/submissions/analytics/class/:classId — teacher analytics ─────
// Returns per-task stats: total assigned, submitted, late, on-time, completion %
const getClassAnalytics = async (req, res) => {
  try {
    // Verify teacher owns this class
    const cls = await Class.findOne({ _id: req.params.classId, teacherId: req.user._id });
    if (!cls) return fail(res, 'Class not found.', 404);

    const tasks = await Task.find({ classId: req.params.classId, createdBy: req.user._id }).lean();
    if (!tasks.length) return ok(res, { tasks: [], summary: {} });

    const taskIds      = tasks.map((t) => t._id);
    const submissions  = await Submission.find({ taskId: { $in: taskIds } }).lean();
    const totalStudents = cls.students.length;

    const taskStats = tasks.map((task) => {
      const subs      = submissions.filter((s) => String(s.taskId) === String(task._id));
      const submitted = subs.length;
      const late      = subs.filter((s) => s.status === 'late').length;
      const onTime    = submitted - late;
      const missed    = totalStudents - submitted;
      const rate      = totalStudents > 0 ? Math.round((submitted / totalStudents) * 100) : 0;

      return {
        taskId:    task._id,
        title:     task.title,
        subject:   task.subject,
        dueDate:   task.dueDate,
        totalStudents,
        submitted,
        onTime,
        late,
        missed,
        completionRate: rate,
      };
    });

    // Class-level summary
    const totalTasks      = tasks.length;
    const avgCompletion   = taskStats.length
      ? Math.round(taskStats.reduce((a, t) => a + t.completionRate, 0) / taskStats.length)
      : 0;
    const totalLate       = taskStats.reduce((a, t) => a + t.late, 0);
    const totalSubmissions = taskStats.reduce((a, t) => a + t.submitted, 0);

    return ok(res, {
      tasks: taskStats,
      summary: { totalTasks, totalStudents, avgCompletion, totalLate, totalSubmissions },
    });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

// ── GET /api/submissions/analytics/student — student's own stats ──────────
const getStudentAnalytics = async (req, res) => {
  try {
    const submissions = await Submission.find({ studentId: req.user._id })
      .populate('taskId', 'title subject dueDate classId')
      .lean();

    const total    = submissions.length;
    const onTime   = submissions.filter((s) => s.status === 'submitted').length;
    const late     = submissions.filter((s) => s.status === 'late').length;
    const resubmits = submissions.filter((s) => s.versions.length > 1).length;

    return ok(res, { total, onTime, late, resubmits, submissions });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

// ── GET /api/submissions/reminders — tasks with upcoming/overdue deadlines ─
// Returns tasks the student hasn't submitted yet, sorted by urgency
const getReminders = async (req, res) => {
  try {
    const now = new Date();

    // Get all tasks assigned to this student
    const tasks = await Task.find({ assignedTo: req.user._id }).lean();
    if (!tasks.length) return ok(res, []);

    // Get already-submitted task IDs
    const submitted = await Submission.find({ studentId: req.user._id }).select('taskId').lean();
    const submittedIds = new Set(submitted.map((s) => String(s.taskId)));

    // Filter to unsubmitted tasks only
    const pending = tasks.filter((t) => !submittedIds.has(String(t._id)));

    const reminders = pending.map((task) => {
      const due      = new Date(task.dueDate);
      const diffMs   = due - now;
      const diffHrs  = Math.round(diffMs / (1000 * 60 * 60));
      const isOverdue = diffMs < 0;

      let urgency = 'normal';
      if (isOverdue)        urgency = 'overdue';
      else if (diffHrs < 24) urgency = 'urgent';   // due within 24 h
      else if (diffHrs < 72) urgency = 'soon';     // due within 3 days

      return {
        taskId:   task._id,
        title:    task.title,
        subject:  task.subject,
        dueDate:  task.dueDate,
        classId:  task.classId,
        urgency,
        hoursLeft: isOverdue ? null : diffHrs,
      };
    });

    // Sort: overdue first, then by soonest deadline
    reminders.sort((a, b) => {
      const order = { overdue: 0, urgent: 1, soon: 2, normal: 3 };
      if (order[a.urgency] !== order[b.urgency]) return order[a.urgency] - order[b.urgency];
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    return ok(res, reminders);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

module.exports = {
  submitTask,
  getSubmissionsForTask,
  getMySubmissions,
  getClassAnalytics,
  getStudentAnalytics,
  getReminders,
};
