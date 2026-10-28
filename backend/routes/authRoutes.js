const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { login, me, updateProfile, changePassword } = require('../controllers/authController');

router.post('/login', login);
router.get('/me', protect, me);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);

module.exports = router;
