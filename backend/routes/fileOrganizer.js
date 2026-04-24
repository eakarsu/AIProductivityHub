const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { suggestFileOrganization } = require('../services/openRouterService');
const router = express.Router();

// Get all files
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM files WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single file
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM files WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add file entry
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { filename, filepath, extension, size_bytes, current_folder } = req.body;

    const result = await pool.query(
      `INSERT INTO files (user_id, filename, filepath, extension, size_bytes, current_folder)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, filename, filepath, extension, size_bytes, current_folder]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create file entry error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update file entry
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { filename, filepath, extension, size_bytes, current_folder, suggested_folder, status } = req.body;

    const result = await pool.query(
      `UPDATE files
       SET filename = $1, filepath = $2, extension = $3, size_bytes = $4,
           current_folder = $5, suggested_folder = $6, status = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [filename, filepath, extension, size_bytes, current_folder, suggested_folder, status, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete file entry
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM files WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ message: 'File entry deleted', file: result.rows[0] });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI Suggest organization for file
router.post('/:id/suggest', authMiddleware, async (req, res) => {
  try {
    const fileResult = await pool.query(
      'SELECT * FROM files WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileResult.rows[0];
    const aiResult = await suggestFileOrganization(file);

    if (aiResult.success && aiResult.parsed) {
      await pool.query(
        `UPDATE files
         SET suggested_folder = $1, ai_category = $2, ai_suggestion = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [aiResult.parsed.suggestedFolder, aiResult.parsed.category, aiResult.parsed.reason, req.params.id]
      );
    }

    res.json({
      file,
      aiAnalysis: aiResult
    });
  } catch (error) {
    console.error('AI suggest error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI Suggest organization for all files
router.post('/suggest-all', authMiddleware, async (req, res) => {
  try {
    const filesResult = await pool.query(
      'SELECT * FROM files WHERE user_id = $1 AND suggested_folder IS NULL',
      [req.user.id]
    );

    const results = [];
    for (const file of filesResult.rows) {
      const aiResult = await suggestFileOrganization(file);
      if (aiResult.success && aiResult.parsed) {
        await pool.query(
          `UPDATE files
           SET suggested_folder = $1, ai_category = $2, ai_suggestion = $3, updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [aiResult.parsed.suggestedFolder, aiResult.parsed.category, aiResult.parsed.reason, file.id]
        );
      }
      results.push({ file, aiAnalysis: aiResult });
    }

    res.json({ processed: results.length, results });
  } catch (error) {
    console.error('AI suggest all error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Apply suggestion (move file)
router.post('/:id/apply', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE files
       SET current_folder = suggested_folder, status = 'organized', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND suggested_folder IS NOT NULL
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found or no suggestion available' });
    }

    res.json({ message: 'File organization applied', file: result.rows[0] });
  } catch (error) {
    console.error('Apply suggestion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
