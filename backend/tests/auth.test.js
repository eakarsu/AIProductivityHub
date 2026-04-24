const request = require('supertest');
const app = require('../server');

describe('Auth Endpoints', () => {
  const testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'testpass123',
    name: 'Test User'
  };
  let token;

  it('POST /api/auth/register should create a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.email).toBe(testUser.email);
    token = res.body.token;
  });

  it('POST /api/auth/login should authenticate user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    token = res.body.token;
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

  it('POST /api/auth/change-password should update password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: testUser.password, newPassword: 'newpass123' });
    expect(res.statusCode).toBe(200);

    // Verify new password works
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'newpass123' });
    expect(loginRes.statusCode).toBe(200);
  });

  it('POST /api/auth/forgot-password should accept valid email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email });
    expect(res.statusCode).toBe(200);
  });
});
