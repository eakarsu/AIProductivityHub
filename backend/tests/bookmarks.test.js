const request = require('supertest');
const app = require('../server');

describe('Bookmarks CRUD', () => {
  let token;
  let bookmarkId;

  beforeAll(async () => {
    // Login with demo user
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@example.com', password: 'demo123' });
    token = res.body.token;
  });

  it('GET /api/bookmarks should list bookmarks', async () => {
    const res = await request(app)
      .get('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/bookmarks should create a bookmark', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Bookmark',
        url: 'https://test-bookmark.example.com',
        description: 'A test bookmark',
        category: 'Testing'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('Test Bookmark');
    bookmarkId = res.body.id;
  });

  it('GET /api/bookmarks/:id should get a bookmark', async () => {
    const res = await request(app)
      .get(`/api/bookmarks/${bookmarkId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(bookmarkId);
  });

  it('PUT /api/bookmarks/:id should update a bookmark', async () => {
    const res = await request(app)
      .put(`/api/bookmarks/${bookmarkId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Bookmark', url: 'https://test-bookmark.example.com' });
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe('Updated Bookmark');
  });

  it('DELETE /api/bookmarks/:id should delete a bookmark', async () => {
    const res = await request(app)
      .delete(`/api/bookmarks/${bookmarkId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });

  it('should reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/bookmarks');
    expect(res.statusCode).toBe(401);
  });
});
