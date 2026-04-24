const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { validateProfileUpdate } = require('../middleware/validate');
const router = express.Router();

// Get user profile
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, avatar_url, bio, phone, timezone, language,
              email_verified, is_admin, onboarding_completed, last_login, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get stats
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM bookmarks WHERE user_id = $1) as bookmarks_count,
        (SELECT COUNT(*) FROM files WHERE user_id = $1) as files_count,
        (SELECT COUNT(*) FROM passwords WHERE user_id = $1) as passwords_count,
        (SELECT COUNT(*) FROM focus_sessions WHERE user_id = $1 AND status = 'completed') as sessions_completed,
        (SELECT COALESCE(SUM(actual_usage_minutes), 0) FROM screen_time WHERE user_id = $1 AND date = CURRENT_DATE) as today_screen_time
    `, [req.user.id]);

    res.json({ profile: result.rows[0], stats: stats.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/', authMiddleware, validateProfileUpdate, async (req, res) => {
  try {
    const { name, bio, phone, timezone, language, avatar_url } = req.body;

    const result = await pool.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        bio = COALESCE($2, bio),
        phone = COALESCE($3, phone),
        timezone = COALESCE($4, timezone),
        language = COALESCE($5, language),
        avatar_url = COALESCE($6, avatar_url),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, email, name, avatar_url, bio, phone, timezone, language, email_verified, is_admin, created_at`,
      [name, bio, phone, timezone, language, avatar_url, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Complete onboarding
router.post('/complete-onboarding', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE users SET onboarding_completed = TRUE WHERE id = $1', [req.user.id]);
    res.json({ message: 'Onboarding completed' });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
