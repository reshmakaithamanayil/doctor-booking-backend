'use strict';

const express = require('express');
const authController = require('../controllers/auth.controller');
const { registerRules, loginRules } = require('../validators/auth.validator');
const { validate } = require('../middlewares/validate.middleware');
const { protect } = require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

// Brute-force protection on credential endpoints.
router.post('/register', authLimiter, registerRules, validate, authController.register);
router.post('/login', authLimiter, loginRules, validate, authController.login);
router.get('/me', protect, authController.me);

module.exports = router;
