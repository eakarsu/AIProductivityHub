const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const STATUSES = new Set(['backlog', 'planned', 'in_progress', 'blocked', 'completed', 'cancelled']);
const PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);
const TRANSITIONS = {
  backlog: new Set(['planned', 'in_progress', 'cancelled']),
  planned: new Set(['backlog', 'in_progress', 'blocked', 'cancelled']),
  in_progress: new Set(['planned', 'blocked', 'completed', 'cancelled']),
  blocked: new Set(['planned', 'in_progress', 'cancelled']),
  completed: new Set(['in_progress']),
  cancelled: new Set(['backlog'])
};

function parseLimit(value, fallback = 50) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : fallback;
}

function validateFields(body, { creating = false } = {}) {
  const errors = [];
  if (creating && (!body.title || !String(body.title).trim())) errors.push('title is required');
  if (body.title !== undefined && String(body.title).trim().length > 500) errors.push('title is too long');
  if (body.status !== undefined && !STATUSES.has(body.status)) errors.push('invalid status');
  if (body.priority !== undefined && !PRIORITIES.has(body.priority)) errors.push('invalid priority');
  if (body.due_at !== undefined && body.due_at !== null && Number.isNaN(Date.parse(body.due_at))) errors.push('invalid due_at');
  return errors;
}

router.get('/', async (req, res) => {
  const values = [req.user.id];
  const where = ['user_id = $1'];
  if (req.query.status) {
    if (!STATUSES.has(req.query.status)) return res.status(400).json({ error: 'invalid status' });
    values.push(req.query.status);
    where.push(`status = $${values.length}`);
  }
  if (req.query.search) {
    values.push(`%${String(req.query.search).slice(0, 200)}%`);
    where.push(`(title ILIKE $${values.length} OR description ILIKE $${values.length})`);
  }
  values.push(parseLimit(req.query.limit));
  try {
    const result = await pool.query(
      `SELECT * FROM tasks WHERE ${where.join(' AND ')}
       ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
                due_at NULLS LAST, id DESC
       LIMIT $${values.length}`,
      values
    );
    res.json({ items: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Unable to list tasks' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Task not found' });
    const events = await pool.query(
      'SELECT event_type, from_status, to_status, payload, created_at FROM task_events WHERE task_id = $1 AND user_id = $2 ORDER BY id ASC',
      [req.params.id, req.user.id]
    );
    res.json({ ...result.rows[0], events: events.rows });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load task' });
  }
});

router.post('/', async (req, res) => {
  const errors = validateFields(req.body || {}, { creating: true });
  if (errors.length) return res.status(400).json({ error: errors.join(', ') });
  const { title, description = null, priority = 'medium', due_at = null } = req.body;
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO tasks (user_id, title, description, priority, due_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, String(title).trim(), description, priority, due_at]
    );
    await client.query(
      `INSERT INTO task_events (task_id, user_id, event_type, to_status, payload)
       VALUES ($1, $2, 'created', 'backlog', $3::jsonb)`,
      [result.rows[0].id, req.user.id, JSON.stringify({ priority, due_at })]
    );
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    res.status(500).json({ error: 'Unable to create task' });
  } finally {
    if (client) client.release();
  }
});

router.put('/:id', async (req, res) => {
  const errors = validateFields(req.body || {});
  if (errors.length) return res.status(400).json({ error: errors.join(', ') });
  const version = Number.parseInt(req.body.version, 10);
  if (!Number.isFinite(version)) return res.status(400).json({ error: 'version is required for updates' });
  const fields = ['title', 'description', 'priority', 'due_at'];
  const updates = [];
  const values = [];
  for (const field of fields) {
    if (req.body[field] !== undefined) {
      values.push(field === 'title' ? String(req.body[field]).trim() : req.body[field]);
      updates.push(`${field} = $${values.length}`);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No editable fields supplied' });
  values.push(req.params.id, req.user.id, version);
  try {
    const result = await pool.query(
      `UPDATE tasks SET ${updates.join(', ')}, version = version + 1, updated_at = NOW()
       WHERE id = $${values.length - 2} AND user_id = $${values.length - 1} AND version = $${values.length}
       RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(409).json({ error: 'Task changed or no longer exists; reload and retry' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Unable to update task' });
  }
});

router.post('/:id/transition', async (req, res) => {
  const { status: nextStatus, version, reason = null } = req.body || {};
  if (!STATUSES.has(nextStatus)) return res.status(400).json({ error: 'invalid status' });
  const expectedVersion = Number.parseInt(version, 10);
  if (!Number.isFinite(expectedVersion)) return res.status(400).json({ error: 'version is required' });
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const current = await client.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [req.params.id, req.user.id]
    );
    if (!current.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Task not found' });
    }
    const task = current.rows[0];
    if (task.version !== expectedVersion) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Task changed; reload and retry' });
    }
    if (!TRANSITIONS[task.status].has(nextStatus)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Cannot transition ${task.status} to ${nextStatus}` });
    }
    const updated = await client.query(
      `UPDATE tasks SET status = $1::varchar,
         completed_at = CASE WHEN $1::varchar = 'completed' THEN NOW() ELSE NULL END,
         version = version + 1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [nextStatus, task.id]
    );
    await client.query(
      `INSERT INTO task_events (task_id, user_id, event_type, from_status, to_status, payload)
       VALUES ($1, $2, 'transitioned', $3, $4, $5::jsonb)`,
      [task.id, req.user.id, task.status, nextStatus, JSON.stringify({ reason })]
    );
    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Task transition failed:', error);
    res.status(500).json({ error: 'Unable to transition task' });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
