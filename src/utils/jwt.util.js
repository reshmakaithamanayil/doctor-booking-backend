'use strict';

const jwt = require('jsonwebtoken');

const ALGORITHM = 'HS256';

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  });
}

function verifyToken(token) {
  // Pin the algorithm so tokens signed with anything else are rejected.
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: [ALGORITHM] });
}

module.exports = { signToken, verifyToken };
