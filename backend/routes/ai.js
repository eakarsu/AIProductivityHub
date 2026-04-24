const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cache');
const { callOpenRouter } = require('../services/openRouterService');
const router = express.Router();

// General AI query
router.post('/query', authMiddleware, async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const aiResult = await callOpenRouter(prompt, systemPrompt);

    // Store in history
    await pool.query(
      `INSERT INTO ai_analysis_history (user_id, feature_type, input_data, output_data, model_used)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'general', JSON.stringify({ prompt, systemPrompt }), JSON.stringify(aiResult), aiResult.model]
    );

    res.json(aiResult);
  } catch (error) {
    console.error('AI query error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get AI history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { feature_type, limit = 50 } = req.query;

    let query = 'SELECT * FROM ai_analysis_history WHERE user_id = $1';
    const params = [req.user.id];

    if (feature_type) {
      query += ' AND feature_type = $2';
      params.push(feature_type);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get AI history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Dashboard insights (cached 2 minutes)
router.get('/dashboard-insights', authMiddleware, cacheMiddleware(120), async (req, res) => {
  try {
    // Get various stats
    const [bookmarks, files, passwords, screenTime, focusSessions] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM bookmarks WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT COUNT(*) as count FROM files WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT COUNT(*) as count, AVG(strength_score) as avg_strength FROM passwords WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT SUM(actual_usage_minutes) as total FROM screen_time WHERE user_id = $1 AND date = CURRENT_DATE', [req.user.id]),
      pool.query('SELECT SUM(completed_pomodoros) as total FROM focus_sessions WHERE user_id = $1 AND status = \'completed\'', [req.user.id])
    ]);

    const stats = {
      bookmarks: parseInt(bookmarks.rows[0].count),
      files: parseInt(files.rows[0].count),
      passwords: {
        count: parseInt(passwords.rows[0].count),
        avgStrength: parseFloat(passwords.rows[0].avg_strength) || 0
      },
      screenTime: parseInt(screenTime.rows[0].total) || 0,
      focusPomodoros: parseInt(focusSessions.rows[0].total) || 0
    };

    // Generate AI insights
    const prompt = `Based on these user productivity stats, provide 3-5 brief, actionable insights:
    - Bookmarks organized: ${stats.bookmarks}
    - Files tracked: ${stats.files}
    - Passwords managed: ${stats.passwords.count} (avg security score: ${stats.passwords.avgStrength.toFixed(0)})
    - Screen time today: ${stats.screenTime} minutes
    - Focus pomodoros completed: ${stats.focusPomodoros}

    Respond with a JSON object containing:
    - insights: array of insight strings
    - overallScore: productivity score 1-100
    - topRecommendation: single most important action`;

    const aiResult = await callOpenRouter(prompt);

    res.json({
      stats,
      aiInsights: aiResult
    });
  } catch (error) {
    console.error('Dashboard insights error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
