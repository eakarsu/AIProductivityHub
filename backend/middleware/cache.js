const cache = new Map();

function cacheMiddleware(duration = 60) {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${req.originalUrl || req.url}:${req.user?.id || 'anon'}`;
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp < duration * 1000) {
      return res.json(cached.data);
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      cache.set(key, { data, timestamp: Date.now() });
      return originalJson(data);
    };

    next();
  };
}

function clearCache(pattern) {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

// Auto-cleanup expired entries every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > 300000) {
      cache.delete(key);
    }
  }
}, 300000);

// Allow cleanup for tests
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

module.exports = { cacheMiddleware, clearCache };
