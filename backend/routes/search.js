const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cache');
const router = express.Router();

// Global search across all entities (cached for 30 seconds)
router.get('/', authMiddleware, cacheMiddleware(30), async (req, res) => {
  try {
    const { q, type } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchTerm = `%${q}%`;
    const results = {};

    if (!type || type === 'bookmarks') {
      const bookmarks = await pool.query(
        `SELECT id, title, url, category, 'bookmark' as type FROM bookmarks
         WHERE user_id = $1 AND (title ILIKE $2 OR url ILIKE $2 OR description ILIKE $2 OR category ILIKE $2)
         LIMIT 10`,
        [req.user.id, searchTerm]
      );
      results.bookmarks = bookmarks.rows;
    }

    if (!type || type === 'files') {
      const files = await pool.query(
        `SELECT id, filename, filepath, extension, 'file' as type FROM files
         WHERE user_id = $1 AND (filename ILIKE $2 OR filepath ILIKE $2 OR extension ILIKE $2)
         LIMIT 10`,
        [req.user.id, searchTerm]
      );
      results.files = files.rows;
    }

    if (!type || type === 'passwords') {
      const passwords = await pool.query(
        `SELECT id, site_name, site_url, username, 'password' as type FROM passwords
         WHERE user_id = $1 AND (site_name ILIKE $2 OR site_url ILIKE $2 OR username ILIKE $2)
         LIMIT 10`,
        [req.user.id, searchTerm]
      );
      results.passwords = passwords.rows;
    }

    if (!type || type === 'screen_time') {
      const screenTime = await pool.query(
        `SELECT id, app_name, category, 'screen_time' as type FROM screen_time
         WHERE user_id = $1 AND (app_name ILIKE $2 OR category ILIKE $2)
         LIMIT 10`,
        [req.user.id, searchTerm]
      );
      results.screen_time = screenTime.rows;
    }

    if (!type || type === 'focus_sessions') {
      const sessions = await pool.query(
        `SELECT id, session_name, status, 'focus_session' as type FROM focus_sessions
         WHERE user_id = $1 AND (session_name ILIKE $2 OR notes ILIKE $2)
         LIMIT 10`,
        [req.user.id, searchTerm]
      );
      results.focus_sessions = sessions.rows;
    }

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
