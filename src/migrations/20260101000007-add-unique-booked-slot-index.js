'use strict';

// This partial unique index is the last line of defense against double
// booking: even if two requests race past the application-level checks,
// Postgres itself will reject the second INSERT for the same doctor_id +
// start_time while status = 'BOOKED'. Cancelled appointments are excluded,
// so a cancelled slot's timestamp can be re-booked.
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX appointments_doctor_start_booked_unique
      ON appointments (doctor_id, start_time)
      WHERE status = 'BOOKED';
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS appointments_doctor_start_booked_unique;
    `);
  }
};
