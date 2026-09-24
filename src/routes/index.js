'use strict';

const express = require('express');
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const doctorRoutes = require('./doctor.routes');
const appointmentRoutes = require('./appointment.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);

module.exports = router;
