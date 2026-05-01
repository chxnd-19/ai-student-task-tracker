const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getProfile, upsertProfile } = require('../controllers/profileController');

router.get('/',  protect, getProfile);
router.put('/',  protect, upsertProfile);

module.exports = router;
