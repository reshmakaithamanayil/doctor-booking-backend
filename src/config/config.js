require('dotenv').config();

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  logging: false,
  // Per-process connection pool. With N app instances the DB sees up to
  // N * DB_POOL_MAX connections, so size it against max_connections.
  pool: {
    max: Number(process.env.DB_POOL_MAX) || 10,
    min: Number(process.env.DB_POOL_MIN) || 0,
    acquire: 30000,
    idle: 10000
  }
};

module.exports = {
  development: { ...base },
  test: {
    ...base,
    database: process.env.DB_NAME_TEST || `${process.env.DB_NAME}_test`
  },
  production: {
    ...base,
    dialectOptions: {
      ssl:
        process.env.DB_SSL === 'true'
          ? { require: true, rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
          : false
    }
  }
};
