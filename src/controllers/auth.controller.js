'use strict';

const bcrypt = require('bcryptjs');
const db = require('../models');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { signToken } = require('../utils/jwt.util');


const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

const register = catchAsync(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await db.User.findOne({ where: { email } });
  if (existing) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const user = await db.User.create({ name, email, password, role: 'USER' });
  const token = signToken({ id: user.id, role: user.role });

  sendSuccess(res, {
    statusCode: 201,
    message: 'Registration successful',
    data: { user, token }
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await db.User.findOne({ where: { email } });
  const passwordOk = user
    ? await user.comparePassword(password)
    : await bcrypt.compare(password, DUMMY_HASH);
  if (!user || !passwordOk) {
    throw new AppError('Incorrect email or password.', 401);
  }

  const token = signToken({ id: user.id, role: user.role });

  sendSuccess(res, {
    message: 'Login successful',
    data: { user, token }
  });
});

const me = catchAsync(async (req, res) => {
  sendSuccess(res, { message: 'Current user', data: { user: req.user } });
});

module.exports = { register, login, me };
