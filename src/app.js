'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const db = require('./models');
const swaggerSpec = require('./docs/swagger');
const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');
const AppError = require('./utils/AppError');

const app = express();

// Needed for correct client IPs (rate limiting, logs) behind a proxy / LB.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
}

app.use(helmet());
// CORS_ORIGIN: comma-separated allow-list, e.g. "https://app.example.com".
// Unset = allow all origins (convenient for local development only).
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : true
  })
);
app.use(express.json({ limit: '10kb' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.get('/health', async (req, res) => {
  try {
    await db.sequelize.authenticate();
    res.status(200).json({ success: true, message: 'Doctor Booking API is running', data: { database: 'up' } });
  } catch {
    res.status(503).json({ success: false, message: 'Database unavailable' });
  }
});


if (process.env.ENABLE_API_DOCS !== 'false') {
  app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Doctor Booking API Docs',
      swaggerOptions: { persistAuthorization: true }
    })
  );
}

app.use('/api', apiLimiter, apiRoutes);

app.all('*', (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.path}`, 404));
});

app.use(errorHandler);

module.exports = app;
