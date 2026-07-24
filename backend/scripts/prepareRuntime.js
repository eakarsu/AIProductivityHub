'use strict';

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../db');

async function main() {
  if (process.env.ALLOW_SCHEMA_MIGRATION !== 'true') throw new Error('ALLOW_SCHEMA_MIGRATION=true is required');
  await pool.query(fs.readFileSync(path.join(__dirname, '..', 'models', 'schema.sql'), 'utf8'));
  const migrationDir = path.join(__dirname, '..', 'migrations');
  if (fs.existsSync(migrationDir)) {
    for (const file of fs.readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort()) {
      await pool.query(fs.readFileSync(path.join(migrationDir, file), 'utf8'));
    }
  }
  const email = process.env.PROVISION_ADMIN_EMAIL;
  const password = process.env.PROVISION_ADMIN_PASSWORD;
  const name = process.env.PROVISION_ADMIN_NAME || 'Runtime Administrator';
  if (!email || !password) throw new Error('Provisioned administrator credentials are required');
  const hash = await bcrypt.hash(password, 12);
  const user = (await pool.query(
    `INSERT INTO users(email,password,name,email_verified,is_admin,onboarding_completed)
     VALUES($1,$2,$3,TRUE,TRUE,TRUE)
     ON CONFLICT(email) DO UPDATE SET password=EXCLUDED.password,name=EXCLUDED.name,email_verified=TRUE,is_admin=TRUE
     RETURNING id`,
    [email, hash, name]
  )).rows[0];
  await pool.query('INSERT INTO user_settings(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING', [user.id]);
}

main().then(async () => {
  const result = await pool.query('SELECT id FROM users WHERE email=$1', [process.env.PROVISION_ADMIN_EMAIL]);
  console.log(result.rows[0].id);
  await pool.end();
}).catch(async (error) => {
  console.error(error.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
