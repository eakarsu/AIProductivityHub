const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Get user settings
router.get('/', authMiddleware, async (req, res) => {
  try {
    let result = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [req.user.id]);

    if (result.rows.length === 0) {
      await pool.query('INSERT INTO user_settings (user_id) VALUES ($1)', [req.user.id]);
      result = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [req.user.id]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update settings
router.put('/', authMiddleware, async (req, res) => {
  try {
    const {
      theme, notifications_enabled, email_notifications, sound_enabled,
      compact_view, items_per_page, keyboard_shortcuts, two_factor_enabled,
      auto_categorize, default_focus_duration, default_break_duration
    } = req.body;

    const result = await pool.query(
      `UPDATE user_settings SET
        theme = COALESCE($1, theme),
        notifications_enabled = COALESCE($2, notifications_enabled),
        email_notifications = COALESCE($3, email_notifications),
        sound_enabled = COALESCE($4, sound_enabled),
        compact_view = COALESCE($5, compact_view),
        items_per_page = COALESCE($6, items_per_page),
        keyboard_shortcuts = COALESCE($7, keyboard_shortcuts),
        two_factor_enabled = COALESCE($8, two_factor_enabled),
        auto_categorize = COALESCE($9, auto_categorize),
        default_focus_duration = COALESCE($10, default_focus_duration),
        default_break_duration = COALESCE($11, default_break_duration),
        updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $12
       RETURNING *`,
      [theme, notifications_enabled, email_notifications, sound_enabled,
       compact_view, items_per_page, keyboard_shortcuts, two_factor_enabled,
       auto_categorize, default_focus_duration, default_break_duration, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
