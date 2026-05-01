const express        = require('express');
const router         = express.Router();
const { protect }    = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');
const {
  createClass, getMyClasses, getJoinedClasses, joinClass, deleteClass,
} = require('../controllers/classController');

router.post('/',        protect, authorizeRoles('teacher'), createClass);
router.get('/my',       protect, authorizeRoles('teacher'), getMyClasses);
router.get('/joined',   protect, authorizeRoles('student'), getJoinedClasses);
router.post('/join',    protect, authorizeRoles('student'), joinClass);
router.delete('/:id',   protect, authorizeRoles('teacher'), deleteClass);

module.exports = router;
