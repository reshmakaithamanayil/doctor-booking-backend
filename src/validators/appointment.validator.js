'use strict';

const { body, query } = require('express-validator');
const { OFFSET_REGEX, idParam, paginationRules } = require('./common.validator');

const slotsQueryRules = [
  idParam('doctorId'),
  query('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date query param is required in YYYY-MM-DD format')
];

const listDoctorsRules = [
  ...paginationRules,
  query('specialization').optional().isString().trim().isLength({ max: 100 })
];

const bookAppointmentRules = [
  body('doctorId').isInt({ min: 1 }).withMessage('Valid doctorId is required').toInt(),
  body('startTime')
    .isISO8601({ strict: true })
    .withMessage('startTime must be a valid ISO 8601 datetime (e.g. returned by the slots endpoint)')
    .matches(OFFSET_REGEX)
    .withMessage('startTime must include a timezone offset (Z or +HH:mm)')
];

const myAppointmentsRules = [
  ...paginationRules,
  query('status').optional().isIn(['BOOKED', 'CANCELLED']).withMessage('status must be BOOKED or CANCELLED')
];

const appointmentIdRules = [idParam('appointmentId')];

module.exports = {
  slotsQueryRules,
  listDoctorsRules,
  bookAppointmentRules,
  myAppointmentsRules,
  appointmentIdRules
};
