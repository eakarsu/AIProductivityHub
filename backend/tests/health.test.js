const request = require('supertest');
const app = require('../server');

describe('Health Check', () => {
  it('GET /api/health should return status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe('2.0.0');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body.database).toBe('connected');
  });
});

describe('API Docs', () => {
  it('GET /api/docs should return API documentation', async () => {
    const res = await request(app).get('/api/docs');
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('AI Productivity Hub API');
    expect(res.body.endpoints).toHaveProperty('auth');
    expect(res.body.endpoints).toHaveProperty('bookmarks');
    expect(res.body.endpoints).toHaveProperty('extension');
  });
});
