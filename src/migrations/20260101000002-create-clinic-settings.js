'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('clinic_settings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      timezone: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'Asia/Kolkata'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('clinic_settings');
  }
};
