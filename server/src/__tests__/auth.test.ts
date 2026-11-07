import request from 'supertest';
import { app, auth, registerUser, uniqueEmail } from './helpers';
import { User } from '../models/User';
import { hashToken } from '../utils/token';

describe('Auth routes', () => {
  describe('POST /api/auth/register', () => {
    it('registers a new user and returns a token + user (no password leak)', async () => {
      const email = uniqueEmail();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Ada Lovelace', email, password: 'Password123' });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.role).toBe('user');
      expect(res.body.user.passwordHash).toBeUndefined();

      const stored = await User.findOne({ email }).select('+passwordHash');
      expect(stored).not.toBeNull();
      expect(stored!.passwordHash).not.toBe('Password123');
      expect(stored!.comparePassword('Password123')).resolves.toBe(true);
    });

    it('rejects duplicate emails with 409', async () => {
      const email = uniqueEmail();
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'First', email, password: 'Password123' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Second', email, password: 'Password123' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('validates weak passwords with 400/422', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Weak', email: uniqueEmail(), password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with correct credentials', async () => {
      const user = await registerUser();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: user.password });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user.email).toBe(user.email);
    });

    it('rejects a wrong password with 401', async () => {
      const user = await registerUser();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: 'WrongPassword1' });

      expect(res.status).toBe(401);
    });

    it('does not reveal whether the email exists', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: uniqueEmail(), password: 'Password123' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns the current user for a valid bearer token', async () => {
      const user = await registerUser();
      const res = await request(app).get('/api/auth/me').set(auth(user.token));

      expect(res.status).toBe(200);
      expect(res.body.user._id).toBe(user.userId);
    });

    it('returns 401 without a token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 for a garbage token', async () => {
      const res = await request(app).get('/api/auth/me').set(auth('not-a-real-token'));
      expect(res.status).toBe(401);
    });
  });

  describe('refresh + logout', () => {
    it('rotates the refresh token and invalidates the old one', async () => {
      const agent = request.agent(app);
      const email = uniqueEmail();
      await agent
        .post('/api/auth/register')
        .send({ name: 'Rotate', email, password: 'Password123' })
        .expect(201);

      const refreshed = await agent.post('/api/auth/refresh');
      expect(refreshed.status).toBe(200);
      expect(refreshed.body.accessToken).toEqual(expect.any(String));

      const stored = await User.findOne({ email });
      expect(stored!.refreshTokens.length).toBe(1);
    });

    it('clears cookies and revokes token on logout', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/register')
        .send({ name: 'Logout', email: uniqueEmail(), password: 'Password123' })
        .expect(201);

      const logout = await agent.post('/api/auth/logout');
      expect(logout.status).toBe(200);

      const refreshed = await agent.post('/api/auth/refresh');
      expect(refreshed.status).toBe(401);
    });

    it('handles concurrent refresh requests without a 500 (VersionError regression)', async () => {
      const agent = request.agent(app);
      const email = uniqueEmail();
      await agent
        .post('/api/auth/register')
        .send({ name: 'Concurrent', email, password: 'Password123' })
        .expect(201);

      const [a, b] = await Promise.all([
        agent.post('/api/auth/refresh'),
        agent.post('/api/auth/refresh'),
      ]);

      expect([a.status, b.status]).not.toContain(500);
      expect(a.status).toBe(200);
      expect(b.status).toBe(200);
    });

    it('stores only a hashed refresh token, never the raw value', async () => {
      const user = await registerUser();
      const stored = await User.findById(user.userId).select('+refreshTokens');
      const hashes = stored!.refreshTokens.map((t) => t.tokenHash);
      expect(hashes.length).toBeGreaterThan(0);
      hashes.forEach((hash) => expect(hash).toMatch(/^[a-f0-9]{64}$/));
      expect(hashes).not.toContain(undefined);
      expect(hashToken('some-token')).toHaveLength(64);
    });
  });

  describe('RBAC', () => {
    it('blocks non-admins from the user admin list', async () => {
      const user = await registerUser();
      const res = await request(app).get('/api/users').set(auth(user.token));
      expect(res.status).toBe(403);
    });
  });
});
