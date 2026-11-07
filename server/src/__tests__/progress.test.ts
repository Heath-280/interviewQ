import request from 'supertest';
import { app, auth, registerUser } from './helpers';

async function completeAnInterview(token: string) {
  const created = await request(app)
    .post('/api/interviews')
    .set(auth(token))
    .send({ role: 'Data Engineer', type: 'technical', questionCount: 3, difficulty: 'easy' });
  const id = created.body.interview._id as string;
  const qId = created.body.interview.questions[0]._id as string;
  await request(app)
    .post(`/api/interviews/${id}/questions/${qId}/answer`)
    .set(auth(token))
    .send({ answer: 'A thorough answer describing the pipeline, trade-offs, and results.' });
  await request(app).post(`/api/interviews/${id}/complete`).set(auth(token)).send({});
  return id;
}

describe('Progress routes', () => {
  it('returns an empty-state overview for a brand new user', async () => {
    const user = await registerUser();
    const res = await request(app).get('/api/progress').set(auth(user.token));

    expect(res.status).toBe(200);
    expect(res.body.totals.interviews).toBe(0);
    expect(res.body.averageScore).toBe(0);
    expect(res.body.scoreTrend).toEqual([]);
    expect(res.body.recentInterviews).toEqual([]);
  });

  it('aggregates totals, scores, skills, and trend after an interview', async () => {
    const user = await registerUser();
    await completeAnInterview(user.token);

    const res = await request(app).get('/api/progress').set(auth(user.token));
    expect(res.status).toBe(200);
    expect(res.body.totals.interviews).toBe(1);
    expect(res.body.totals.completed).toBe(1);
    expect(res.body.totals.answers).toBeGreaterThan(0);
    expect(res.body.averageScore).toBeGreaterThan(0);
    expect(res.body.bestScore).toBeGreaterThan(0);
    expect(res.body.scoreTrend).toHaveLength(1);
    expect(res.body.skillAverages.technical).toEqual(expect.any(Number));
    expect(res.body.recentInterviews).toHaveLength(1);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/progress');
    expect(res.status).toBe(401);
  });
});
