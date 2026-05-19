const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' });
const pool = require('../db');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // DB-backed token blacklist check
    try {
      const blacklisted = await pool.query(
        'SELECT 1 FROM token_blacklist WHERE token = $1 AND expires_at > NOW()',
        [token]
      );
      if (blacklisted.rows.length > 0) {
        return res.status(401).json({ error: 'Token has been revoked. Please login again.' });
      }
    } catch (_) {
      // If blacklist table doesn't exist yet, proceed
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;
