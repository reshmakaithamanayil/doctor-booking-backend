'use strict';

const { DateTime } = require('luxon');
const db = require('../models');

/**
 * Reads the clinic's configured IANA timezone (e.g. "Asia/Kolkata") from the
 * database. Falls back to DEFAULT_CLINIC_TIMEZONE only if no admin has
 * configured one yet (should not happen once the seeder has run).
 */
async function getClinicTimezone() {
  const setting = await db.ClinicSetting.findOne({ order: [['id', 'ASC']] });
  return setting ? setting.timezone : process.env.DEFAULT_CLINIC_TIMEZONE || 'UTC';
}

/**
 * Converts luxon's ISO weekday (1=Monday..7=Sunday) to the app's
 * 0=Sunday..6=Saturday convention used in DoctorAvailability.dayOfWeek.
 */
function toAppDayOfWeek(luxonWeekday) {
  return luxonWeekday === 7 ? 0 : luxonWeekday;
}

/**
 * Validates that a string is a real IANA timezone name.
 */
function isValidTimezone(tz) {
  return typeof tz === 'string' && DateTime.local().setZone(tz).isValid;
}

module.exports = {
  getClinicTimezone,
  toAppDayOfWeek,
  isValidTimezone,
  DateTime
};
