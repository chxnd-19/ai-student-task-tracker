const express        = require('express');
const router         = express.Router();
const { protect }    = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');
const {
  getTasks, getTaskById, createTask, updateTask, deleteTask, getStudents, getStudentById, getTaskSummary,
} = require('../controllers/taskController');

// List all students (teacher only — for assignment dropdown)
router.get('/students', protect, authorizeRoles('teacher'), getStudents);

// View a single student's profile (teacher only)
router.get('/students/:id', protect, authorizeRoles('teacher'), getStudentById);

// Task status summary for the logged-in student
router.get('/summary', protect, authorizeRoles('student'), getTaskSummary);

// Task CRUD
router.route('/')
  .get(protect, getTasks)
  .post(protect, authorizeRoles('teacher'), createTask);

router.route('/:id')
  .get(protect, getTaskById)
  .put(protect,  authorizeRoles('teacher'), updateTask)
  .delete(protect, authorizeRoles('teacher'), deleteTask);

module.exports = router;
