const request = require('supertest');
const app = require('../server');

describe('Profile & Settings', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@example.com', password: 'demo123' });
    token = res.body.token;
  });

  it('GET /api/profile should return user profile with stats', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('profile');
    expect(res.body.profile).toHaveProperty('name');
    expect(res.body.profile).toHaveProperty('email');
    expect(res.body).toHaveProperty('stats');
  });

  it('PUT /api/profile should update profile', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'Test bio update' });
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/settings should return user settings', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('theme');
    expect(res.body).toHaveProperty('notifications_enabled');
  });

  it('PUT /api/settings should update settings', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ theme: 'light' });
    expect(res.statusCode).toBe(200);
  });
});

describe('Notifications', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@example.com', password: 'demo123' });
    token = res.body.token;
  });

  it('GET /api/notifications should return paginated notifications', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('notifications');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('unreadCount');
  });

  it('PUT /api/notifications/read-all should mark all as read', async () => {
    const res = await request(app)
      .put('/api/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });
});

describe('Search', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@example.com', password: 'demo123' });
    token = res.body.token;
  });

  it('GET /api/search should return results across entities', async () => {
    const res = await request(app)
      .get('/api/search?q=test')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('bookmarks');
    expect(res.body).toHaveProperty('files');
    expect(res.body).toHaveProperty('passwords');
  });

  it('GET /api/search should reject short queries', async () => {
    const res = await request(app)
      .get('/api/search?q=a')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
  });
});

describe('Export', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@example.com', password: 'demo123' });
    token = res.body.token;
  });

  it('GET /api/export/all should return all user data', async () => {
    const res = await request(app)
      .get('/api/export/all')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('bookmarks');
    expect(res.body).toHaveProperty('files');
    expect(res.body).toHaveProperty('passwords');
  });

  it('GET /api/export/bookmarks?format=csv should return CSV', async () => {
    const res = await request(app)
      .get('/api/export/bookmarks?format=csv')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
  });
});
