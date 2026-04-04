# Engineering Change Note: Root Liveness Route

Date: 2026-04-04  
Service: PolicyMint Backend (`policymint-backend`)

## Summary
Implemented missing root-level liveness support by adding `GET /` and `GET /health` handlers and registering them at application root scope.

## Problem Statement
The API did not expose `GET /`, so requests to service root returned Fastify JSON 404. This can affect platform liveness checks that target the root path.

## Root Cause
Health routes were previously registered with a `/health` prefix while the plugin itself defined `/`, producing only `/health` and no root handler intended for service liveness.

## Changes Implemented
1. Updated health routes plugin to expose two explicit handlers:
   - `GET /` returns service metadata (`status`, `service`, `version`, `timestamp`, `environment`)
   - `GET /health` returns process liveness (`status`, `uptime`)
2. Registered `healthRoutes` without a route prefix so `GET /` is available.
3. Updated integration tests to validate new behavior and payload shape.

## Files Changed
- `src/modules/health/health.routes.ts`
- `src/app.ts`
- `tests/integration/health.integration.test.ts`

## Behavioral Impact
- New endpoint: `GET /` now responds with HTTP 200 JSON liveness payload.
- Existing endpoint: `GET /health` remains available and now returns `status: healthy` with `uptime`.
- No changes to auth-protected `/v1` business routes.

## Validation Performed
- Verified no TypeScript/editor diagnostics in modified files.
- Updated integration test coverage for:
  - root liveness response (`GET /`)
  - health liveness response (`GET /health`)
  - unsupported method behavior on `/health`

## Risk Assessment
Low risk.
- Scope is isolated to health routing and related tests.
- No schema, DB, auth, or policy engine logic changed.

## Rollback Plan
If needed, rollback can be done by reverting this change set (the three files listed above), which restores previous health-route behavior.

## Post-Ship Hardening (Non-Blocking)
Consider adding a readiness probe endpoint (`GET /ready`) that validates DB connectivity before the service is marked ready for traffic.

Example:

```typescript
app.get('/ready', async (_request, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return reply.code(200).send({ status: 'ready' });
  } catch (err) {
    return reply.code(503).send({ status: 'not ready', reason: 'db unreachable' });
  }
});
```

This is a reliability hardening enhancement and is not required for the current liveness-route fix.

## Approval Request
Please approve this change for deployment to ensure platform-level liveness checks can succeed on root path requests.
