const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// GET /api/usage/stats - daily/weekly token consumption
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [daily, weekly, byEndpoint, total, recent] = await Promise.all([
      // Daily breakdown for last 7 days
      pool.query(
        `SELECT DATE(created_at) as date, SUM(tokens_used) as tokens, SUM(cost_estimate) as cost, COUNT(*) as calls
         FROM ai_usage WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
         GROUP BY DATE(created_at) ORDER BY date DESC`,
        [userId]
      ),
      // Weekly totals
      pool.query(
        `SELECT SUM(tokens_used) as weekly_tokens, SUM(cost_estimate) as weekly_cost, COUNT(*) as weekly_calls
         FROM ai_usage WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
        [userId]
      ),
      // By endpoint
      pool.query(
        `SELECT endpoint, COUNT(*) as calls, SUM(tokens_used) as tokens, SUM(cost_estimate) as cost
         FROM ai_usage WHERE user_id = $1 GROUP BY endpoint ORDER BY calls DESC`,
        [userId]
      ),
      // Count for pagination
      pool.query('SELECT COUNT(*) as count FROM ai_usage WHERE user_id = $1', [userId]),
      // Recent calls
      pool.query(
        'SELECT * FROM ai_usage WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [userId, limit, offset]
      )
    ]);

    const totalCount = parseInt(total.rows[0].count);

    res.json({
      summary: weekly.rows[0],
      daily_breakdown: daily.rows,
      by_endpoint: byEndpoint.rows,
      data: recent.rows,
      pagination: { page, limit, total: totalCount, totalPages: Math.ceil(totalCount / limit) }
    });
  } catch (error) {
    console.error('Usage stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
