import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { describeDb } from '../helpers/db';

describeDb('GET /health', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 for root liveness endpoint', async () => {
    const response = await app.inject({ method: 'GET', url: '/' });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(body.status).toBe('ok');
    expect(body.service).toBe('policymint-api');
    expect(typeof body.version).toBe('string');
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
    expect(typeof body.environment).toBe('string');
  });

  it('returns 200 for /health liveness endpoint', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(body.status).toBe('healthy');
    expect(typeof body.uptime).toBe('number');
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('rejects unsupported HTTP methods', async () => {
    const response = await app.inject({ method: 'POST', url: '/health' });
    expect([404, 405]).toContain(response.statusCode);
  });
});
