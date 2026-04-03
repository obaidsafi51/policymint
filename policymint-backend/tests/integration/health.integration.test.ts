import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/db/client';
import { describeDb } from '../helpers/db';

describeDb('GET /health', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  it('returns 200 when database is healthy', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(body.status).toBe('ok');
    expect(body.db).toBe('connected');
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it('returns 503 when database query fails', async () => {
    vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('db down'));

    const response = await app.inject({ method: 'GET', url: '/health' });
    const body = response.json();

    expect(response.statusCode).toBe(503);
    expect(body.status).toBe('error');
    expect(body.db).toBe('disconnected');
  });

  it('rejects unsupported HTTP methods', async () => {
    const response = await app.inject({ method: 'POST', url: '/health' });
    expect([404, 405]).toContain(response.statusCode);
  });
});
