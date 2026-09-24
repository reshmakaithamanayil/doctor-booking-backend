'use strict';

const { verifyToken } = require('../utils/jwt.util');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const db = require('../models');

const protect = catchAsync(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    throw new AppError('You are not logged in. Please provide a valid token.', 401);
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    throw new AppError('Invalid or expired token. Please log in again.', 401);
  }

  const user = await db.User.findByPk(decoded.id);
  if (!user) {
    throw new AppError('The user belonging to this token no longer exists.', 401);
  }

  req.user = user;
  next();
});

module.exports = { protect };
