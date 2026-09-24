'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('doctor_availabilities', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      doctor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'doctors', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      day_of_week: { type: Sequelize.INTEGER, allowNull: false },
      start_time: { type: Sequelize.TIME, allowNull: false },
      end_time: { type: Sequelize.TIME, allowNull: false },
      slot_duration_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
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

    await queryInterface.addIndex('doctor_availabilities', ['doctor_id', 'day_of_week']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('doctor_availabilities');
  }
};
