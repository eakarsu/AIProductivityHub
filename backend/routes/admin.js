const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Admin middleware
const adminMiddleware = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!result.rows[0]?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Dashboard stats
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE last_login > NOW() - INTERVAL '24 hours') as active_users_24h,
        (SELECT COUNT(*) FROM bookmarks) as total_bookmarks,
        (SELECT COUNT(*) FROM files) as total_files,
        (SELECT COUNT(*) FROM passwords) as total_passwords,
        (SELECT COUNT(*) FROM focus_sessions) as total_sessions,
        (SELECT COUNT(*) FROM feedback WHERE status = 'pending') as pending_feedback,
        (SELECT COUNT(*) FROM contact_messages WHERE status = 'new') as new_messages,
        (SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours') as actions_24h
    `);
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = `SELECT id, email, name, email_verified, is_admin, onboarding_completed, last_login, created_at
                 FROM users WHERE 1=1`;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (email ILIKE $${params.length} OR name ILIKE $${params.length})`;
    }

    const countResult = await pool.query(query.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) FROM'), params);

    query += ' ORDER BY created_at DESC';
    params.push(limit);
    query += ` LIMIT $${params.length}`;
    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get audit logs
router.get('/audit-logs', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT a.*, u.email as user_email, u.name as user_name
       FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM audit_logs');

    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all feedback
router.get('/feedback', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, u.email as user_email, u.name as user_name
       FROM feedback f LEFT JOIN users u ON f.user_id = u.id
       ORDER BY f.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update feedback status
router.put('/feedback/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, admin_response } = req.body;
    const result = await pool.query(
      'UPDATE feedback SET status = $1, admin_response = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [status, admin_response, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update feedback error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
