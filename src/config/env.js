'use strict';

const REQUIRED = ['DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_SECRET'];

// Fail fast at startup instead of on the first request.
function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const secret = process.env.JWT_SECRET;
  const insecure = secret.length < 32 || secret.startsWith('change_this');
  if (insecure) {
    const msg = 'JWT_SECRET must be a random string of at least 32 characters.';
    if (process.env.NODE_ENV === 'production') throw new Error(msg);
    // eslint-disable-next-line no-console
    console.warn(`WARNING: ${msg} (allowed outside production)`);
  }
}

module.exports = { validateEnv };
