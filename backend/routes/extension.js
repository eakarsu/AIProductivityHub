const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// All extension routes require authentication
router.use(auth);

// POST /api/extension/bookmarks/import - Import bookmarks from browser extension
router.post('/bookmarks/import', async (req, res) => {
  try {
    const { bookmarks } = req.body;
    if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
      return res.status(400).json({ error: 'bookmarks array is required' });
    }

    const imported = [];
    for (const bm of bookmarks) {
      const result = await pool.query(
        `INSERT INTO bookmarks (user_id, title, url, description, tags, category, source)
         VALUES ($1, $2, $3, $4, $5, $6, 'extension')
         ON CONFLICT (user_id, url) DO UPDATE SET title = EXCLUDED.title, updated_at = NOW()
         RETURNING *`,
        [req.user.id, bm.title || '', bm.url, bm.description || '', bm.tags || '', bm.category || 'Uncategorized']
      );
      imported.push(result.rows[0]);
    }

    res.json({ imported: imported.length, bookmarks: imported });
  } catch (error) {
    console.error('Extension bookmark import error:', error);
    res.status(500).json({ error: 'Import failed' });
  }
});

// POST /api/extension/bookmarks/quick-save - Quick save current page
router.post('/bookmarks/quick-save', async (req, res) => {
  try {
    const { url, title, description } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const result = await pool.query(
      `INSERT INTO bookmarks (user_id, title, url, description, source)
       VALUES ($1, $2, $3, $4, 'extension')
       ON CONFLICT (user_id, url) DO UPDATE SET title = EXCLUDED.title, updated_at = NOW()
       RETURNING *`,
      [req.user.id, title || url, url, description || '']
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Quick save error:', error);
    res.status(500).json({ error: 'Quick save failed' });
  }
});

// GET /api/extension/status - Check connection & get user stats
router.get('/status', async (req, res) => {
  try {
    const stats = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM bookmarks WHERE user_id = $1) as bookmarks,
        (SELECT COUNT(*) FROM files WHERE user_id = $1) as files,
        (SELECT COUNT(*) FROM passwords WHERE user_id = $1) as passwords`,
      [req.user.id]
    );

    res.json({
      connected: true,
      user: { id: req.user.id, name: req.user.name, email: req.user.email },
      stats: stats.rows[0]
    });
  } catch (error) {
    res.status(500).json({ connected: false, error: 'Connection check failed' });
  }
});

// POST /api/extension/screen-time - Report screen time from extension
router.post('/screen-time', async (req, res) => {
  try {
    const { app_name, duration_minutes, category } = req.body;
    if (!app_name || !duration_minutes) {
      return res.status(400).json({ error: 'app_name and duration_minutes are required' });
    }

    const result = await pool.query(
      `INSERT INTO screen_time (user_id, app_name, duration_minutes, category, date)
       VALUES ($1, $2, $3, $4, CURRENT_DATE)
       RETURNING *`,
      [req.user.id, app_name, duration_minutes, category || 'browsing']
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Screen time report error:', error);
    res.status(500).json({ error: 'Failed to record screen time' });
  }
});

module.exports = router;
