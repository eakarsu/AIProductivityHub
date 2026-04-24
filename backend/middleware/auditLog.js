const pool = require('../db');

const auditLog = (action, entityType) => {
  return async (req, res, next) => {
    const originalSend = res.json.bind(res);
    res.json = function (data) {
      // Log after response is sent
      if (res.statusCode < 400 && req.user) {
        pool.query(
          'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
          [req.user.id, action, entityType, req.params.id || null, req.ip, req.get('user-agent')]
        ).catch(err => console.error('Audit log error:', err));
      }
      return originalSend(data);
    };
    next();
  };
};

module.exports = auditLog;
