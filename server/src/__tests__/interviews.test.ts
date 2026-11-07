import request from 'supertest';
import { app, auth, registerUser } from './helpers';
import { InterviewType } from '../models/Interview';

async function createInterview(token: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/interviews')
    .set(auth(token))
    .send({
      role: 'Full Stack Engineer',
      company: 'Acme Corp',
      jobDescription: 'Build React and Node.js services. MongoDB, TypeScript.',
      type: 'mixed',
      difficulty: 'medium',
      questionCount: 3,
      ...overrides,
    });
  return res;
}

describe('Interview routes (development template mode)', () => {
  it('creates an interview with generated questions', async () => {
    const user = await registerUser();
    const res = await createInterview(user.token);

    expect(res.status).toBe(201);
    expect(res.body.interview.questions).toHaveLength(3);
    expect(res.body.interview.status).toBe('in_progress');
    expect(res.body.interview.generationSource).toBe('dev-template');
    expect(res.body.warning).toEqual(expect.any(String));
    res.body.interview.questions.forEach((q: { question: string; category: string }) => {
      expect(q.question.length).toBeGreaterThan(5);
      expect(['technical', 'hr', 'behavioral']).toContain(q.category);
    });
  });

  it('runs a full mock interview: answer, follow-up, complete', async () => {
    const user = await registerUser();
    const created = await createInterview(user.token);
    const id = created.body.interview._id as string;
    const questions = created.body.interview.questions as { _id: string }[];
    const qId = questions[0]!._id;

    const answer = await request(app)
      .post(`/api/interviews/${id}/questions/${qId}/answer`)
      .set(auth(user.token))
      .send({ answer: 'I built a scalable REST API using Node.js and MongoDB with caching.' });

    expect(answer.status).toBe(200);
    expect(answer.body.evaluation.score).toBeGreaterThanOrEqual(0);
    expect(answer.body.evaluation.score).toBeLessThanOrEqual(100);
    expect(answer.body.evaluation.suggestedAnswer).toEqual(expect.any(String));

    const followUp = await request(app)
      .post(`/api/interviews/${id}/questions/${qId}/follow-up`)
      .set(auth(user.token))
      .send({});
    expect(followUp.status).toBe(200);
    const updatedQuestion = followUp.body.interview.questions.find(
      (q: { _id: string }) => q._id === qId,
    );
    expect(updatedQuestion.followUps).toHaveLength(1);
    const fId = updatedQuestion.followUps[0]._id as string;

    const followUpAnswer = await request(app)
      .post(`/api/interviews/${id}/questions/${qId}/follow-up/${fId}/answer`)
      .set(auth(user.token))
      .send({ answer: 'It reduced latency by 40 percent for peak traffic.' });
    expect(followUpAnswer.status).toBe(200);
    const answeredFollowUp = followUpAnswer.body.interview.questions
      .find((q: { _id: string }) => q._id === qId)
      .followUps.find((f: { _id: string }) => f._id === fId);
    expect(answeredFollowUp.feedback).toBeDefined();

    const complete = await request(app)
      .post(`/api/interviews/${id}/complete`)
      .set(auth(user.token))
      .send({});
    expect(complete.status).toBe(200);
    expect(complete.body.interview.status).toBe('completed');
    expect(complete.body.interview.overallScore).toBeGreaterThan(0);
    expect(complete.body.interview.skillScores.technical).toEqual(expect.any(Number));
    expect(complete.body.interview.summary).toEqual(expect.any(String));
    expect(complete.body.interview.completedAt).toBeDefined();
  });

  it('refuses to complete without any answers', async () => {
    const user = await registerUser();
    const created = await createInterview(user.token);
    const id = created.body.interview._id as string;

    const res = await request(app)
      .post(`/api/interviews/${id}/complete`)
      .set(auth(user.token))
      .send({});
    expect(res.status).toBe(400);
  });

  it('downloads a PDF report', async () => {
    const user = await registerUser();
    const created = await createInterview(user.token);
    const id = created.body.interview._id as string;
    const qId = created.body.interview.questions[0]._id as string;

    await request(app)
      .post(`/api/interviews/${id}/questions/${qId}/answer`)
      .set(auth(user.token))
      .send({ answer: 'A detailed answer with concrete measurable results and reflection.' });
    await request(app).post(`/api/interviews/${id}/complete`).set(auth(user.token)).send({});

    const report = await request(app).get(`/api/interviews/${id}/report`).set(auth(user.token));
    expect(report.status).toBe(200);
    expect(report.headers['content-type']).toContain('application/pdf');
    expect(report.body.slice(0, 5).toString()).toBe('%PDF-');
  });

  it('lists interviews with pagination and filters', async () => {
    const user = await registerUser();
    await createInterview(user.token, { type: 'technical' });
    await createInterview(user.token, { type: 'hr' });

    const all = await request(app).get('/api/interviews?page=1&limit=1').set(auth(user.token));
    expect(all.status).toBe(200);
    expect(all.body.items).toHaveLength(1);
    expect(all.body.pagination.total).toBe(2);
    expect(all.body.pagination.hasNextPage).toBe(true);

    const filtered = await request(app)
      .get('/api/interviews?type=hr')
      .set(auth(user.token));
    expect(filtered.body.items).toHaveLength(1);
    expect(filtered.body.items[0].type).toBe('hr');
  });

  it('isolates interviews between users', async () => {
    const owner = await registerUser();
    const intruder = await registerUser();
    const created = await createInterview(owner.token);
    const id = created.body.interview._id as string;

    const res = await request(app).get(`/api/interviews/${id}`).set(auth(intruder.token));
    expect(res.status).toBe(404);
  });

  it('validates the create payload', async () => {
    const user = await registerUser();
    const res = await request(app)
      .post('/api/interviews')
      .set(auth(user.token))
      .send({ role: 'X', questionCount: 100 });
    expect(res.status).toBe(400);
  });

  it('supports the InterviewType enum', () => {
    expect(['technical', 'hr', 'behavioral', 'mixed']).toContain('mixed' as InterviewType);
  });
});
