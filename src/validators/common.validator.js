'use strict';

const { param, query } = require('express-validator');

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

const OFFSET_REGEX = /(Z|[+-]\d{2}:?\d{2})$/;

const idParam = (name) =>
  param(name).isInt({ min: 1 }).withMessage(`${name} must be a positive integer`).toInt();

const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100')
];

module.exports = { TIME_REGEX, OFFSET_REGEX, idParam, paginationRules };
