'use strict';

const { Op, Transaction } = require('sequelize');
const db = require('../models');
const AppError = require('../utils/AppError');


async function bookAppointment({ doctorId, userId, startTime, endTime }) {
  if (new Date(startTime) <= new Date()) {
    throw new AppError('Cannot book a slot in the past.', 400);
  }

  return db.sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
    async (t) => {
      const doctor = await db.Doctor.findByPk(doctorId, {
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!doctor || !doctor.isActive) {
        throw new AppError('Doctor not found or inactive', 404);
      }

      const conflict = await db.Appointment.findOne({
        where: {
          doctorId,
          status: 'BOOKED',
          startTime: { [Op.lt]: endTime },
          endTime: { [Op.gt]: startTime }
        },
        transaction: t
      });

      if (conflict) {
        throw new AppError('This slot is no longer available. Please choose another slot.', 409);
      }

      const unavailable = await db.DoctorUnavailability.findOne({
        where: {
          doctorId,
          startAt: { [Op.lt]: endTime },
          endAt: { [Op.gt]: startTime }
        },
        transaction: t
      });

      if (unavailable) {
        throw new AppError('Doctor is unavailable at this time.', 409);
      }

      return db.Appointment.create(
        { doctorId, userId, startTime, endTime, status: 'BOOKED' },
        { transaction: t }
      );
    }
  );
}

async function cancelAppointment({ appointmentId, requestingUser }) {
  const appointment = await db.Appointment.findByPk(appointmentId);

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  const isOwner = appointment.userId === requestingUser.id;
  const isAdmin = requestingUser.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
   
    throw new AppError('Appointment not found', 404);
  }

  if (appointment.status === 'CANCELLED') {
    throw new AppError('Appointment is already cancelled.', 400);
  }

  if (!isAdmin && new Date(appointment.startTime) <= new Date()) {
    throw new AppError('Past appointments cannot be cancelled.', 400);
  }

  appointment.status = 'CANCELLED';
  await appointment.save();

  return appointment;
}

module.exports = { bookAppointment, cancelAppointment };
