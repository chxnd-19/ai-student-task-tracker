const express        = require('express');
const router         = express.Router();
const { protect }    = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');
const upload         = require('../middleware/upload');
const {
  submitTask, getSubmissionsForTask, getMySubmissions,
  getClassAnalytics, getStudentAnalytics, getReminders,
} = require('../controllers/submissionController');

// Student submits or resubmits a task (creates new version)
router.post('/', protect, authorizeRoles('student'), upload.single('file'), submitTask);

// Teacher views all submissions for a specific task
router.get('/task/:taskId', protect, authorizeRoles('teacher'), getSubmissionsForTask);

// Student views their own submissions
router.get('/my', protect, authorizeRoles('student'), getMySubmissions);

// Analytics endpoints
router.get('/analytics/class/:classId', protect, authorizeRoles('teacher'), getClassAnalytics);
router.get('/analytics/student',        protect, authorizeRoles('student'), getStudentAnalytics);

// Smart reminders — unsubmitted tasks sorted by urgency
router.get('/reminders', protect, authorizeRoles('student'), getReminders);

module.exports = router;
