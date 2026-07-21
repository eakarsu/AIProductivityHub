const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const integrationService = require('../services/integrationService');
const tokens = require('../services/tokenService');
const { validateRegister, validateLogin, validatePasswordChange } = require('../middleware/validate');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

async function createSession(user) {
  const sessionId = crypto.randomUUID();
  const refreshToken = tokens.signRefreshToken(user, sessionId);
  await pool.query(
    `INSERT INTO auth_sessions (id, user_id, refresh_token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, user.id, tokens.digestToken(refreshToken), tokens.expiresAt(refreshToken)]
  );
  return { token: tokens.signAccessToken(user, sessionId), refreshToken };
}

async function sendAccountEmail({ to, subject, text }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) return { delivered: false, reason: 'not-configured' };
  try {
    await integrationService.sendEmail({ to, subject, text });
    return { delivered: true };
  } catch (error) {
    console.error('Account email delivery failed:', error.code || error.message);
    return { delivered: false, reason: 'provider-failure' };
  }
}

function demoToken(name, value) {
  return process.env.EXPOSE_DEMO_TOKENS === 'true' && process.env.NODE_ENV !== 'production' ? { [name]: value } : {};
}

// Register
router.post('/register', authLimiter, validateRegister, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const result = await pool.query(
      `INSERT INTO users (email, password, name, email_verification_token, email_verification_expires)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, created_at, email_verified`,
      [email, hashedPassword, name, verificationToken, verificationExpires]
    );

    const user = result.rows[0];

    // Create default settings
    await pool.query('INSERT INTO user_settings (user_id) VALUES ($1)', [user.id]);

    // Create welcome notification
    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type, category) VALUES ($1, $2, $3, $4, $5)',
      [user.id, 'Welcome to AI Productivity Hub!', 'Get started by exploring your dashboard and setting up your profile.', 'info', 'system']
    );

    const session = await createSession(user);
    const verificationDelivery = await sendAccountEmail({
      to: user.email,
      subject: 'Verify your AI Productivity Hub account',
      text: `Verify your account: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`
    });

    res.status(201).json({
      user,
      ...session,
      verification_delivery: verificationDelivery.delivered ? 'delivered' : 'pending',
      ...demoToken('verificationToken', verificationToken)
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    const session = await createSession(user);

    res.json({
      user: { id: user.id, email: user.email, name: user.name, email_verified: user.email_verified, is_admin: user.is_admin },
      ...session
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, avatar_url, bio, phone, timezone, language, email_verified, is_admin, onboarding_completed, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Token refresh
router.post('/refresh-token', authLimiter, async (req, res) => {
  let client;
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = tokens.verifyRefreshToken(refreshToken);
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT s.id, u.id AS user_id, u.email
       FROM auth_sessions s JOIN users u ON u.id=s.user_id
       WHERE s.id=$1 AND s.user_id=$2 AND s.refresh_token_hash=$3
         AND s.revoked_at IS NULL AND s.expires_at > NOW()
       FOR UPDATE`,
      [decoded.sid, decoded.id, tokens.digestToken(refreshToken)]
    );
    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(401).json({ error: 'Invalid or reused refresh token' });
    }
    const user = { id: result.rows[0].user_id, email: result.rows[0].email };
    const newRefreshToken = tokens.signRefreshToken(user, decoded.sid);
    await client.query(
      `UPDATE auth_sessions SET refresh_token_hash=$1, expires_at=$2,
       rotated_at=NOW(), last_seen_at=NOW() WHERE id=$3`,
      [tokens.digestToken(newRefreshToken), tokens.expiresAt(newRefreshToken), decoded.sid]
    );
    await client.query('COMMIT');
    res.json({ token: tokens.signAccessToken(user, decoded.sid), refreshToken: newRefreshToken });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    res.status(401).json({ error: 'Invalid refresh token' });
  } finally {
    if (client) client.release();
  }
});

// Forgot password
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    const result = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
    // Always return success to prevent email enumeration
    if (result.rows.length === 0) {
      return res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [resetToken, resetExpires, result.rows[0].id]
    );

    await sendAccountEmail({
      to: result.rows[0].email,
      subject: 'Reset your AI Productivity Hub password',
      text: `Reset your password: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/forgot-password?token=${resetToken}`
    });

    res.json({
      message: 'If an account exists with that email, a password reset link has been sent.',
      ...demoToken('resetToken', resetToken)
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword || newPassword.length < 12 || newPassword.length > 128) {
      return res.status(400).json({ error: 'Valid token and password (12-128 chars) required' });
    }

    const result = await pool.query(
      'SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
      [hashedPassword, result.rows[0].id]
    );
    await pool.query('UPDATE auth_sessions SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL', [result.rows[0].id]);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    const result = await pool.query(
      'SELECT id FROM users WHERE email_verification_token = $1 AND email_verification_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    await pool.query(
      'UPDATE users SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1',
      [result.rows[0].id]
    );

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Resend verification email
router.post('/resend-verification', authMiddleware, async (req, res) => {
  try {
    const user = await pool.query('SELECT email, email_verified FROM users WHERE id = $1', [req.user.id]);
    if (!user.rows.length) return res.status(404).json({ error: 'User not found' });
    if (user.rows[0].email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      'UPDATE users SET email_verification_token = $1, email_verification_expires = $2 WHERE id = $3',
      [verificationToken, verificationExpires, req.user.id]
    );

    const delivery = await sendAccountEmail({
      to: user.rows[0].email,
      subject: 'Verify your AI Productivity Hub account',
      text: `Verify your account: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`
    });

    res.json({
      message: delivery.delivered ? 'Verification email sent' : 'Verification email queued pending SMTP configuration',
      ...demoToken('verificationToken', verificationToken)
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password
router.post('/change-password', authMiddleware, validatePasswordChange, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password);

    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hashedPassword, req.user.id]);
    await pool.query('UPDATE auth_sessions SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL', [req.user.id]);

    // Blacklist current token
    if (req.token) {
      await pool.query(
        'INSERT INTO token_blacklist (token, expires_at) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING',
        [tokens.digestToken(req.token), tokens.expiresAt(req.token)]
      );
    }

    res.json({ message: 'Password changed successfully. Please login again.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout - blacklist current token in DB
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    if (req.token) {
      await pool.query(
        'INSERT INTO token_blacklist (token, expires_at) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING',
        [tokens.digestToken(req.token), tokens.expiresAt(req.token)]
      );
    }
    if (req.user.sid) {
      await pool.query('UPDATE auth_sessions SET revoked_at=NOW() WHERE id=$1 AND user_id=$2', [req.user.sid, req.user.id]);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
