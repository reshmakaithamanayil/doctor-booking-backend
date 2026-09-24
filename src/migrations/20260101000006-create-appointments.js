'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('appointments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      doctor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'doctors', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      start_time: { type: Sequelize.DATE, allowNull: false },
      end_time: { type: Sequelize.DATE, allowNull: false },
      status: {
        type: Sequelize.ENUM('BOOKED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'BOOKED'
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

    await queryInterface.addIndex('appointments', ['doctor_id', 'start_time']);
    await queryInterface.addIndex('appointments', ['user_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('appointments');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_appointments_status";');
  }
};
