const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { generateFocusTip } = require('../services/openRouterService');
const router = express.Router();

// Get all focus sessions
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM focus_sessions WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single session
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM focus_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create focus session
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { session_name, duration_minutes, break_duration_minutes, target_pomodoros, blocked_sites, blocked_apps, notes } = req.body;

    const result = await pool.query(
      `INSERT INTO focus_sessions (user_id, session_name, duration_minutes, break_duration_minutes, target_pomodoros, blocked_sites, blocked_apps, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.user.id, session_name, duration_minutes || 25, break_duration_minutes || 5, target_pomodoros || 4, blocked_sites || [], blocked_apps || [], notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update focus session
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { session_name, duration_minutes, break_duration_minutes, target_pomodoros, blocked_sites, blocked_apps, status, completed_pomodoros, productivity_rating, notes } = req.body;

    const result = await pool.query(
      `UPDATE focus_sessions
       SET session_name = $1, duration_minutes = $2, break_duration_minutes = $3, target_pomodoros = $4,
           blocked_sites = $5, blocked_apps = $6, status = $7, completed_pomodoros = $8,
           productivity_rating = $9, notes = $10, updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 AND user_id = $12
       RETURNING *`,
      [session_name, duration_minutes, break_duration_minutes, target_pomodoros, blocked_sites, blocked_apps, status, completed_pomodoros, productivity_rating, notes, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete focus session
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM focus_sessions WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session deleted', session: result.rows[0] });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start session
router.post('/:id/start', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE focus_sessions
       SET status = 'in_progress', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Complete pomodoro
router.post('/:id/complete-pomodoro', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE focus_sessions
       SET completed_pomodoros = completed_pomodoros + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = result.rows[0];

    // Check if all pomodoros completed
    if (session.completed_pomodoros >= session.target_pomodoros) {
      await pool.query(
        `UPDATE focus_sessions
         SET status = 'completed', ended_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [req.params.id]
      );
      session.status = 'completed';
    }

    res.json(session);
  } catch (error) {
    console.error('Complete pomodoro error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// End session
router.post('/:id/end', authMiddleware, async (req, res) => {
  try {
    const { productivity_rating } = req.body;

    const result = await pool.query(
      `UPDATE focus_sessions
       SET status = 'completed', ended_at = CURRENT_TIMESTAMP, productivity_rating = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [productivity_rating, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI Generate focus tip
router.post('/:id/focus-tip', authMiddleware, async (req, res) => {
  try {
    const sessionResult = await pool.query(
      'SELECT * FROM focus_sessions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];
    const aiResult = await generateFocusTip(session);

    if (aiResult.success && aiResult.parsed) {
      await pool.query(
        `UPDATE focus_sessions
         SET ai_focus_tip = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [aiResult.parsed.focusTip, req.params.id]
      );
    }

    res.json({
      session,
      aiAnalysis: aiResult
    });
  } catch (error) {
    console.error('AI focus tip error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get stats
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_sessions,
        SUM(completed_pomodoros) as total_pomodoros,
        SUM(duration_minutes * completed_pomodoros) as total_focus_minutes,
        AVG(productivity_rating) as avg_productivity
       FROM focus_sessions
       WHERE user_id = $1 AND status = 'completed'`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
