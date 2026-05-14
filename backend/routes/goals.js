const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { callOpenRouter, parseAIJson } = require('../services/openRouterService');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Get all goals (with pagination)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) as count FROM goals WHERE user_id = $1', [userId]);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      'SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );

    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single goal
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM goals WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get goal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create goal
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, target_date, progress_pct, status } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const result = await pool.query(
      `INSERT INTO goals (user_id, title, description, target_date, progress_pct, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, title, description || null, target_date || null, progress_pct || 0, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update goal
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, target_date, progress_pct, status } = req.body;
    const result = await pool.query(
      `UPDATE goals SET title = $1, description = $2, target_date = $3, progress_pct = $4, status = $5, updated_at = NOW()
       WHERE id = $6 AND user_id = $7 RETURNING *`,
      [title, description, target_date, progress_pct, status, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete goal
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });
    res.json({ message: 'Goal deleted' });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// AI: Generate action plan for a goal
router.post('/:id/ai-plan', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const goalResult = await pool.query(
      'SELECT * FROM goals WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (goalResult.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });

    const goal = goalResult.rows[0];
    const daysUntilDeadline = goal.target_date
      ? Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    const prompt = `Create a detailed step-by-step action plan for achieving this goal.

GOAL: "${goal.title}"
Description: ${goal.description || 'N/A'}
Current Progress: ${goal.progress_pct}%
Status: ${goal.status}
Target Date: ${goal.target_date || 'No deadline'}
${daysUntilDeadline !== null ? `Days Remaining: ${daysUntilDeadline}` : ''}

Respond ONLY with JSON:
{
  "milestones": [
    { "week": <number>, "milestone": "<specific milestone>", "success_criteria": "<how to measure>" }
  ],
  "daily_actions": ["<action 1>", "<action 2>", "<action 3>"],
  "weekly_actions": ["<action 1>", "<action 2>"],
  "potential_obstacles": ["<obstacle 1>", "<obstacle 2>"],
  "mitigation_strategies": ["<strategy 1>", "<strategy 2>"],
  "resources_needed": ["<resource 1>", "<resource 2>"],
  "success_metrics": ["<metric 1>", "<metric 2>"],
  "motivational_tip": "<personalized encouragement>",
  "estimated_completion_probability": <0-100>
}`;

    const aiResult = await callOpenRouter(prompt, 'You are an expert goal achievement coach who creates detailed, practical action plans.');
    const parsed = parseAIJson(aiResult.content || aiResult);

    // Save the plan to the goal
    await pool.query(
      'UPDATE goals SET ai_plan = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(parsed || aiResult), goal.id]
    );

    // Persist AI result
    try {
      await pool.query(
        `INSERT INTO ai_results (user_id, endpoint, input_data, result, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [req.user.id, `/goals/${req.params.id}/ai-plan`, JSON.stringify({ goal_id: goal.id, title: goal.title }), JSON.stringify(parsed || aiResult)]
      );
    } catch (e) { /* non-blocking */ }

    res.json({ plan: parsed || aiResult, goal, raw: aiResult.content || aiResult });
  } catch (error) {
    console.error('Goal AI plan error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
