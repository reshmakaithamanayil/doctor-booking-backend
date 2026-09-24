'use strict';

const { body, query } = require('express-validator');
const { TIME_REGEX, OFFSET_REGEX, idParam, paginationRules } = require('./common.validator');

const clinicSettingRules = [
  body('timezone')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Timezone is required (IANA name, e.g. Asia/Kolkata)')
];

const doctorIdRules = [idParam('doctorId')];
const availabilityIdRules = [idParam('availabilityId')];
const unavailabilityIdRules = [idParam('unavailabilityId')];

const doctorFieldRules = [
  body('specialization').optional({ values: 'null' }).isString().trim().isLength({ max: 100 }),
  body('email')
    .optional({ values: 'null' })
    .isString()
    .trim()
    .isEmail()
    .withMessage('Email must be valid')
    .toLowerCase(),
  body('phone')
    .optional({ values: 'null' })
    .isString()
    .trim()
    .matches(/^[+\d][\d\s()-]{5,19}$/)
    .withMessage('Phone must be 6-20 characters of digits, spaces, +, -, ( )'),
  body('isActive').optional().isBoolean({ strict: true }).withMessage('isActive must be a boolean')
];

const createDoctorRules = [
  body('name').isString().trim().notEmpty().withMessage('Doctor name is required').isLength({ max: 100 }),
  ...doctorFieldRules
];

const updateDoctorRules = [
  idParam('doctorId'),
  body('name')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Doctor name cannot be empty')
    .isLength({ max: 100 }),
  ...doctorFieldRules
];

const dayOfWeekRule = () =>
  body('dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('dayOfWeek must be 0 (Sunday) to 6 (Saturday)').toInt();

const slotDurationRule = () =>
  body('slotDurationMinutes')
    .optional()
    .isInt({ min: 5, max: 480 })
    .withMessage('slotDurationMinutes must be between 5 and 480')
    .toInt();

const availabilityRules = [
  idParam('doctorId'),
  dayOfWeekRule(),
  body('startTime').matches(TIME_REGEX).withMessage('startTime must be HH:mm or HH:mm:ss'),
  body('endTime').matches(TIME_REGEX).withMessage('endTime must be HH:mm or HH:mm:ss'),
  slotDurationRule(),
  body('isActive').optional().isBoolean({ strict: true }).withMessage('isActive must be a boolean')
];

const updateAvailabilityRules = [
  idParam('availabilityId'),
  dayOfWeekRule().optional(),
  body('startTime').optional().matches(TIME_REGEX).withMessage('startTime must be HH:mm or HH:mm:ss'),
  body('endTime').optional().matches(TIME_REGEX).withMessage('endTime must be HH:mm or HH:mm:ss'),
  slotDurationRule(),
  body('isActive').optional().isBoolean({ strict: true }).withMessage('isActive must be a boolean')
];

const isoWithOffset = (field) =>
  body(field)
    .isISO8601({ strict: true })
    .withMessage(`${field} must be a valid ISO 8601 datetime`)
    .matches(OFFSET_REGEX)
    .withMessage(`${field} must include a timezone offset, e.g. 2026-10-05T13:00:00+05:30 or ...Z`);

const unavailabilityRules = [
  idParam('doctorId'),
  isoWithOffset('startAt'),
  isoWithOffset('endAt'),
  body('type').optional().isIn(['BREAK', 'LEAVE', 'OTHER']).withMessage('type must be BREAK, LEAVE or OTHER'),
  body('reason').optional({ values: 'null' }).isString().trim().isLength({ max: 255 })
];

const listUnavailabilityRules = [
  idParam('doctorId'),
  query('includePast').optional().isIn(['true', 'false']).withMessage('includePast must be true or false')
];

const listAppointmentsRules = [
  ...paginationRules,
  query('doctorId').optional().isInt({ min: 1 }).withMessage('doctorId must be a positive integer'),
  query('status').optional().isIn(['BOOKED', 'CANCELLED']).withMessage('status must be BOOKED or CANCELLED'),
  query('from').optional().isISO8601().withMessage('from must be an ISO 8601 datetime'),
  query('to').optional().isISO8601().withMessage('to must be an ISO 8601 datetime')
];

module.exports = {
  clinicSettingRules,
  doctorIdRules,
  availabilityIdRules,
  unavailabilityIdRules,
  createDoctorRules,
  updateDoctorRules,
  availabilityRules,
  updateAvailabilityRules,
  unavailabilityRules,
  listUnavailabilityRules,
  listAppointmentsRules,
  paginationRules
};
