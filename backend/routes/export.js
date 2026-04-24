const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Export bookmarks
router.get('/bookmarks', authMiddleware, async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const result = await pool.query(
      'SELECT title, url, description, category, tags, ai_category, ai_summary, created_at FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    if (format === 'csv') {
      const csv = ['Title,URL,Description,Category,AI Category,Tags,Created At'];
      result.rows.forEach(row => {
        csv.push(`"${row.title}","${row.url}","${(row.description || '').replace(/"/g, '""')}","${row.category || ''}","${row.ai_category || ''}","${(row.tags || []).join(';')}","${row.created_at}"`);
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=bookmarks.csv');
      return res.send(csv.join('\n'));
    }

    res.setHeader('Content-Disposition', 'attachment; filename=bookmarks.json');
    res.json(result.rows);
  } catch (error) {
    console.error('Export bookmarks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export passwords audit
router.get('/passwords', authMiddleware, async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const result = await pool.query(
      'SELECT site_name, site_url, username, password_strength, strength_score, has_2fa, is_reused, breach_status, last_changed, ai_recommendation FROM passwords WHERE user_id = $1 ORDER BY strength_score ASC',
      [req.user.id]
    );

    if (format === 'csv') {
      const csv = ['Site,URL,Username,Strength,Score,2FA,Reused,Breach Status,Last Changed'];
      result.rows.forEach(row => {
        csv.push(`"${row.site_name}","${row.site_url || ''}","${row.username || ''}","${row.password_strength || ''}",${row.strength_score || 0},${row.has_2fa},${row.is_reused},"${row.breach_status}","${row.last_changed || ''}"`);
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=password-audit.csv');
      return res.send(csv.join('\n'));
    }

    res.setHeader('Content-Disposition', 'attachment; filename=password-audit.json');
    res.json(result.rows);
  } catch (error) {
    console.error('Export passwords error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export files
router.get('/files', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT filename, filepath, extension, size_bytes, current_folder, suggested_folder, ai_category, status FROM files WHERE user_id = $1',
      [req.user.id]
    );
    res.setHeader('Content-Disposition', 'attachment; filename=files.json');
    res.json(result.rows);
  } catch (error) {
    console.error('Export files error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export screen time
router.get('/screen-time', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT app_name, category, daily_limit_minutes, actual_usage_minutes, date, productivity_score, is_blocked FROM screen_time WHERE user_id = $1 ORDER BY date DESC',
      [req.user.id]
    );
    res.setHeader('Content-Disposition', 'attachment; filename=screen-time.json');
    res.json(result.rows);
  } catch (error) {
    console.error('Export screen time error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export all data
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const bookmarks = await pool.query('SELECT * FROM bookmarks WHERE user_id = $1', [req.user.id]);
    const files = await pool.query('SELECT * FROM files WHERE user_id = $1', [req.user.id]);
    const passwords = await pool.query('SELECT site_name, site_url, username, password_strength, strength_score, has_2fa, is_reused, breach_status FROM passwords WHERE user_id = $1', [req.user.id]);
    const screenTime = await pool.query('SELECT * FROM screen_time WHERE user_id = $1', [req.user.id]);
    const focusSessions = await pool.query('SELECT * FROM focus_sessions WHERE user_id = $1', [req.user.id]);

    res.setHeader('Content-Disposition', 'attachment; filename=all-data.json');
    res.json({
      exportDate: new Date().toISOString(),
      bookmarks: bookmarks.rows,
      files: files.rows,
      passwords: passwords.rows,
      screenTime: screenTime.rows,
      focusSessions: focusSessions.rows
    });
  } catch (error) {
    console.error('Export all error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
