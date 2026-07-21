require('dotenv').config({ path: '../.env' });
const pool = require('../db');
const tokens = require('../services/tokenService');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    const blacklisted = await pool.query(
      'SELECT 1 FROM token_blacklist WHERE token = $1 AND expires_at > NOW()',
      [tokens.digestToken(token)]
    );
    if (blacklisted.rows.length > 0) {
      return res.status(401).json({ error: 'Token has been revoked. Please login again.' });
    }

    const decoded = tokens.verifyAccessToken(token);
    if (!decoded.sid) return res.status(401).json({ error: 'Token is not bound to a session' });
    const session = await pool.query(
      `SELECT 1 FROM auth_sessions
       WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL AND expires_at > NOW()`,
      [decoded.sid, decoded.id]
    );
    if (!session.rows.length) return res.status(401).json({ error: 'Session has expired or been revoked' });
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;
