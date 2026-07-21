const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const production = process.env.NODE_ENV === 'production';
if (production && !process.env.DATABASE_URL && !process.env.DB_PASSWORD) {
  throw new Error('DATABASE_URL or DB_PASSWORD is required in production');
}

const pool = new Pool(process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined
} : {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ai_productivity_hub',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || (production ? undefined : 'postgres')
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

module.exports = pool;
