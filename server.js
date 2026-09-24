'use strict';

require('dotenv').config();

const { validateEnv } = require('./src/config/env');

validateEnv();

const app = require('./src/app');
const db = require('./src/models');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await db.sequelize.authenticate();
    // eslint-disable-next-line no-console
    console.log('Database connection established successfully.');

    const server = app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on http://localhost:${PORT} (docs: /api-docs)`);
    });

    // Graceful shutdown: stop accepting connections, let in-flight requests
    // finish, then close the DB pool.
    const shutdown = (signal) => {
      // eslint-disable-next-line no-console
      console.log(`${signal} received, shutting down...`);
      server.close(async () => {
        await db.sequelize.close();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Unable to connect to the database:', err.message);
    process.exit(1);
  }
}

start();

process.on('unhandledRejection', (err) => {
  // eslint-disable-next-line no-console
  console.error('UNHANDLED REJECTION:', err);
  process.exit(1);
});
