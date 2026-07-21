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
 * PROVIDER-BACKED (HTTP 503 when credentials are not configured):
 *   GET  /api/backlog/integrations/google-calendar/events  (GOOGLE_CALENDAR_CLIENT_ID/SECRET/REFRESH_TOKEN)
 *   GET  /api/backlog/integrations/outlook/events          (OUTLOOK_CLIENT_ID/SECRET/REFRESH_TOKEN)
 *   POST /api/backlog/integrations/slack/notify            (SLACK_WEBHOOK_URL)
 *   POST /api/backlog/integrations/email/send              (SMTP_HOST)
 *   GET  /api/backlog/integrations/google-fit/summary      (GOOGLE_FIT_ACCESS_TOKEN)
 *   POST /api/backlog/integrations/apple-health/summary    (consented client upload)
 *   GET  /api/backlog/integrations/apple-health/summary    (stored summaries)
 *   GET  /api/backlog/integrations/history                 (per-user audit trail)
 *
 * Durable integration tables are created by migrations/002_integrations_and_tasks.sql.
 */
const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const integrations = require('../services/integrationService');

const router = express.Router();

async function recordSync(userId, provider, direction, operation, status, details = {}) {
  try {
    await pool.query(
      `INSERT INTO integration_sync_events
       (user_id, provider, direction, operation, external_id, status, item_count, error_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [userId, provider, direction, operation, details.external_id || null, status, details.item_count || 0, details.error_code || null]
    );
  } catch (error) {
    console.warn('[integrations] audit write failed:', error.message);
  }
}

function integrationFailure(res, error) {
  const status = Number.isInteger(error.status) ? error.status : 502;
  res.status(status).json({
    error: error.message || 'Integration request failed',
    code: error.code || 'INTEGRATION_ERROR'
  });
}

function assertPersonalProviderOwner(req) {
  const ownerId = Number.parseInt(process.env.INTEGRATION_OWNER_USER_ID, 10);
  if (!Number.isFinite(ownerId)) {
    throw new integrations.IntegrationError('TENANT_NOT_CONFIGURED', 'INTEGRATION_OWNER_USER_ID is not configured', 503);
  }
  if (req.user.id !== ownerId) {
    throw new integrations.IntegrationError('TENANT_FORBIDDEN', 'This provider connection is not assigned to the current user', 403);
  }
}

function requestHash(value) {
  const stable = (input) => {
    if (Array.isArray(input)) return input.map(stable);
    if (input && typeof input === 'object') {
      return Object.keys(input).sort().reduce((result, key) => {
        result[key] = stable(input[key]);
        return result;
      }, {});
    }
    return input;
  };
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

async function reserveIdempotency(userId, provider, operation, key, payload) {
  if (!key || String(key).length > 200) throw new integrations.IntegrationError('INVALID_INPUT', 'idempotency_key is required and must be at most 200 characters', 400);
  const hash = requestHash(payload);
  const inserted = await pool.query(
    `INSERT INTO integration_idempotency_keys
     (user_id, provider, operation, idempotency_key, request_hash, status)
     VALUES ($1,$2,$3,$4,$5,'processing') ON CONFLICT DO NOTHING RETURNING id`,
    [userId, provider, operation, key, hash]
  );
  if (inserted.rows.length) return { id: inserted.rows[0].id, hash, cached: null };
  const existing = await pool.query(
    `SELECT id, request_hash, status, response_payload, updated_at FROM integration_idempotency_keys
     WHERE user_id=$1 AND provider=$2 AND operation=$3 AND idempotency_key=$4`,
    [userId, provider, operation, key]
  );
  const row = existing.rows[0];
  if (!row || row.request_hash !== hash) throw new integrations.IntegrationError('IDEMPOTENCY_CONFLICT', 'idempotency_key was already used with different input', 409);
  if (row.status === 'succeeded') return { id: row.id, hash, cached: row.response_payload };
  if (row.status === 'processing' && Date.now() - new Date(row.updated_at).getTime() < 5 * 60 * 1000) {
    throw new integrations.IntegrationError('IN_PROGRESS', 'A request with this idempotency_key is already processing', 409);
  }
  await pool.query(`UPDATE integration_idempotency_keys SET status='processing', updated_at=NOW() WHERE id=$1`, [row.id]);
  return { id: row.id, hash, cached: null };
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

// ----- Provider-backed integrations ----------------------------------
router.get('/integrations/google-calendar/events', async (req, res) => {
  try {
    assertPersonalProviderOwner(req);
    const events = await integrations.listGoogleCalendarEvents(req.query);
    await recordSync(req.user.id, 'google-calendar', 'inbound', 'list-events', 'succeeded', { item_count: events.length });
    res.json({ events, provider: 'google-calendar' });
  } catch (error) {
    await recordSync(req.user.id, 'google-calendar', 'inbound', 'list-events', 'failed', { error_code: error.code });
    integrationFailure(res, error);
  }
});

router.get('/integrations/outlook/events', async (req, res) => {
  try {
    assertPersonalProviderOwner(req);
    const events = await integrations.listOutlookEvents(req.query);
    await recordSync(req.user.id, 'outlook', 'inbound', 'list-events', 'succeeded', { item_count: events.length });
    res.json({ events, provider: 'outlook' });
  } catch (error) {
    await recordSync(req.user.id, 'outlook', 'inbound', 'list-events', 'failed', { error_code: error.code });
    integrationFailure(res, error);
  }
});

router.post('/integrations/:provider/events', async (req, res) => {
  const provider = req.params.provider;
  const adapters = {
    'google-calendar': integrations.upsertGoogleCalendarEvent,
    outlook: integrations.upsertOutlookEvent
  };
  if (!adapters[provider]) return res.status(404).json({ error: 'Unsupported calendar provider' });
  let reservation;
  try {
    assertPersonalProviderOwner(req);
    const { idempotency_key, ...event } = req.body || {};
    reservation = await reserveIdempotency(req.user.id, provider, 'upsert-event', idempotency_key, event);
    if (reservation.cached) return res.json({ event: reservation.cached, provider, replayed: true });
    const result = await adapters[provider](event);
    await pool.query(
      `UPDATE integration_idempotency_keys SET status='succeeded', response_payload=$1::jsonb, updated_at=NOW() WHERE id=$2`,
      [JSON.stringify(result), reservation.id]
    );
    await recordSync(req.user.id, provider, 'outbound', 'upsert-event', 'succeeded', { external_id: result.id, item_count: 1 });
    res.status(event.external_id ? 200 : 201).json({ event: result, provider, replayed: false });
  } catch (error) {
    if (reservation?.id) {
      await pool.query(`UPDATE integration_idempotency_keys SET status='failed', updated_at=NOW() WHERE id=$1`, [reservation.id]).catch(() => {});
    }
    await recordSync(req.user.id, provider, 'outbound', 'upsert-event', 'failed', { error_code: error.code });
    integrationFailure(res, error);
  }
});

router.post('/integrations/slack/notify', async (req, res) => {
  try {
    const result = await integrations.sendSlackNotification(req.body || {});
    await recordSync(req.user.id, 'slack', 'outbound', 'notify', 'succeeded', { item_count: 1 });
    res.json({ status: 'delivered', provider: 'slack', ...result });
  } catch (error) {
    await recordSync(req.user.id, 'slack', 'outbound', 'notify', 'failed', { error_code: error.code });
    integrationFailure(res, error);
  }
});

router.post('/integrations/email/send', async (req, res) => {
  try {
    const result = await integrations.sendEmail(req.body || {});
    await recordSync(req.user.id, 'smtp', 'outbound', 'send-email', 'succeeded', { external_id: result.message_id, item_count: 1 });
    res.json({ status: 'delivered', provider: 'smtp', ...result });
  } catch (error) {
    await recordSync(req.user.id, 'smtp', 'outbound', 'send-email', 'failed', { error_code: error.code });
    integrationFailure(res, error);
  }
});

router.get('/integrations/google-fit/summary', async (req, res) => {
  try {
    assertPersonalProviderOwner(req);
    const summary = await integrations.getGoogleFitSummary(req.query);
    await recordSync(req.user.id, 'google-fit', 'inbound', 'activity-summary', 'succeeded', { item_count: 1 });
    res.json({ summary, provider: 'google-fit' });
  } catch (error) {
    await recordSync(req.user.id, 'google-fit', 'inbound', 'activity-summary', 'failed', { error_code: error.code });
    integrationFailure(res, error);
  }
});

// HealthKit has no server-side REST API. Authenticated clients upload consented,
// minimized daily summaries instead of sharing an all-purpose bearer token.
router.post('/integrations/apple-health/summary', async (req, res) => {
  const { summary_date, steps = null, active_minutes = null, sleep_minutes = null, resting_heart_rate = null, source_record_id = null } = req.body || {};
  if (!summary_date || Number.isNaN(Date.parse(summary_date))) return res.status(400).json({ error: 'valid summary_date is required' });
  if (!source_record_id || String(source_record_id).length > 200) return res.status(400).json({ error: 'source_record_id is required for idempotent ingestion' });
  const numeric = { steps, active_minutes, sleep_minutes, resting_heart_rate };
  if (Object.values(numeric).some((value) => value !== null && (!Number.isFinite(Number(value)) || Number(value) < 0))) {
    return res.status(400).json({ error: 'health summary values must be non-negative numbers' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO health_activity_summaries
       (user_id, provider, summary_date, steps, active_minutes, sleep_minutes, resting_heart_rate, source_record_id)
       VALUES ($1,'apple-health',$2,$3,$4,$5,$6,$7)
       ON CONFLICT (user_id, provider, summary_date, source_record_id)
       DO UPDATE SET steps=EXCLUDED.steps, active_minutes=EXCLUDED.active_minutes,
                     sleep_minutes=EXCLUDED.sleep_minutes, resting_heart_rate=EXCLUDED.resting_heart_rate,
                     recorded_at=NOW()
       RETURNING id, provider, summary_date, steps, active_minutes, sleep_minutes, resting_heart_rate, recorded_at`,
      [req.user.id, summary_date, steps, active_minutes, sleep_minutes, resting_heart_rate, source_record_id]
    );
    await recordSync(req.user.id, 'apple-health', 'inbound', 'activity-summary', 'succeeded', { external_id: source_record_id, item_count: 1 });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Unable to store health summary' });
  }
});

router.get('/integrations/apple-health/summary', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, provider, summary_date, steps, active_minutes, sleep_minutes, resting_heart_rate, recorded_at
       FROM health_activity_summaries WHERE user_id=$1 AND provider='apple-health'
       ORDER BY summary_date DESC LIMIT 31`,
      [req.user.id]
    );
    res.json({ items: result.rows, provider: 'apple-health' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load health summaries' });
  }
});

router.get('/integrations/history', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT provider, direction, operation, external_id, status, item_count, error_code, created_at
       FROM integration_sync_events WHERE user_id=$1 ORDER BY id DESC LIMIT 100`,
      [req.user.id]
    );
    res.json({ items: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load integration history' });
  }
});

module.exports = router;
