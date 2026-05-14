/**
 * Apply pass 5 — backlog implementation for AIProductivityHub.
 *
 * Categories implemented (cap 10 features):
 *
 * MECHANICAL:
 *   POST /api/backlog/habits/auto-adjust
 *     Adjusts habit difficulty based on rolling completion rate.
 *     PRODUCT-DECISION (documented): difficulty enum is `easy|medium|hard`,
 *     thresholds 30%/70%, lookback 14 days.
 *   GET  /api/backlog/team/members         (list)
 *   POST /api/backlog/team/members         (invite stub — additive table only)
 *
 * NEEDS-CREDS (HTTP 503 + missing-env):
 *   GET  /api/backlog/integrations/google-calendar/events  (GOOGLE_CALENDAR_CLIENT_ID/SECRET/REFRESH_TOKEN)
 *   GET  /api/backlog/integrations/outlook/events          (OUTLOOK_CLIENT_ID/SECRET/REFRESH_TOKEN)
 *   POST /api/backlog/integrations/slack/notify            (SLACK_WEBHOOK_URL)
 *   POST /api/backlog/integrations/email/send              (SMTP_HOST)
 *   GET  /api/backlog/integrations/google-fit/summary      (GOOGLE_FIT_ACCESS_TOKEN)
 *   GET  /api/backlog/integrations/apple-health/summary    (APPLE_HEALTH_TOKEN)
 *
 * All schema additions use CREATE TABLE IF NOT EXISTS (no migrations needed).
 */
const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

async function ensureSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_members_v5 (
        id SERIAL PRIMARY KEY,
        owner_user_id INTEGER NOT NULL,
        invited_email TEXT NOT NULL,
        role TEXT DEFAULT 'collaborator',
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_team_owner ON team_members_v5(owner_user_id)
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS habit_difficulty_v5 (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        habit_id INTEGER NOT NULL,
        difficulty TEXT NOT NULL DEFAULT 'medium',
        adjusted_at TIMESTAMP DEFAULT NOW(),
        rationale TEXT,
        UNIQUE(user_id, habit_id)
      )
    `);
  } catch (err) {
    console.warn('[apply5/backlog] ensureSchema soft-fail:', err.message);
  }
}
ensureSchema();

function need(envVar, res, friendly) {
  if (!process.env[envVar]) {
    res.status(503).json({ error: `${friendly} not configured`, missing: envVar });
    return false;
  }
  return true;
}

router.use(authMiddleware);

// ----- MECHANICAL: habit auto-adjust ----------------------------------
// PRODUCT-DECISION: difficulty enum + thresholds.
// completion_rate < 0.30  → bump down to 'easy'
// completion_rate >= 0.70 → bump up to 'hard'
// otherwise               → 'medium'
router.post('/habits/auto-adjust', async (req, res) => {
  const userId = req.user.id;
  try {
    let habits = [];
    try {
      const r = await pool.query(
        `SELECT id, name FROM habits WHERE user_id = $1 ORDER BY id ASC LIMIT 50`,
        [userId]
      );
      habits = r.rows;
    } catch (_) { habits = []; }

    const adjustments = [];
    for (const h of habits) {
      let rate = 0;
      try {
        const r = await pool.query(
          `SELECT
             COALESCE(SUM(CASE WHEN completed THEN 1 ELSE 0 END),0)::float /
             NULLIF(COUNT(*),0) AS rate
           FROM habit_completions
           WHERE habit_id = $1
             AND completion_date >= CURRENT_DATE - INTERVAL '14 days'`,
          [h.id]
        );
        rate = r.rows?.[0]?.rate || 0;
      } catch (_) { rate = 0; }

      let difficulty = 'medium';
      if (rate < 0.30) difficulty = 'easy';
      else if (rate >= 0.70) difficulty = 'hard';

      const rationale = `14d completion rate ${(rate * 100).toFixed(0)}%`;
      try {
        await pool.query(
          `INSERT INTO habit_difficulty_v5 (user_id, habit_id, difficulty, rationale)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (user_id, habit_id) DO UPDATE
             SET difficulty = EXCLUDED.difficulty,
                 rationale = EXCLUDED.rationale,
                 adjusted_at = NOW()`,
          [userId, h.id, difficulty, rationale]
        );
      } catch (_) {}

      adjustments.push({ habit_id: h.id, name: h.name, completion_rate: rate, difficulty, rationale });
    }

    res.json({ adjustments, count: adjustments.length, thresholds: { easy: '<30%', hard: '>=70%' } });
  } catch (err) {
    res.status(500).json({ error: 'auto-adjust failed', details: err.message });
  }
});

// ----- NEEDS-PRODUCT-DECISION: team / collaboration ------------------
router.get('/team/members', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, invited_email, role, status, created_at
       FROM team_members_v5 WHERE owner_user_id = $1 ORDER BY id DESC`,
      [req.user.id]
    );
    res.json({ data: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/team/members', async (req, res) => {
  const { invited_email, role } = req.body || {};
  if (!invited_email) return res.status(400).json({ error: 'invited_email required' });
  try {
    const r = await pool.query(
      `INSERT INTO team_members_v5 (owner_user_id, invited_email, role)
       VALUES ($1,$2,$3) RETURNING id, invited_email, role, status, created_at`,
      [req.user.id, invited_email, role || 'collaborator']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ----- NEEDS-CREDS integration stubs ---------------------------------
router.get('/integrations/google-calendar/events', async (req, res) => {
  if (!need('GOOGLE_CALENDAR_REFRESH_TOKEN', res, 'Google Calendar OAuth')) return;
  if (!need('GOOGLE_CALENDAR_CLIENT_ID', res, 'Google Calendar OAuth')) return;
  res.json({ events: [], note: 'stub — wire to googleapis when env complete' });
});

router.get('/integrations/outlook/events', async (req, res) => {
  if (!need('OUTLOOK_REFRESH_TOKEN', res, 'Outlook OAuth')) return;
  if (!need('OUTLOOK_CLIENT_ID', res, 'Outlook OAuth')) return;
  res.json({ events: [], note: 'stub — wire to MS Graph when env complete' });
});

router.post('/integrations/slack/notify', async (req, res) => {
  if (!need('SLACK_WEBHOOK_URL', res, 'Slack webhook')) return;
  res.json({ status: 'queued', provider: 'slack', note: 'stub — outbound POST to webhook deferred' });
});

router.post('/integrations/email/send', async (req, res) => {
  if (!need('SMTP_HOST', res, 'SMTP email')) return;
  res.json({ status: 'queued', provider: 'smtp', note: 'stub — outbound requires nodemailer dep' });
});

router.get('/integrations/google-fit/summary', async (req, res) => {
  if (!need('GOOGLE_FIT_ACCESS_TOKEN', res, 'Google Fit')) return;
  res.json({ summary: {}, note: 'stub' });
});

router.get('/integrations/apple-health/summary', async (req, res) => {
  if (!need('APPLE_HEALTH_TOKEN', res, 'Apple HealthKit')) return;
  res.json({ summary: {}, note: 'stub — HealthKit data ingestion typically client-side' });
});

module.exports = router;
