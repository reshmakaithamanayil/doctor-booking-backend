'use strict';

const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING, allowNull: false },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
      },
      password: { type: DataTypes.STRING, allowNull: false },
      role: {
        type: DataTypes.ENUM('ADMIN', 'USER'),
        allowNull: false,
        defaultValue: 'USER'
      }
    },
    {
      tableName: 'users',
      underscored: true,
      hooks: {
        beforeCreate: async (user) => {
          user.password = await bcrypt.hash(user.password, 10);
        },
        beforeUpdate: async (user) => {
          if (user.changed('password')) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        }
      }
    }
  );

  User.prototype.comparePassword = function comparePassword(plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
  };

  User.prototype.toJSON = function toJSON() {
    const values = { ...this.get() };
    delete values.password;
    return values;
  };

  User.associate = (models) => {
    User.hasMany(models.Appointment, { foreignKey: 'userId', as: 'appointments' });
  };

  return User;
};
