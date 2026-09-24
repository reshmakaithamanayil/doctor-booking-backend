'use strict';

const express = require('express');
const doctorController = require('../controllers/doctor.controller');
const { protect } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { slotsQueryRules, listDoctorsRules } = require('../validators/appointment.validator');

const router = express.Router();

router.get('/', protect, listDoctorsRules, validate, doctorController.listDoctors);
router.get('/:doctorId/slots', protect, slotsQueryRules, validate, doctorController.getDoctorSlots);

module.exports = router;
