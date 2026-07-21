const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const issuer = () => process.env.JWT_ISSUER || 'ai-productivity-hub';
const audience = () => process.env.JWT_AUDIENCE || 'ai-productivity-hub-web';

function digestToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user, sessionId) {
  return jwt.sign(
    { id: user.id, email: user.email, type: 'access', sid: sessionId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_TTL || '15m', issuer: issuer(), audience: audience(), jwtid: crypto.randomUUID() }
  );
}

function signRefreshToken(user, sessionId) {
  return jwt.sign(
    { id: user.id, email: user.email, type: 'refresh', sid: sessionId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_TTL || '30d', issuer: issuer(), audience: audience(), jwtid: crypto.randomUUID() }
  );
}

function verifyWithRotation(token) {
  const options = { issuer: issuer(), audience: audience() };
  try {
    return jwt.verify(token, process.env.JWT_SECRET, options);
  } catch (error) {
    if (!process.env.JWT_PREVIOUS_SECRET) throw error;
    return jwt.verify(token, process.env.JWT_PREVIOUS_SECRET, options);
  }
}

function verifyAccessToken(token) {
  const decoded = verifyWithRotation(token);
  if (decoded.type !== 'access') throw new Error('Invalid access token type');
  return decoded;
}

function verifyRefreshToken(token) {
  const decoded = verifyWithRotation(token);
  if (decoded.type !== 'refresh' || !decoded.sid) throw new Error('Invalid refresh token type');
  return decoded;
}

function expiresAt(token) {
  const decoded = jwt.decode(token);
  if (!decoded?.exp) throw new Error('Token has no expiration');
  return new Date(decoded.exp * 1000);
}

module.exports = {
  digestToken,
  expiresAt,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
