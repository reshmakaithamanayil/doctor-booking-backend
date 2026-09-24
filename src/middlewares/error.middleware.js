'use strict';

// Postgres error codes we translate into client-facing responses.
const PG = {
  SERIALIZATION_FAILURE: '40001',
  DEADLOCK_DETECTED: '40P01',
  CHECK_VIOLATION: '23514',
  INVALID_TEXT_REPRESENTATION: '22P02',
  DATETIME_OUT_OF_RANGE: '22008'
};

const DOUBLE_BOOKING_CONSTRAINTS = [
  'appointments_doctor_start_booked_unique',
  'appointments_no_overlap_booked'
];

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.isOperational ? err.message : 'Internal server error';
  const pgCode = err.parent && err.parent.code;
  const constraint = err.parent && err.parent.constraint;

  // Malformed JSON / oversized body from express.json()
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON request body.';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body is too large.';
  } else if (err.name === 'SequelizeValidationError') {
    // Sequelize model validations (e.g. isEmail, allowNull, min/max)
    statusCode = 422;
    message = err.errors.map((e) => e.message).join(', ');
  } else if (err.name === 'SequelizeUniqueConstraintError' || err.name === 'SequelizeExclusionConstraintError') {
    // Includes the DB-level guards against double-booking a slot.
    statusCode = 409;
    message = DOUBLE_BOOKING_CONSTRAINTS.includes(constraint)
      ? 'This slot has just been booked by someone else. Please pick another slot.'
      : 'A record with these details already exists.';
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Invalid reference to a related record.';
  } else if (pgCode === PG.SERIALIZATION_FAILURE || pgCode === PG.DEADLOCK_DETECTED) {
    statusCode = 409;
    message = 'The request conflicted with a concurrent update. Please try again.';
  } else if (pgCode === PG.CHECK_VIOLATION) {
    statusCode = 400;
    message = 'The request violates a data constraint.';
  } else if (pgCode === PG.INVALID_TEXT_REPRESENTATION || pgCode === PG.DATETIME_OUT_OF_RANGE) {
    statusCode = 400;
    message = 'Invalid value in request.';
  }

  if (statusCode >= 500 || process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message
  });
}

module.exports = errorHandler;
