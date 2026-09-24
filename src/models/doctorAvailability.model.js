'use strict';

module.exports = (sequelize, DataTypes) => {
  const DoctorAvailability = sequelize.define(
    'DoctorAvailability',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      doctorId: { type: DataTypes.INTEGER, allowNull: false },
     
      dayOfWeek: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 0, max: 6 }
      },
      
      startTime: { type: DataTypes.TIME, allowNull: false },
      endTime: { type: DataTypes.TIME, allowNull: false },
      slotDurationMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30,
        validate: { min: 5, max: 480 }
      },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
    },
    {
      tableName: 'doctor_availabilities',
      underscored: true
    }
  );

  DoctorAvailability.associate = (models) => {
    DoctorAvailability.belongsTo(models.Doctor, { foreignKey: 'doctorId', as: 'doctor' });
  };

  return DoctorAvailability;
};
