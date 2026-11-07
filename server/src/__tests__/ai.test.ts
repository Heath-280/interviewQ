import request from 'supertest';
import { app, auth, registerUser } from './helpers';
import * as aiService from '../services/ai/aiService';
import { isConfigured, parseJsonResponse } from '../services/ai/provider';
import { ApiError } from '../utils/ApiError';

describe('AI service (unconfigured + development template mode)', () => {
  it('reports an unconfigured status', () => {
    const status = aiService.getStatus();
    expect(status.configured).toBe(false);
    expect(status.devMode).toBe(true);
    expect(status.message.toLowerCase()).toContain('not configured');
    expect(isConfigured()).toBe(false);
  });

  it('exposes the status over the API to authenticated users', async () => {
    const user = await registerUser();
    const res = await request(app).get('/api/ai/status').set(auth(user.token));
    expect(res.status).toBe(200);
    expect(res.body.configured).toBe(false);
    expect(res.body.devMode).toBe(true);
  });

  it('requires authentication for status', async () => {
    const res = await request(app).get('/api/ai/status');
    expect(res.status).toBe(401);
  });

  it('returns clearly-labelled template questions flagged as non-AI', async () => {
    const artifact = await aiService.generateQuestions({
      role: 'Frontend Engineer',
      type: 'mixed',
      difficulty: 'medium',
      count: 3,
    });
    expect(artifact.source).toBe('dev-template');
    expect(artifact.warning).toBeDefined();
    expect(artifact.data).toHaveLength(3);
    expect(artifact.source).not.toBe('ai');
  });

  it('labels template evaluation as development output', async () => {
    const artifact = await aiService.evaluateAnswer({
      role: 'Frontend Engineer',
      category: 'technical',
      question: 'Explain closures.',
      answer: 'A closure is a function that retains access to its lexical scope even after execution.',
    });
    expect(artifact.source).toBe('dev-template');
    expect(artifact.data.score).toBeGreaterThan(0);
    expect(artifact.data.summary.toLowerCase()).toContain('development template');
  });

  it('parseJsonResponse tolerates code fences and surrounding prose', () => {
    const parsed = parseJsonResponse<{ ok: boolean }>('Sure!\n```json\n{"ok":true}\n```');
    expect(parsed.ok).toBe(true);
  });

  it('parseJsonResponse throws a clear error on malformed JSON', () => {
    expect(() => parseJsonResponse('not json at all')).toThrow(ApiError);
  });
});
