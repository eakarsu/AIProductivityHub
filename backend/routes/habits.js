const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { callOpenRouter, parseAIJson } = require('../services/openRouterService');
const router = express.Router();

// Get all habits (with pagination)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) as count FROM habits WHERE user_id = $1', [userId]);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      'SELECT * FROM habits WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );

    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get habits error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single habit
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM habits WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Habit not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get habit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create habit
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, frequency, target_count, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const result = await pool.query(
      `INSERT INTO habits (user_id, name, frequency, target_count, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, name, frequency || 'daily', target_count || 1, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create habit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update habit
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, frequency, target_count, description } = req.body;
    const result = await pool.query(
      `UPDATE habits SET name = $1, frequency = $2, target_count = $3, description = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [name, frequency, target_count, description, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Habit not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update habit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete habit
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Habit not found' });
    res.json({ message: 'Habit deleted' });
  } catch (error) {
    console.error('Delete habit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Log habit completion
router.post('/:id/log', authMiddleware, async (req, res) => {
  try {
    const habitResult = await pool.query(
      'SELECT * FROM habits WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (habitResult.rows.length === 0) return res.status(404).json({ error: 'Habit not found' });

    const { notes, count } = req.body;
    const result = await pool.query(
      `INSERT INTO habit_logs (habit_id, user_id, count, notes, logged_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [req.params.id, req.user.id, count || 1, notes || null]
    );
    res.status(201).json({ log: result.rows[0], habit: habitResult.rows[0] });
  } catch (error) {
    console.error('Log habit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get streaks for all habits
router.get('/streaks', authMiddleware, async (req, res) => {
  try {
    // This route is registered before /:id so Express will match it correctly
    // We'll redirect to /streaks explicitly
    res.redirect('/api/habits/streaks/summary');
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get streaks summary
router.get('/streaks/summary', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const habits = await pool.query('SELECT * FROM habits WHERE user_id = $1', [userId]);

    const streaks = await Promise.all(habits.rows.map(async (habit) => {
      // Get log dates for this habit, ordered desc
      const logs = await pool.query(
        `SELECT DATE(logged_at) as log_date FROM habit_logs
         WHERE habit_id = $1 AND user_id = $2
         GROUP BY DATE(logged_at) ORDER BY log_date DESC`,
        [habit.id, userId]
      );

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (logs.rows.length > 0) {
        // Calculate current streak
        let checkDate = new Date(today);
        for (const log of logs.rows) {
          const logDate = new Date(log.log_date);
          logDate.setHours(0, 0, 0, 0);
          const diff = Math.floor((checkDate - logDate) / (1000 * 60 * 60 * 24));
          if (diff === 0 || diff === 1) {
            currentStreak++;
            checkDate = logDate;
          } else break;
        }

        // Calculate longest streak
        tempStreak = 1;
        for (let i = 1; i < logs.rows.length; i++) {
          const prev = new Date(logs.rows[i - 1].log_date);
          const curr = new Date(logs.rows[i].log_date);
          const diff = Math.floor((prev - curr) / (1000 * 60 * 60 * 24));
          if (diff === 1) {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
          } else {
            tempStreak = 1;
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak, currentStreak);
      }

      return {
        habit_id: habit.id,
        habit_name: habit.name,
        frequency: habit.frequency,
        target_count: habit.target_count,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        total_completions: logs.rows.length,
        last_logged: logs.rows[0]?.log_date || null
      };
    }));

    res.json(streaks);
  } catch (error) {
    console.error('Get streaks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
