'use strict';

module.exports = (sequelize, DataTypes) => {
  const ClinicSetting = sequelize.define(
    'ClinicSetting',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      timezone: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Asia/Kolkata'
      }
    },
    {
      tableName: 'clinic_settings',
      underscored: true
    }
  );

  return ClinicSetting;
};
