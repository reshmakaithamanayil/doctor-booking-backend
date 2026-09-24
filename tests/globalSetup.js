'use strict';

const path = require('path');
const { execSync } = require('child_process');
const { Client } = require('pg');

module.exports = async () => {
  process.env.NODE_ENV = 'test';
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const config = require('../src/config/config').test;

  const admin = new Client({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: 'postgres'
  });
  await admin.connect();
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [config.database]);
  if (!rowCount) await admin.query(`CREATE DATABASE "${config.database}"`);
  await admin.end();

  const cli = `node "${require.resolve('sequelize-cli/lib/sequelize')}"`;
  const opts = { cwd: path.join(__dirname, '..'), env: { ...process.env, NODE_ENV: 'test' }, stdio: 'pipe' };
  execSync(`${cli} db:migrate:undo:all`, opts);
  execSync(`${cli} db:migrate`, opts);
  execSync(`${cli} db:seed:all`, opts);
};
