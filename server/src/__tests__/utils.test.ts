import { extractSkills, SKILL_DICTIONARY } from '../services/extraction/skills';
import { buildPaginated, parsePagination } from '../utils/pagination';
import { parseDurationToMs, signAccessToken, verifyAccessToken, hashToken } from '../utils/token';

describe('extractSkills', () => {
  it('detects skills mentioned in text', () => {
    const text = 'Experienced with React, TypeScript, Node.js, MongoDB and AWS.';
    const skills = extractSkills(text);
    expect(skills).toEqual(expect.arrayContaining(['React', 'TypeScript', 'Node.js', 'MongoDB', 'AWS']));
  });

  it('does not match partial words', () => {
    const skills = extractSkills('I enjoy reacting to feedback and going for a walk.');
    expect(skills).not.toContain('React');
    expect(skills).not.toContain('Go');
  });

  it('prefers longer multi-word skills', () => {
    const skills = extractSkills('We used Machine Learning and Deep Learning in production.');
    expect(skills).toEqual(expect.arrayContaining(['Machine Learning', 'Deep Learning']));
  });

  it('returns an empty array for empty input', () => {
    expect(extractSkills('')).toEqual([]);
  });

  it('has a reasonably sized dictionary', () => {
    expect(SKILL_DICTIONARY.length).toBeGreaterThan(50);
  });
});

describe('pagination', () => {
  it('defaults to page 1 with a sane limit', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it('clamps limit to a maximum of 100 and a minimum of 1', () => {
    expect(parsePagination({ limit: '9999' }).limit).toBe(100);
    expect(parsePagination({ limit: '0' }).limit).toBe(1);
  });

  it('computes skip from the page', () => {
    expect(parsePagination({ page: '3', limit: '10' }).skip).toBe(20);
  });

  it('builds pagination metadata', () => {
    const result = buildPaginated([1, 2], 25, { page: 2, limit: 10, skip: 10 });
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    });
  });
});

describe('tokens', () => {
  it('signs and verifies an access token', () => {
    const token = signAccessToken({ sub: 'abc123', role: 'user' });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('abc123');
    expect(payload.role).toBe('user');
  });

  it('hashes tokens deterministically', () => {
    expect(hashToken('hello')).toBe(hashToken('hello'));
    expect(hashToken('hello')).not.toBe(hashToken('world'));
    expect(hashToken('hello')).toHaveLength(64);
  });

  it('parses duration strings', () => {
    expect(parseDurationToMs('15m')).toBe(15 * 60 * 1000);
    expect(parseDurationToMs('7d')).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
