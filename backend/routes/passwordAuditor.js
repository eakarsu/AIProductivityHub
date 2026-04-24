const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { auditPassword } = require('../services/openRouterService');
const router = express.Router();

// Get all passwords
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM passwords WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get passwords error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single password entry
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM passwords WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Password entry not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add password entry
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { site_name, site_url, username, password_strength, strength_score, last_changed, has_2fa } = req.body;

    const result = await pool.query(
      `INSERT INTO passwords (user_id, site_name, site_url, username, password_strength, strength_score, last_changed, has_2fa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.user.id, site_name, site_url, username, password_strength, strength_score, last_changed, has_2fa || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create password entry error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update password entry
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { site_name, site_url, username, password_strength, strength_score, last_changed, has_2fa, is_reused } = req.body;

    const result = await pool.query(
      `UPDATE passwords
       SET site_name = $1, site_url = $2, username = $3, password_strength = $4,
           strength_score = $5, last_changed = $6, has_2fa = $7, is_reused = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [site_name, site_url, username, password_strength, strength_score, last_changed, has_2fa, is_reused, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Password entry not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete password entry
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM passwords WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Password entry not found' });
    }

    res.json({ message: 'Password entry deleted', password: result.rows[0] });
  } catch (error) {
    console.error('Delete password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI Audit password
router.post('/:id/audit', authMiddleware, async (req, res) => {
  try {
    const passwordResult = await pool.query(
      'SELECT * FROM passwords WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (passwordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Password entry not found' });
    }

    const passwordEntry = passwordResult.rows[0];

    // Add additional info for AI analysis
    const passwordInfo = {
      ...passwordEntry,
      password_length: req.body.password_length || 8,
      has_special: req.body.has_special || false,
      has_numbers: req.body.has_numbers || true,
      has_uppercase: req.body.has_uppercase || true
    };

    const aiResult = await auditPassword(passwordInfo);

    if (aiResult.success && aiResult.parsed) {
      await pool.query(
        `UPDATE passwords
         SET password_strength = $1, strength_score = $2, ai_recommendation = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [aiResult.parsed.strengthLabel, aiResult.parsed.strengthScore, JSON.stringify(aiResult.parsed.recommendations), req.params.id]
      );
    }

    res.json({
      passwordEntry,
      aiAnalysis: aiResult
    });
  } catch (error) {
    console.error('AI audit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI Audit all passwords
router.post('/audit-all', authMiddleware, async (req, res) => {
  try {
    const passwordsResult = await pool.query(
      'SELECT * FROM passwords WHERE user_id = $1',
      [req.user.id]
    );

    const results = [];
    for (const passwordEntry of passwordsResult.rows) {
      const passwordInfo = {
        ...passwordEntry,
        password_length: 12,
        has_special: true,
        has_numbers: true,
        has_uppercase: true
      };

      const aiResult = await auditPassword(passwordInfo);
      if (aiResult.success && aiResult.parsed) {
        await pool.query(
          `UPDATE passwords
           SET password_strength = $1, strength_score = $2, ai_recommendation = $3, updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [aiResult.parsed.strengthLabel, aiResult.parsed.strengthScore, JSON.stringify(aiResult.parsed.recommendations), passwordEntry.id]
        );
      }
      results.push({ passwordEntry, aiAnalysis: aiResult });
    }

    res.json({ processed: results.length, results });
  } catch (error) {
    console.error('AI audit all error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get security summary
router.get('/summary/overview', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE strength_score >= 80) as strong,
        COUNT(*) FILTER (WHERE strength_score >= 50 AND strength_score < 80) as medium,
        COUNT(*) FILTER (WHERE strength_score < 50) as weak,
        COUNT(*) FILTER (WHERE has_2fa = true) as with_2fa,
        COUNT(*) FILTER (WHERE is_reused = true) as reused
       FROM passwords WHERE user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
