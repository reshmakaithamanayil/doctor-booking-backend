'use strict';

const { body } = require('express-validator');

const emailRule = () =>
  body('email')
    .isString()
    .trim()
    .isEmail()
    .withMessage('A valid email is required')
    .isLength({ max: 254 })
    .toLowerCase();

const registerRules = [
  body('name').isString().trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  emailRule(),
  body('password')
    .isString()
    // bcrypt only uses the first 72 bytes, so reject anything longer.
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be 8-72 characters long')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain a letter')
    .matches(/\d/)
    .withMessage('Password must contain a number')
];

// Admins may additionally choose the role of the account they create.
const createUserRules = [
  ...registerRules,
  body('role')
    .optional()
    .isIn(['ADMIN', 'USER'])
    .withMessage('Role must be either ADMIN or USER')
];

const loginRules = [
  emailRule(),
  body('password').isString().notEmpty().withMessage('Password is required').isLength({ max: 72 })
];

module.exports = { registerRules, createUserRules, loginRules };
