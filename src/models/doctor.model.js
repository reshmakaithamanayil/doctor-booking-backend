'use strict';

module.exports = (sequelize, DataTypes) => {
  const Doctor = sequelize.define(
    'Doctor',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING, allowNull: false },
      specialization: { type: DataTypes.STRING, allowNull: true },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: { isEmail: true }
      },
      phone: { type: DataTypes.STRING, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
    },
    {
      tableName: 'doctors',
      underscored: true
    }
  );

  Doctor.associate = (models) => {
    Doctor.hasMany(models.DoctorAvailability, { foreignKey: 'doctorId', as: 'availabilities' });
    Doctor.hasMany(models.DoctorUnavailability, { foreignKey: 'doctorId', as: 'unavailabilities' });
    Doctor.hasMany(models.Appointment, { foreignKey: 'doctorId', as: 'appointments' });
  };

  return Doctor;
};
