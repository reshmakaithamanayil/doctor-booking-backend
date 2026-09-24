'use strict';

module.exports = (sequelize, DataTypes) => {
  const Appointment = sequelize.define(
    'Appointment',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      doctorId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      startTime: { type: DataTypes.DATE, allowNull: false },
      endTime: { type: DataTypes.DATE, allowNull: false },
      status: {
        type: DataTypes.ENUM('BOOKED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'BOOKED'
      }
    },
    {
      tableName: 'appointments',
      underscored: true
    }
  );

  Appointment.associate = (models) => {
    Appointment.belongsTo(models.Doctor, { foreignKey: 'doctorId', as: 'doctor' });
    Appointment.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return Appointment;
};
