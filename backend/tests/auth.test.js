const request = require('supertest');
const app = require('../server');

describe('Auth Endpoints', () => {
  const testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'test-password-123',
    name: 'Test User'
  };
  let token;
  let refreshToken;

  it('POST /api/auth/register should create a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.email).toBe(testUser.email);
    token = res.body.token;
    refreshToken = res.body.refreshToken;
  });

  it('POST /api/auth/login should authenticate user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    token = res.body.token;
    refreshToken = res.body.refreshToken;
  });

  it('POST /api/auth/login should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'wrongpass' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/auth/me should return current user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe(testUser.email);
  });

  it('GET /api/auth/me should reject without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/auth/refresh-token should rotate and reject reuse', async () => {
    const oldRefreshToken = refreshToken;
    const rotated = await request(app).post('/api/auth/refresh-token').send({ refreshToken: oldRefreshToken });
    expect(rotated.statusCode).toBe(200);
    expect(rotated.body.refreshToken).not.toBe(oldRefreshToken);
    token = rotated.body.token;
    refreshToken = rotated.body.refreshToken;

    const reused = await request(app).post('/api/auth/refresh-token').send({ refreshToken: oldRefreshToken });
    expect(reused.statusCode).toBe(401);
  });

  it('POST /api/auth/change-password should update password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: testUser.password, newPassword: 'new-password-123' });
    expect(res.statusCode).toBe(200);

    // Verify new password works
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'new-password-123' });
    expect(loginRes.statusCode).toBe(200);
    token = loginRes.body.token;
  });

  it('POST /api/auth/logout should revoke the active session', async () => {
    const loggedOut = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(loggedOut.statusCode).toBe(200);
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.statusCode).toBe(401);
  });

  it('POST /api/auth/forgot-password should accept valid email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email });
    expect(res.statusCode).toBe(200);
  });
});
