process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/esports_test?schema=public';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret-that-is-at-least-32-chars';

const request = require('supertest');
const app = require('../src/app');

describe('application foundation', () => {
  it('serves the public home page', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Champion Lounge');
  });

  it('protects the player dashboard', async () => {
    const response = await request(app).get('/dashboard');
    expect(response.status).toBe(302);
  });
});
