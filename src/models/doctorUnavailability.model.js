'use strict';

module.exports = (sequelize, DataTypes) => {
  const DoctorUnavailability = sequelize.define(
    'DoctorUnavailability',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      doctorId: { type: DataTypes.INTEGER, allowNull: false },
      startAt: { type: DataTypes.DATE, allowNull: false },
      endAt: { type: DataTypes.DATE, allowNull: false },
      type: {
        type: DataTypes.ENUM('BREAK', 'LEAVE', 'OTHER'),
        allowNull: false,
        defaultValue: 'OTHER'
      },
      reason: { type: DataTypes.STRING, allowNull: true }
    },
    {
      tableName: 'doctor_unavailabilities',
      underscored: true
    }
  );

  DoctorUnavailability.associate = (models) => {
    DoctorUnavailability.belongsTo(models.Doctor, { foreignKey: 'doctorId', as: 'doctor' });
  };

  return DoctorUnavailability;
};
