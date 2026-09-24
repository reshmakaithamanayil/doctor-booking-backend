'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface) => {
    const email = (process.env.ADMIN_EMAIL || 'admin@clinic.com').toLowerCase();
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', 10);

    await queryInterface.bulkInsert('users', [
      {
        name: 'Clinic Admin',
        email,
        password: hashedPassword,
        role: 'ADMIN',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    await queryInterface.bulkInsert('clinic_settings', [
      {
        timezone: process.env.DEFAULT_CLINIC_TIMEZONE || 'Asia/Kolkata',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('users', {
      email: (process.env.ADMIN_EMAIL || 'admin@clinic.com').toLowerCase()
    });
    await queryInterface.bulkDelete('clinic_settings', null, {});
  }
};
