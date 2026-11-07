import request from 'supertest';
import { app, auth, registerUser, uniqueEmail } from './helpers';
import { User } from '../models/User';

describe('User profile routes', () => {
  it('updates the profile', async () => {
    const user = await registerUser();
    const res = await request(app)
      .patch('/api/users/me')
      .set(auth(user.token))
      .send({ headline: 'Backend Engineer', targetRole: 'Senior Backend Engineer' });

    expect(res.status).toBe(200);
    expect(res.body.user.headline).toBe('Backend Engineer');
    expect(res.body.user.targetRole).toBe('Senior Backend Engineer');
  });

  it('rejects an invalid avatar URL', async () => {
    const user = await registerUser();
    const res = await request(app)
      .patch('/api/users/me')
      .set(auth(user.token))
      .send({ avatarUrl: 'not-a-url' });
    expect(res.status).toBe(400);
  });

  it('changes the password and invalidates old credentials', async () => {
    const user = await registerUser();
    const res = await request(app)
      .patch('/api/users/me/password')
      .set(auth(user.token))
      .send({ currentPassword: user.password, newPassword: 'BrandNewPass1' });

    expect(res.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'BrandNewPass1' });
    expect(newLogin.status).toBe(200);
  });

  it('rejects an incorrect current password', async () => {
    const user = await registerUser();
    const res = await request(app)
      .patch('/api/users/me/password')
      .set(auth(user.token))
      .send({ currentPassword: 'WrongPass1', newPassword: 'BrandNewPass1' });
    expect(res.status).toBe(400);
  });
});

describe('Admin routes', () => {
  async function createAdmin() {
    const email = uniqueEmail('admin');
    await User.create({
      name: 'Admin',
      email,
      passwordHash: 'AdminPass123',
      role: 'admin',
    });
    const login = await request(app).post('/api/auth/login').send({ email, password: 'AdminPass123' });
    return login.body.accessToken as string;
  }

  it('lists users for an admin', async () => {
    const token = await createAdmin();
    await registerUser();
    const res = await request(app).get('/api/users').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination).toBeDefined();
  });

  it('promotes and demotes users', async () => {
    const token = await createAdmin();
    const user = await registerUser();

    const promote = await request(app)
      .patch(`/api/users/${user.userId}/role`)
      .set(auth(token))
      .send({ role: 'admin' });
    expect(promote.status).toBe(200);
    expect(promote.body.user.role).toBe('admin');

    const demote = await request(app)
      .patch(`/api/users/${user.userId}/role`)
      .set(auth(token))
      .send({ role: 'user' });
    expect(demote.body.user.role).toBe('user');
  });
});
