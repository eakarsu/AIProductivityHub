describe('tokenService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'current-secret-that-is-longer-than-32-characters',
      JWT_PREVIOUS_SECRET: '',
      JWT_ISSUER: 'test-issuer',
      JWT_AUDIENCE: 'test-audience'
    };
  });

  afterAll(() => { process.env = originalEnv; });

  test('issues typed access and refresh tokens bound to a session', () => {
    const service = require('../services/tokenService');
    const user = { id: 7, email: 'person@example.test' };
    const access = service.signAccessToken(user, 'd09d75d9-2db1-4a66-8fd1-e1fb294be6fd');
    const refresh = service.signRefreshToken(user, 'd09d75d9-2db1-4a66-8fd1-e1fb294be6fd');
    expect(service.verifyAccessToken(access)).toEqual(expect.objectContaining({ id: 7, type: 'access' }));
    expect(service.verifyRefreshToken(refresh)).toEqual(expect.objectContaining({ id: 7, type: 'refresh' }));
    expect(service.digestToken(access)).toMatch(/^[a-f0-9]{64}$/);
  });

  test('accepts an access token signed by the previous rotation key', () => {
    const jwt = require('jsonwebtoken');
    process.env.JWT_PREVIOUS_SECRET = 'previous-secret-that-is-longer-than-32-characters';
    const oldToken = jwt.sign(
      { id: 9, email: 'old@example.test', type: 'access', sid: 'old-session' },
      process.env.JWT_PREVIOUS_SECRET,
      { issuer: 'test-issuer', audience: 'test-audience', expiresIn: '5m' }
    );
    const service = require('../services/tokenService');
    expect(service.verifyAccessToken(oldToken).id).toBe(9);
  });
});
