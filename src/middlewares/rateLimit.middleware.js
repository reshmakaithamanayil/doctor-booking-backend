'use strict';

const rateLimit = require('express-rate-limit');

// Note: the default store is in-memory (per process). When running several
// instances behind a load balancer, plug in a shared store such as
// rate-limit-redis so limits are enforced cluster-wide.
const skip = () => process.env.NODE_ENV === 'test';

const handler = (req, res, next, options) =>
  res.status(options.statusCode).json({
    success: false,
    message: 'Too many requests, please try again later.'
  });

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX) || 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  handler
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  handler
});

module.exports = { apiLimiter, authLimiter };
