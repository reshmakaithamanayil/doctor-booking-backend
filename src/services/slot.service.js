'use strict';

const { Op } = require('sequelize');
const db = require('../models');
const AppError = require('../utils/AppError');
const { getClinicTimezone, toAppDayOfWeek, DateTime } = require('../utils/timezone.util');


async function getAvailableSlots(doctorId, dateStr) {
  const doctor = await db.Doctor.findByPk(doctorId);
  if (!doctor || !doctor.isActive) {
    throw new AppError('Doctor not found or inactive', 404);
  }

  const timezone = await getClinicTimezone();

  const localDate = DateTime.fromISO(dateStr, { zone: timezone });
  if (!localDate.isValid) {
    throw new AppError('Invalid date format, expected YYYY-MM-DD', 400);
  }

  const dow = toAppDayOfWeek(localDate.weekday);

  const availabilities = await db.DoctorAvailability.findAll({
    where: { doctorId, dayOfWeek: dow, isActive: true }
  });

  if (!availabilities.length) {
    return { timezone, date: dateStr, slots: [] };
  }

  const dayStartUTC = localDate.startOf('day').toUTC().toJSDate();
  const dayEndUTC = localDate.endOf('day').toUTC().toJSDate();

  const [unavailabilities, bookedAppointments] = await Promise.all([
    db.DoctorUnavailability.findAll({
      where: {
        doctorId,
        startAt: { [Op.lt]: dayEndUTC },
        endAt: { [Op.gt]: dayStartUTC }
      }
    }),
    db.Appointment.findAll({
      where: {
        doctorId,
        status: 'BOOKED',
        startTime: { [Op.lt]: dayEndUTC },
        endTime: { [Op.gt]: dayStartUTC }
      }
    })
  ]);

  const now = DateTime.utc();
  const slots = [];

  for (const avail of availabilities) {
    const [startH, startM] = avail.startTime.split(':').map(Number);
    const [endH, endM] = avail.endTime.split(':').map(Number);

    let cursor = localDate.set({ hour: startH, minute: startM, second: 0, millisecond: 0 });
    const windowEnd = localDate.set({ hour: endH, minute: endM, second: 0, millisecond: 0 });

    while (cursor.plus({ minutes: avail.slotDurationMinutes }) <= windowEnd) {
      const slotStart = cursor;
      const slotEnd = cursor.plus({ minutes: avail.slotDurationMinutes });
      const slotStartUTC = slotStart.toUTC();
      const slotEndUTC = slotEnd.toUTC();

      const overlapsUnavailability = unavailabilities.some(
        (u) => slotStartUTC.toJSDate() < u.endAt && slotEndUTC.toJSDate() > u.startAt
      );

      const overlapsBooking = bookedAppointments.some(
        (a) => slotStartUTC.toJSDate() < a.endTime && slotEndUTC.toJSDate() > a.startTime
      );

      if (!overlapsUnavailability && !overlapsBooking && slotStartUTC > now) {
        slots.push({
          startTime: slotStartUTC.toISO(),
          endTime: slotEndUTC.toISO()
        });
      }

      cursor = slotEnd;
    }
  }

  slots.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  return { timezone, date: dateStr, slots };
}

async function findAvailableSlot(doctorId, startInstant) {
  const timezone = await getClinicTimezone();
  const localDate = startInstant.setZone(timezone).toISODate();
  const { slots } = await getAvailableSlots(doctorId, localDate);
  const target = startInstant.toMillis();
  return slots.find((s) => DateTime.fromISO(s.startTime).toMillis() === target) || null;
}

module.exports = { getAvailableSlots, findAvailableSlot };
