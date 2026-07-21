const request = require('supertest');
const app = require('../server');

describe('task workflow', () => {
  let token;
  let task;

  beforeAll(async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: `tasks-${Date.now()}@example.test`,
      password: 'task-test-password-123',
      name: 'Task Test User'
    });
    expect(response.statusCode).toBe(201);
    token = response.body.token;
  });

  test('creates a durable task with an initial audit event', async () => {
    const created = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Prepare weekly plan', priority: 'high' });
    expect(created.statusCode).toBe(201);
    expect(created.body).toEqual(expect.objectContaining({ status: 'backlog', version: 1 }));
    task = created.body;

    const detail = await request(app).get(`/api/tasks/${task.id}`).set('Authorization', `Bearer ${token}`);
    expect(detail.body.events).toEqual([expect.objectContaining({ event_type: 'created' })]);
  });

  test('rejects invalid transitions and accepts the controlled workflow', async () => {
    const invalid = await request(app)
      .post(`/api/tasks/${task.id}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed', version: task.version });
    expect(invalid.statusCode).toBe(409);

    const started = await request(app)
      .post(`/api/tasks/${task.id}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in_progress', version: task.version });
    expect(started.statusCode).toBe(200);

    const completed = await request(app)
      .post(`/api/tasks/${task.id}/transition`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed', version: started.body.version });
    expect(completed.body).toEqual(expect.objectContaining({ status: 'completed', version: 3 }));
  });
});
