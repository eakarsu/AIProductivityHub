const rateLimit = require('express-rate-limit');
let ipKeyGenerator;
try { ({ ipKeyGenerator } = require('express-rate-limit')); } catch (_) {}
if (typeof ipKeyGenerator !== 'function') {
  ipKeyGenerator = (req) => (req && req.ip) || 'unknown';
}

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Auth rate limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Password reset rate limiter
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many password reset attempts, please try again later.' }
});

// AI rate limiter - 20 req/hour, keyed by user ID or IP
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'AI rate limit exceeded. Maximum 20 AI calls per hour. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    return req.user ? `user_${req.user.id}` : ipKeyGenerator(req, res);
  }
});

module.exports = { apiLimiter, authLimiter, passwordResetLimiter, aiRateLimiter };
