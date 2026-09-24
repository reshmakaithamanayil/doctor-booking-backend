'use strict';

// Database-level integrity rules, so invalid data is rejected even if it
// bypasses the API (scripts, manual SQL, future bugs):
//  - appointments_no_overlap_booked: no two BOOKED appointments of the same
//    doctor may overlap in time at all (not just share a start time). This
//    is the strongest guarantee against double booking.
//  - CHECK constraints on time ranges and value bounds.
//  - Case-insensitive uniqueness of user emails.
module.exports = {
  up: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql);

    // Trusted extension (PG13+): the database owner can create it.
    await q('CREATE EXTENSION IF NOT EXISTS btree_gist;');

    await q(`
      ALTER TABLE appointments
      ADD CONSTRAINT appointments_no_overlap_booked
      EXCLUDE USING gist (doctor_id WITH =, tstzrange(start_time, end_time, '[)') WITH &&)
      WHERE (status = 'BOOKED');
    `);

    await q(`ALTER TABLE appointments
      ADD CONSTRAINT appointments_time_range_check CHECK (end_time > start_time);`);
    await q(`ALTER TABLE doctor_unavailabilities
      ADD CONSTRAINT doctor_unavailabilities_time_range_check CHECK (end_at > start_at);`);
    await q(`ALTER TABLE doctor_availabilities
      ADD CONSTRAINT doctor_availabilities_time_range_check CHECK (end_time > start_time);`);
    await q(`ALTER TABLE doctor_availabilities
      ADD CONSTRAINT doctor_availabilities_day_of_week_check CHECK (day_of_week BETWEEN 0 AND 6);`);
    await q(`ALTER TABLE doctor_availabilities
      ADD CONSTRAINT doctor_availabilities_slot_duration_check CHECK (slot_duration_minutes BETWEEN 5 AND 480);`);

    await q('CREATE UNIQUE INDEX users_email_lower_unique ON users (LOWER(email));');

    // Speeds up the admin "all appointments" listing filtered by status/time.
    await q('CREATE INDEX appointments_status_start_idx ON appointments (status, start_time);');
  },

  down: async (queryInterface) => {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q('DROP INDEX IF EXISTS appointments_status_start_idx;');
    await q('DROP INDEX IF EXISTS users_email_lower_unique;');
    await q('ALTER TABLE doctor_availabilities DROP CONSTRAINT IF EXISTS doctor_availabilities_slot_duration_check;');
    await q('ALTER TABLE doctor_availabilities DROP CONSTRAINT IF EXISTS doctor_availabilities_day_of_week_check;');
    await q('ALTER TABLE doctor_availabilities DROP CONSTRAINT IF EXISTS doctor_availabilities_time_range_check;');
    await q('ALTER TABLE doctor_unavailabilities DROP CONSTRAINT IF EXISTS doctor_unavailabilities_time_range_check;');
    await q('ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_time_range_check;');
    await q('ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_no_overlap_booked;');
  }
};
