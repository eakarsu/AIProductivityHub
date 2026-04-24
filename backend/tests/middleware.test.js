const { cacheMiddleware, clearCache } = require('../middleware/cache');

describe('Cache Middleware', () => {
  beforeEach(() => {
    clearCache();
  });

  it('should cache GET responses', () => {
    const middleware = cacheMiddleware(60);
    const req = { method: 'GET', originalUrl: '/test', user: { id: 1 } };
    const jsonFn = jest.fn();
    const res = { json: jsonFn };
    const next = jest.fn();

    // First call - should go through
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Simulate response
    res.json({ data: 'test' });

    // Second call - should serve from cache
    const next2 = jest.fn();
    const jsonFn2 = jest.fn();
    const res2 = { json: jsonFn2 };
    middleware(req, res2, next2);
    expect(next2).not.toHaveBeenCalled();
    expect(jsonFn2).toHaveBeenCalledWith({ data: 'test' });
  });

  it('should not cache POST requests', () => {
    const middleware = cacheMiddleware(60);
    const req = { method: 'POST', originalUrl: '/test', user: { id: 1 } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should clear cache by pattern', () => {
    const middleware = cacheMiddleware(60);
    const req = { method: 'GET', originalUrl: '/api/bookmarks', user: { id: 1 } };
    const jsonFn = jest.fn();
    const res = { json: jsonFn };
    const next = jest.fn();

    middleware(req, res, next);
    res.json({ data: 'bookmarks' });

    clearCache('bookmarks');

    // After clearing, should go through again
    const next2 = jest.fn();
    middleware(req, { json: jest.fn() }, next2);
    expect(next2).toHaveBeenCalled();
  });
});

describe('Error Handler', () => {
  const errorHandler = require('../middleware/errorHandler');

  it('should handle generic errors', () => {
    const err = new Error('Test error');
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Internal server error'
    }));
  });

  it('should handle JSON parse errors', () => {
    const err = new SyntaxError('Unexpected token');
    err.type = 'entity.parse.failed';
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid JSON in request body' });
  });
});
