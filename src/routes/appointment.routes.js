'use strict';

const express = require('express');
const appointmentController = require('../controllers/appointment.controller');
const { protect } = require('../middlewares/auth.middleware');
const { restrictTo } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  bookAppointmentRules,
  myAppointmentsRules,
  appointmentIdRules
} = require('../validators/appointment.validator');

const router = express.Router();

router.use(protect);

// Booking is a USER action; admins manage schedules, not book on behalf of
// users, per the spec ("Users can book an available appointment slot").
router.post('/', restrictTo('USER'), bookAppointmentRules, validate, appointmentController.bookAppointment);
router.get('/me', myAppointmentsRules, validate, appointmentController.myAppointments);
router.delete('/:appointmentId', appointmentIdRules, validate, appointmentController.cancelAppointment);

module.exports = router;
