jest.mock('../services/ai/provider', () => {
  const actual = jest.requireActual('../services/ai/provider');
  return {
    ...actual,
    isConfigured: jest.fn(() => true),
    chat: jest.fn(),
  };
});

import * as aiService from '../services/ai/aiService';
import * as provider from '../services/ai/provider';

const chatMock = provider.chat as jest.MockedFunction<typeof provider.chat>;

describe('AI service retry behaviour', () => {
  beforeEach(() => {
    chatMock.mockReset();
  });

  it('retries when the model returns malformed JSON, then succeeds', async () => {
    chatMock
      .mockResolvedValueOnce('```json\n{"questions":[{"category":"technical","question":') // truncated
      .mockResolvedValueOnce(
        JSON.stringify({ questions: [{ category: 'technical', question: 'Explain closures.' }] }),
      );

    const artifact = await aiService.generateQuestions({
      role: 'Frontend Engineer',
      type: 'technical',
      difficulty: 'medium',
      count: 1,
    });

    expect(chatMock).toHaveBeenCalledTimes(2);
    expect(artifact.source).toBe('ai');
    expect(artifact.data[0]?.question).toBe('Explain closures.');
  });

  it('throws a 503 shape error after exhausting retries', async () => {
    chatMock.mockResolvedValue('totally not json');

    await expect(
      aiService.evaluateAnswer({
        role: 'Backend Engineer',
        category: 'technical',
        question: 'Explain indexes.',
        answer: 'An index speeds up lookups.',
      }),
    ).rejects.toMatchObject({ statusCode: 503 });

    expect(chatMock).toHaveBeenCalledTimes(3);
  });

  it('retries when JSON is valid but the shape is wrong', async () => {
    chatMock
      .mockResolvedValueOnce(JSON.stringify({ notQuestions: true }))
      .mockResolvedValueOnce(
        JSON.stringify({ questions: [{ category: 'hr', question: 'Why this role?' }] }),
      );

    const artifact = await aiService.generateQuestions({
      role: 'Product Manager',
      type: 'hr',
      difficulty: 'easy',
      count: 1,
    });

    expect(artifact.data[0]?.category).toBe('hr');
  });
});
