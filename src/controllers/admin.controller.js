'use strict';

const db = require('../models');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { Op } = require('sequelize');
const { isValidTimezone } = require('../utils/timezone.util');
const { getPagination, paginationMeta } = require('../utils/pagination');


function normalizeTime(value) {
  const [h, m, sec = '00'] = String(value).split(':');
  return [h.padStart(2, '0'), m.padStart(2, '0'), sec.padStart(2, '0')].join(':');
}


async function assertNoOverlappingWindow({ doctorId, dayOfWeek, startTime, endTime, excludeId }) {
  const where = {
    doctorId,
    dayOfWeek,
    isActive: true,
    startTime: { [Op.lt]: endTime },
    endTime: { [Op.gt]: startTime }
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const overlap = await db.DoctorAvailability.findOne({ where });
  if (overlap) {
    throw new AppError(
      `This window overlaps an existing availability window (id ${overlap.id}) on the same day.`,
      409
    );
  }
}


const getClinicSettings = catchAsync(async (req, res) => {
  const setting = await db.ClinicSetting.findOne({ order: [['id', 'ASC']] });
  sendSuccess(res, { message: 'Clinic settings', data: { setting } });
});

const updateClinicSettings = catchAsync(async (req, res) => {
  const { timezone } = req.body;

  if (!isValidTimezone(timezone)) {
    throw new AppError('Invalid IANA timezone name (e.g. Asia/Kolkata, America/New_York).', 400);
  }

  let setting = await db.ClinicSetting.findOne({ order: [['id', 'ASC']] });
  if (setting) {
    setting.timezone = timezone;
    await setting.save();
  } else {
    setting = await db.ClinicSetting.create({ timezone });
  }

  sendSuccess(res, { message: 'Clinic timezone updated', data: { setting } });
});

// ---------- Doctors ----------

const createDoctor = catchAsync(async (req, res) => {
  const { name, specialization, email, phone, isActive } = req.body;
  const doctor = await db.Doctor.create({ name, specialization, email, phone, isActive });
  sendSuccess(res, { statusCode: 201, message: 'Doctor created', data: { doctor } });
});

const listDoctorsAdmin = catchAsync(async (req, res) => {
  const pagination = getPagination(req.query);
  const { rows, count } = await db.Doctor.findAndCountAll({
    order: [['id', 'ASC']],
    limit: pagination.limit,
    offset: pagination.offset
  });
  sendSuccess(res, {
    message: 'Doctors',
    data: { doctors: rows },
    meta: paginationMeta(pagination, count)
  });
});

const getDoctorAdmin = catchAsync(async (req, res) => {
  const doctor = await db.Doctor.findByPk(req.params.doctorId);
  if (!doctor) throw new AppError('Doctor not found', 404);
  sendSuccess(res, { message: 'Doctor', data: { doctor } });
});

const updateDoctor = catchAsync(async (req, res) => {
  const { doctorId } = req.params;
  const doctor = await db.Doctor.findByPk(doctorId);
  if (!doctor) throw new AppError('Doctor not found', 404);

  const { name, specialization, email, phone, isActive } = req.body;
  if (name !== undefined) doctor.name = name;
  if (specialization !== undefined) doctor.specialization = specialization;
  if (email !== undefined) doctor.email = email;
  if (phone !== undefined) doctor.phone = phone;
  if (isActive !== undefined) doctor.isActive = isActive;

  await doctor.save();
  sendSuccess(res, { message: 'Doctor updated', data: { doctor } });
});

const deleteDoctor = catchAsync(async (req, res) => {
  const { doctorId } = req.params;
  const doctor = await db.Doctor.findByPk(doctorId);
  if (!doctor) throw new AppError('Doctor not found', 404); 
  doctor.isActive = false;
  await doctor.save();

  sendSuccess(res, { message: 'Doctor deactivated', data: { doctor } });
});

// ---------- Doctor availability ----------

const addAvailability = catchAsync(async (req, res) => {
  const { doctorId } = req.params;
  const doctor = await db.Doctor.findByPk(doctorId);
  if (!doctor) throw new AppError('Doctor not found', 404);

  const { dayOfWeek, slotDurationMinutes } = req.body;
  const startTime = normalizeTime(req.body.startTime);
  const endTime = normalizeTime(req.body.endTime);
  const isActive = req.body.isActive === undefined ? true : req.body.isActive;

  if (startTime >= endTime) {
    throw new AppError('startTime must be earlier than endTime', 400);
  }

  if (isActive) {
    await assertNoOverlappingWindow({ doctorId, dayOfWeek, startTime, endTime });
  }

  const availability = await db.DoctorAvailability.create({
    doctorId,
    dayOfWeek,
    startTime,
    endTime,
    slotDurationMinutes: slotDurationMinutes || 30,
    isActive
  });

  sendSuccess(res, { statusCode: 201, message: 'Availability added', data: { availability } });
});

const listAvailability = catchAsync(async (req, res) => {
  const { doctorId } = req.params;
  const availabilities = await db.DoctorAvailability.findAll({
    where: { doctorId },
    order: [
      ['dayOfWeek', 'ASC'],
      ['startTime', 'ASC']
    ]
  });
  sendSuccess(res, { message: 'Doctor availability', data: { availabilities } });
});

const updateAvailability = catchAsync(async (req, res) => {
  const { availabilityId } = req.params;
  const availability = await db.DoctorAvailability.findByPk(availabilityId);
  if (!availability) throw new AppError('Availability entry not found', 404);

  const { dayOfWeek, startTime, endTime, slotDurationMinutes, isActive } = req.body;
  if (dayOfWeek !== undefined) availability.dayOfWeek = dayOfWeek;
  if (startTime !== undefined) availability.startTime = normalizeTime(startTime);
  if (endTime !== undefined) availability.endTime = normalizeTime(endTime);
  if (slotDurationMinutes !== undefined) availability.slotDurationMinutes = slotDurationMinutes;
  if (isActive !== undefined) availability.isActive = isActive;

  if (normalizeTime(availability.startTime) >= normalizeTime(availability.endTime)) {
    throw new AppError('startTime must be earlier than endTime', 400);
  }

  if (availability.isActive) {
    await assertNoOverlappingWindow({
      doctorId: availability.doctorId,
      dayOfWeek: availability.dayOfWeek,
      startTime: normalizeTime(availability.startTime),
      endTime: normalizeTime(availability.endTime),
      excludeId: availability.id
    });
  }

  await availability.save();
  sendSuccess(res, { message: 'Availability updated', data: { availability } });
});

const deleteAvailability = catchAsync(async (req, res) => {
  const { availabilityId } = req.params;
  const availability = await db.DoctorAvailability.findByPk(availabilityId);
  if (!availability) throw new AppError('Availability entry not found', 404);

  await availability.destroy();
  sendSuccess(res, { message: 'Availability removed' });
});

// ---------- Doctor unavailability----------

const addUnavailability = catchAsync(async (req, res) => {
  const { doctorId } = req.params;
  const doctor = await db.Doctor.findByPk(doctorId);
  if (!doctor) throw new AppError('Doctor not found', 404);

  const { startAt, endAt, type, reason } = req.body;

  if (new Date(startAt) >= new Date(endAt)) {
    throw new AppError('startAt must be earlier than endAt', 400);
  }

  const unavailability = await db.DoctorUnavailability.create({
    doctorId,
    startAt,
    endAt,
    type: type || 'OTHER',
    reason
  });

   const conflictingAppointments = await db.Appointment.findAll({
    where: {
      doctorId,
      status: 'BOOKED',
      startTime: { [Op.lt]: unavailability.endAt },
      endTime: { [Op.gt]: unavailability.startAt }
    },
    attributes: ['id', 'userId', 'startTime', 'endTime'],
    order: [['startTime', 'ASC']]
  });

  sendSuccess(res, {
    statusCode: 201,
    message: conflictingAppointments.length
      ? `Unavailability added. ${conflictingAppointments.length} existing booking(s) overlap this period.`
      : 'Unavailability added',
    data: { unavailability, conflictingAppointments }
  });
});

const listUnavailability = catchAsync(async (req, res) => {
  const { doctorId } = req.params;
  const where = { doctorId };
  // By default only current/future entries; ?includePast=true for history.
  if (req.query.includePast !== 'true') where.endAt = { [Op.gt]: new Date() };
  const unavailabilities = await db.DoctorUnavailability.findAll({
    where,
    order: [['startAt', 'ASC']]
  });
  sendSuccess(res, { message: 'Doctor unavailability', data: { unavailabilities } });
});

const deleteUnavailability = catchAsync(async (req, res) => {
  const { unavailabilityId } = req.params;
  const record = await db.DoctorUnavailability.findByPk(unavailabilityId);
  if (!record) throw new AppError('Unavailability entry not found', 404);

  await record.destroy();
  sendSuccess(res, { message: 'Unavailability removed' });
});


const createUser = catchAsync(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = await db.User.findOne({ where: { email } });
  if (existing) throw new AppError('An account with this email already exists.', 409);

  const user = await db.User.create({ name, email, password, role: role || 'USER' });
  sendSuccess(res, { statusCode: 201, message: 'User created', data: { user } });
});

module.exports = {
  getClinicSettings,
  updateClinicSettings,
  createDoctor,
  listDoctorsAdmin,
  getDoctorAdmin,
  updateDoctor,
  deleteDoctor,
  addAvailability,
  listAvailability,
  updateAvailability,
  deleteAvailability,
  addUnavailability,
  listUnavailability,
  deleteUnavailability,
  createUser
};
