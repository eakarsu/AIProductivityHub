const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { analyzeScreenTime } = require('../services/openRouterService');
const router = express.Router();

// Get all screen time entries
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM screen_time WHERE user_id = $1 ORDER BY date DESC, actual_usage_minutes DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get screen time error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single entry
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM screen_time WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get entry error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add screen time entry
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { app_name, category, daily_limit_minutes, actual_usage_minutes, date, is_blocked, block_schedule } = req.body;

    const result = await pool.query(
      `INSERT INTO screen_time (user_id, app_name, category, daily_limit_minutes, actual_usage_minutes, date, is_blocked, block_schedule)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.user.id, app_name, category, daily_limit_minutes, actual_usage_minutes || 0, date || new Date(), is_blocked || false, block_schedule]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create entry error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update screen time entry
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { app_name, category, daily_limit_minutes, actual_usage_minutes, is_blocked, block_schedule, productivity_score } = req.body;

    const result = await pool.query(
      `UPDATE screen_time
       SET app_name = $1, category = $2, daily_limit_minutes = $3, actual_usage_minutes = $4,
           is_blocked = $5, block_schedule = $6, productivity_score = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [app_name, category, daily_limit_minutes, actual_usage_minutes, is_blocked, block_schedule, productivity_score, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update entry error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete screen time entry
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM screen_time WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json({ message: 'Entry deleted', entry: result.rows[0] });
  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle app block
router.post('/:id/toggle-block', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE screen_time
       SET is_blocked = NOT is_blocked, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Toggle block error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI Analyze screen time
router.post('/analyze', authMiddleware, async (req, res) => {
  try {
    const screenTimeResult = await pool.query(
      `SELECT app_name, category, SUM(actual_usage_minutes) as total_minutes,
              AVG(daily_limit_minutes) as avg_limit
       FROM screen_time WHERE user_id = $1
       GROUP BY app_name, category
       ORDER BY total_minutes DESC`,
      [req.user.id]
    );

    const screenTimeData = screenTimeResult.rows;
    const aiResult = await analyzeScreenTime(screenTimeData);

    // Store AI analysis
    if (aiResult.success) {
      await pool.query(
        `INSERT INTO ai_analysis_history (user_id, feature_type, input_data, output_data, model_used)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.user.id, 'digital_detox', JSON.stringify(screenTimeData), JSON.stringify(aiResult), aiResult.model]
      );
    }

    res.json({
      screenTimeData,
      aiAnalysis: aiResult
    });
  } catch (error) {
    console.error('AI analyze error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get today's summary
router.get('/summary/today', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        SUM(actual_usage_minutes) as total_usage,
        SUM(daily_limit_minutes) as total_limit,
        COUNT(*) as app_count,
        COUNT(*) FILTER (WHERE actual_usage_minutes > daily_limit_minutes) as over_limit_count
       FROM screen_time
       WHERE user_id = $1 AND date = CURRENT_DATE`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get weekly stats
router.get('/stats/weekly', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT date, SUM(actual_usage_minutes) as total_minutes
       FROM screen_time
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY date
       ORDER BY date`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get weekly stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
