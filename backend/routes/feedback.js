const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { validateFeedback, validateContact } = require('../middleware/validate');
const router = express.Router();

// Submit feedback
router.post('/', authMiddleware, validateFeedback, async (req, res) => {
  try {
    const { type, subject, message, rating } = req.body;
    const result = await pool.query(
      'INSERT INTO feedback (user_id, type, subject, message, rating) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, type || 'general', subject, message, rating]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's feedback
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM feedback WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit contact message
router.post('/contact', validateContact, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const userId = req.headers.authorization ? null : null; // Optional auth

    const result = await pool.query(
      'INSERT INTO contact_messages (user_id, name, email, subject, message) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, name, email, subject, message]
    );
    res.status(201).json({ message: 'Message sent successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Contact error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get contact messages (admin)
router.get('/contact', authMiddleware, async (req, res) => {
  try {
    const user = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!user.rows[0]?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const result = await pool.query('SELECT * FROM contact_messages ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get contact messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
