'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('doctor_unavailabilities', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      doctor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'doctors', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      start_at: { type: Sequelize.DATE, allowNull: false },
      end_at: { type: Sequelize.DATE, allowNull: false },
      type: {
        type: Sequelize.ENUM('BREAK', 'LEAVE', 'OTHER'),
        allowNull: false,
        defaultValue: 'OTHER'
      },
      reason: { type: Sequelize.STRING, allowNull: true },
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

    await queryInterface.addIndex('doctor_unavailabilities', ['doctor_id', 'start_at', 'end_at']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('doctor_unavailabilities');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_doctor_unavailabilities_type";');
  }
};
