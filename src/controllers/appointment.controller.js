'use strict';

const { Op } = require('sequelize');
const db = require('../models');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, paginationMeta } = require('../utils/pagination');
const appointmentService = require('../services/appointment.service');
const slotService = require('../services/slot.service');
const { DateTime } = require('../utils/timezone.util');

const bookAppointment = catchAsync(async (req, res) => {
  const { doctorId, startTime } = req.body;

  const parsedStart = DateTime.fromISO(startTime, { setZone: true });
  if (!parsedStart.isValid) {
    throw new AppError('startTime must be a valid ISO 8601 datetime', 400);
  }

  const slot = await slotService.findAvailableSlot(doctorId, parsedStart);
  if (!slot) {
    throw new AppError('The requested slot is not a valid, currently available slot.', 409);
  }

  const appointment = await appointmentService.bookAppointment({
    doctorId,
    userId: req.user.id,
    startTime: slot.startTime,
    endTime: slot.endTime
  });

  sendSuccess(res, {
    statusCode: 201,
    message: 'Appointment booked successfully',
    data: { appointment }
  });
});

const myAppointments = catchAsync(async (req, res) => {
  const pagination = getPagination(req.query);
  const where = { userId: req.user.id };
  if (req.query.status) where.status = req.query.status;

  const { rows, count } = await db.Appointment.findAndCountAll({
    where,
    include: [{ model: db.Doctor, as: 'doctor', attributes: ['id', 'name', 'specialization'] }],
    order: [['startTime', 'DESC']],
    limit: pagination.limit,
    offset: pagination.offset
  });
  sendSuccess(res, {
    message: 'Your appointments',
    data: { appointments: rows },
    meta: paginationMeta(pagination, count)
  });
});

const listAllAppointments = catchAsync(async (req, res) => {
  const pagination = getPagination(req.query);
  const { doctorId, status, from, to } = req.query;

  const where = {};
  if (doctorId) where.doctorId = doctorId;
  if (status) where.status = status;
  if (from || to) {
    where.startTime = {};
    if (from) where.startTime[Op.gte] = new Date(from);
    if (to) where.startTime[Op.lt] = new Date(to);
  }

  const { rows, count } = await db.Appointment.findAndCountAll({
    where,
    include: [
      { model: db.Doctor, as: 'doctor', attributes: ['id', 'name', 'specialization'] },
      { model: db.User, as: 'user', attributes: ['id', 'name', 'email'] }
    ],
    order: [['startTime', 'ASC']],
    limit: pagination.limit,
    offset: pagination.offset
  });
  sendSuccess(res, {
    message: 'Appointments',
    data: { appointments: rows },
    meta: paginationMeta(pagination, count)
  });
});

const cancelAppointment = catchAsync(async (req, res) => {
  const { appointmentId } = req.params;
  const appointment = await appointmentService.cancelAppointment({
    appointmentId,
    requestingUser: req.user
  });
  sendSuccess(res, { message: 'Appointment cancelled', data: { appointment } });
});

module.exports = { bookAppointment, myAppointments, listAllAppointments, cancelAppointment };
