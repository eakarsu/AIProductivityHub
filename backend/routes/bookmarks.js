const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { categorizeBookmark } = require('../services/openRouterService');
const router = express.Router();

// Get all bookmarks
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single bookmark
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM bookmarks WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get bookmark error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create bookmark
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, url, description, category, tags } = req.body;

    const result = await pool.query(
      `INSERT INTO bookmarks (user_id, title, url, description, category, tags)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, title, url, description, category, tags || []]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create bookmark error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update bookmark
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, url, description, category, tags } = req.body;

    const result = await pool.query(
      `UPDATE bookmarks
       SET title = $1, url = $2, description = $3, category = $4, tags = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [title, url, description, category, tags || [], req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update bookmark error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete bookmark
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM bookmarks WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    res.json({ message: 'Bookmark deleted', bookmark: result.rows[0] });
  } catch (error) {
    console.error('Delete bookmark error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI Categorize bookmark
router.post('/:id/categorize', authMiddleware, async (req, res) => {
  try {
    const bookmarkResult = await pool.query(
      'SELECT * FROM bookmarks WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (bookmarkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    const bookmark = bookmarkResult.rows[0];
    const aiResult = await categorizeBookmark(bookmark);

    if (aiResult.success && aiResult.parsed) {
      await pool.query(
        `UPDATE bookmarks
         SET ai_category = $1, ai_summary = $2, tags = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [aiResult.parsed.category, aiResult.parsed.summary, aiResult.parsed.tags, req.params.id]
      );
    }

    res.json({
      bookmark,
      aiAnalysis: aiResult
    });
  } catch (error) {
    console.error('AI categorize error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI Categorize all bookmarks
router.post('/categorize-all', authMiddleware, async (req, res) => {
  try {
    const bookmarksResult = await pool.query(
      'SELECT * FROM bookmarks WHERE user_id = $1 AND ai_category IS NULL',
      [req.user.id]
    );

    const results = [];
    for (const bookmark of bookmarksResult.rows) {
      const aiResult = await categorizeBookmark(bookmark);
      if (aiResult.success && aiResult.parsed) {
        await pool.query(
          `UPDATE bookmarks
           SET ai_category = $1, ai_summary = $2, tags = $3, updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [aiResult.parsed.category, aiResult.parsed.summary, aiResult.parsed.tags, bookmark.id]
        );
      }
      results.push({ bookmark, aiAnalysis: aiResult });
    }

    res.json({ processed: results.length, results });
  } catch (error) {
    console.error('AI categorize all error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
