import { EvaluationResult } from '@prisma/client';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { prisma } from '../../db/client.js';
import { captureErrorToSentry } from '../../lib/telemetry.js';

const EVENTS_DEFAULT_LIMIT = 20;
const EVENTS_MAX_LIMIT = 100;
const BLOCKED_TRADE_ASSUMED_LOSS_RATE = 0.04;

type ConsoleErrorCode =
  | 'AGENT_NOT_FOUND'
  | 'TOKEN_MISSING'
  | 'TOKEN_INVALID'
  | 'TOKEN_EXPIRED'
  | 'AGENT_SCOPE_VIOLATION'
  | 'INVALID_WINDOW'
  | 'INVALID_CURSOR'
  | 'COMPETITION_WINDOW_NOT_CONFIGURED'
  | 'INTERNAL_ERROR';

type WindowKey = 'competition' | '24h' | '7d';

type TimelinePoint = {
  timestamp: string;
  cumulative_pnl_usd: number;
  trade_count?: number;
};

const AgentIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const EventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(EVENTS_MAX_LIMIT).default(EVENTS_DEFAULT_LIMIT),
  cursor: z.string().optional(),
  result: z.enum(['allow', 'block']).optional(),
});

const PnlQuerySchema = z.object({
  window: z.enum(['competition', '24h', '7d']).default('competition'),
});

type EvalRow = {
  id: string;
  createdAt: Date;
  result: EvaluationResult;
  amountRaw: string;
  tokenIn: string;
  intentParams: unknown;
  cycleId: string | null;
  validationRecords: Array<{ txHash: string; emittedAt: Date }>;
};

type ConfirmedExecutionRow = {
  evaluation_id: string;
  timestamp: Date;
  realized_pnl_usd: number;
};

function toEnvelope<T>(agentId: string, data: T) {
  return {
    success: true as const,
    data,
    meta: {
      agent_id: agentId,
      generated_at: new Date().toISOString(),
    },
  };
}

function sendError(reply: FastifyReply, statusCode: number, code: ConsoleErrorCode, message: string) {
  return reply.status(statusCode).send({
    success: false,
    error: {
      code,
      message,
    },
  });
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function safeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readNumericField(source: unknown, keys: string[]): number | null {
  const record = asRecord(source);
  if (!record) return null;

  for (const key of keys) {
    const value = safeNumber(record[key]);
    if (value !== null) return value;
  }

  return null;
}

function extractAmountUsd(intentParams: unknown): number {
  const amountUsd = readNumericField(intentParams, ['amount_usd', 'amountUsd', 'usd_amount']);
  if (amountUsd !== null) return amountUsd;

  const scaled = readNumericField(intentParams, ['amount_usd_scaled', 'amountUsdScaled']);
  if (scaled !== null) return scaled / 1_000_000;

  return 0;
}

function extractRealizedPnlUsd(intentParams: unknown): number {
  const direct = readNumericField(intentParams, ['realized_pnl_usd', 'realizedPnlUsd', 'pnl_usd', 'pnlUsd']);
  if (direct !== null) return direct;

  const scaled = readNumericField(intentParams, ['realized_pnl_usd_scaled', 'realizedPnlUsdScaled', 'pnlUsdScaled']);
  if (scaled !== null) return scaled / 1_000_000;

  return 0;
}

function isExecutionConfirmed(evaluation: EvalRow): boolean {
  return evaluation.validationRecords.length >= 2 || (evaluation.cycleId?.startsWith('0x') ?? false);
}

function getCompetitionWindowStart(): Date | null {
  const startRaw = env.COMPETITION_WINDOW_START_AT ?? env.HACKATHON_START_TS;
  if (!startRaw) return null;

  const parsed = new Date(startRaw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function resolveWindow(window: WindowKey): { startAt: Date; endAt: Date } | { error: 'INVALID_WINDOW' | 'COMPETITION_WINDOW_NOT_CONFIGURED' } {
  const endAt = new Date();

  if (window === 'competition') {
    const competitionStart = getCompetitionWindowStart();
    if (!competitionStart) {
      return { error: 'COMPETITION_WINDOW_NOT_CONFIGURED' };
    }

    return { startAt: competitionStart, endAt };
  }

  if (window === '24h') {
    return { startAt: new Date(endAt.getTime() - (24 * 60 * 60 * 1_000)), endAt };
  }

  if (window === '7d') {
    return { startAt: new Date(endAt.getTime() - (7 * 24 * 60 * 60 * 1_000)), endAt };
  }

  return { error: 'INVALID_WINDOW' };
}

type CursorShape =
  | { type: 'timestamp'; timestamp: Date }
  | { type: 'compound'; timestamp: Date; id: string }
  | { type: 'evaluation-id'; id: string };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseCursor(cursorRaw: string): CursorShape | null {
  const cursor = cursorRaw.trim();
  if (cursor.length === 0) return null;

  if (cursor.includes('|')) {
    const parts = cursor.split('|');
    if (parts.length !== 2) return null;

    const [timestampRaw, id] = parts;
    if (!timestampRaw || !id || !isUuid(id)) return null;

    const timestamp = new Date(timestampRaw);
    if (Number.isNaN(timestamp.getTime())) return null;

    return { type: 'compound', timestamp, id };
  }

  if (isUuid(cursor)) {
    return { type: 'evaluation-id', id: cursor };
  }

  const timestamp = new Date(cursor);
  if (Number.isNaN(timestamp.getTime())) return null;
  return { type: 'timestamp', timestamp };
}

function buildEventsNextCursor(row: { createdAt: Date; id: string } | null): string | null {
  if (!row) return null;
  return `${row.createdAt.toISOString()}|${row.id}`;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const variance = mean(values.map(value => (value - avg) ** 2));
  return Math.sqrt(variance);
}

function buildPnlSeries(input: {
  evaluations: EvalRow[];
  startAt: Date;
}): { series: TimelinePoint[]; currentPnlUsd: number; tradeCount: number; deltas: number[] } {
  let runningTotal = 0;
  let tradeCount = 0;
  const deltas: number[] = [];
  const series: TimelinePoint[] = [];

  for (const evaluation of input.evaluations) {
    if (evaluation.result !== EvaluationResult.ALLOW) continue;
    if (!isExecutionConfirmed(evaluation)) continue;

    const delta = extractRealizedPnlUsd(evaluation.intentParams);
    runningTotal += delta;
    tradeCount += 1;
    deltas.push(delta);

    series.push({
      timestamp: evaluation.createdAt.toISOString(),
      cumulative_pnl_usd: round2(runningTotal),
      trade_count: tradeCount,
    });
  }

  if (series.length === 0) {
    series.push({
      timestamp: input.startAt.toISOString(),
      cumulative_pnl_usd: 0,
      trade_count: 0,
    });
  }

  const nowIso = new Date().toISOString();
  const latest = series[series.length - 1];
  if (latest && latest.timestamp !== nowIso) {
    series.push({
      timestamp: nowIso,
      cumulative_pnl_usd: latest.cumulative_pnl_usd,
      trade_count: latest.trade_count ?? tradeCount,
    });
  }

  return {
    series,
    currentPnlUsd: round2(runningTotal),
    tradeCount,
    deltas,
  };
}

async function getConfirmedExecutions(input: {
  agentId: string;
  startAt: Date;
  endAt: Date;
}): Promise<ConfirmedExecutionRow[]> {
  const rows = await prisma.$queryRaw<Array<{
    evaluation_id: string;
    timestamp: Date;
    realized_pnl_usd: unknown;
  }>>`
    SELECT
      evaluation_id,
      COALESCE(confirmed_at, executed_at, created_at) AS timestamp,
      COALESCE(realized_pnl_usd, 0) AS realized_pnl_usd
    FROM trade_executions
    WHERE agent_id = ${input.agentId}::uuid
      AND status = 'confirmed'
      AND COALESCE(confirmed_at, executed_at, created_at) >= ${input.startAt}
      AND COALESCE(confirmed_at, executed_at, created_at) <= ${input.endAt}
    ORDER BY timestamp ASC
  `;

  return rows.map(row => ({
    evaluation_id: row.evaluation_id,
    timestamp: row.timestamp,
    realized_pnl_usd: safeNumber(row.realized_pnl_usd) ?? 0,
  }));
}

async function requireScopedAgent(request: FastifyRequest, reply: FastifyReply, targetAgentId: string) {
  if (!request.operatorContext) {
    sendError(reply, 401, 'TOKEN_MISSING', 'Missing or invalid operator token');
    return null;
  }

  if (!request.operatorContext.agentIds.includes(targetAgentId)) {
    sendError(reply, 403, 'AGENT_SCOPE_VIOLATION', 'Operator token is not scoped to the requested agent');
    return null;
  }

  const existingAgent = await prisma.agent.findUnique({
    where: { id: targetAgentId },
    select: { id: true },
  });

  if (!existingAgent) {
    sendError(reply, 404, 'AGENT_NOT_FOUND', 'Agent not found');
    return null;
  }

  return existingAgent;
}

async function runRoute<T>(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  routeName: string,
  agentId: string,
  resolver: () => Promise<{ payload: T; resultCount?: number }>,
) {
  const startedAt = Date.now();
  app.log.info({ route: routeName, agent_id: agentId, query_params: request.query }, 'Console route request start');

  try {
    const { payload, resultCount } = await resolver();
    const latencyMs = Date.now() - startedAt;

    app.log.info(
      {
        route: routeName,
        agent_id: agentId,
        latency_ms: latencyMs,
        result_count: resultCount ?? null,
        cache_hit: false,
      },
      'Console route request completed',
    );

    return reply.send(toEnvelope(agentId, payload));
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_CURSOR') {
      return sendError(reply, 400, 'INVALID_CURSOR', 'Cursor is malformed or unsupported');
    }

    const latencyMs = Date.now() - startedAt;
    app.log.error({ err: error, route: routeName, agent_id: agentId, latency_ms: latencyMs }, 'Console route failed');

    await captureErrorToSentry({
      error,
      tags: {
        route: routeName,
        agent_id: agentId,
      },
      context: {
        query_params: request.query,
      },
    });

    return sendError(reply, 500, 'INTERNAL_ERROR', 'An internal error occurred');
  }
}

export async function consoleRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/:id/profile', async (request, reply) => {
    const params = AgentIdParamsSchema.safeParse(request.params);
    if (!params.success) return sendError(reply, 404, 'AGENT_NOT_FOUND', 'Agent not found');

    const scopedAgent = await requireScopedAgent(request, reply, params.data.id);
    if (!scopedAgent) return;

    return runRoute(app, request, reply, '/v1/agents/:id/profile', scopedAgent.id, async () => {
      const agent = await prisma.agent.findUnique({
        where: { id: scopedAgent.id },
        select: {
          id: true,
          name: true,
          chainId: true,
          erc8004TokenId: true,
          registrationTxHash: true,
          vaultClaimedAt: true,
          isActive: true,
        },
      });

      if (!agent) {
        throw new Error('AGENT_NOT_FOUND');
      }

      return {
        payload: {
          id: agent.id,
          name: agent.name,
          chain_id: agent.chainId,
          erc8004_token_id: agent.erc8004TokenId,
          registration_tx_hash: agent.registrationTxHash,
          vault_claimed_at: agent.vaultClaimedAt ? agent.vaultClaimedAt.toISOString() : null,
          is_active: agent.isActive,
        },
      };
    });
  });

  app.get<{ Params: { id: string }; Querystring: z.infer<typeof EventsQuerySchema> }>('/:id/events', async (request, reply) => {
    const params = AgentIdParamsSchema.safeParse(request.params);
    if (!params.success) return sendError(reply, 404, 'AGENT_NOT_FOUND', 'Agent not found');

    const query = EventsQuerySchema.safeParse(request.query ?? {});
    if (!query.success) return sendError(reply, 400, 'INVALID_CURSOR', 'Invalid query parameters');

    const scopedAgent = await requireScopedAgent(request, reply, params.data.id);
    if (!scopedAgent) return;

    return runRoute(app, request, reply, '/v1/agents/:id/events', scopedAgent.id, async () => {
      let cursorFilter: {
        OR?: Array<{
          createdAt?: { lt: Date };
          AND?: Array<{ createdAt: Date } | { id: { lt: string } }>;
        }>;
        createdAt?: { lt: Date };
      } = {};

      if (query.data.cursor) {
        const parsedCursor = parseCursor(query.data.cursor);
        if (!parsedCursor) {
          throw new Error('INVALID_CURSOR');
        }

        if (parsedCursor.type === 'timestamp') {
          cursorFilter = { createdAt: { lt: parsedCursor.timestamp } };
        }

        if (parsedCursor.type === 'compound') {
          cursorFilter = {
            OR: [
              { createdAt: { lt: parsedCursor.timestamp } },
              {
                AND: [
                  { createdAt: parsedCursor.timestamp },
                  { id: { lt: parsedCursor.id } },
                ],
              },
            ],
          };
        }

        if (parsedCursor.type === 'evaluation-id') {
          const pivot = await prisma.intentEvaluation.findFirst({
            where: {
              id: parsedCursor.id,
              agentId: scopedAgent.id,
            },
            select: {
              id: true,
              createdAt: true,
            },
          });

          if (!pivot) {
            throw new Error('INVALID_CURSOR');
          }

          cursorFilter = {
            OR: [
              { createdAt: { lt: pivot.createdAt } },
              {
                AND: [
                  { createdAt: pivot.createdAt },
                  { id: { lt: pivot.id } },
                ],
              },
            ],
          };
        }
      }

      const rows = await prisma.intentEvaluation.findMany({
        where: {
          agentId: scopedAgent.id,
          ...(query.data.result ? { result: query.data.result.toUpperCase() as EvaluationResult } : {}),
          ...cursorFilter,
        },
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        take: query.data.limit + 1,
        select: {
          id: true,
          result: true,
          blockReason: true,
          policyId: true,
          actionType: true,
          venue: true,
          amountRaw: true,
          intentParams: true,
          createdAt: true,
          validationTxHash: true,
          validationRecords: {
            take: 1,
            orderBy: { emittedAt: 'desc' },
            select: { txHash: true },
          },
        },
      });

      const hasMore = rows.length > query.data.limit;
      const pageRows = hasMore ? rows.slice(0, query.data.limit) : rows;

      const events = pageRows.map(row => {
        const txHash = row.validationTxHash ?? row.validationRecords[0]?.txHash ?? null;
        const amountUsd = extractAmountUsd(row.intentParams);

        return {
          evaluation_id: row.id,
          result: row.result.toLowerCase(),
          reason: row.blockReason,
          policy_id: row.policyId,
          action_type: row.actionType.toLowerCase(),
          venue: row.venue,
          amount_usd: round2(amountUsd),
          validation_tx_hash: txHash,
          etherscan_url: txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : null,
          timestamp: row.createdAt.toISOString(),
        };
      });

      return {
        payload: {
          events,
          next_cursor: hasMore ? buildEventsNextCursor(pageRows[pageRows.length - 1] ?? null) : null,
        },
        resultCount: events.length,
      };
    });
  });

  app.get<{ Params: { id: string }; Querystring: z.infer<typeof PnlQuerySchema> }>('/:id/pnl', async (request, reply) => {
    const params = AgentIdParamsSchema.safeParse(request.params);
    if (!params.success) return sendError(reply, 404, 'AGENT_NOT_FOUND', 'Agent not found');

    const query = PnlQuerySchema.safeParse(request.query ?? {});
    if (!query.success) return sendError(reply, 400, 'INVALID_WINDOW', 'Window is invalid');

    const scopedAgent = await requireScopedAgent(request, reply, params.data.id);
    if (!scopedAgent) return;

    const window = resolveWindow(query.data.window);
    if ('error' in window) {
      if (window.error === 'COMPETITION_WINDOW_NOT_CONFIGURED') {
        return sendError(reply, 400, 'COMPETITION_WINDOW_NOT_CONFIGURED', 'Competition window start is not configured');
      }
      return sendError(reply, 400, 'INVALID_WINDOW', 'Window is invalid');
    }

    return runRoute(app, request, reply, '/v1/agents/:id/pnl', scopedAgent.id, async () => {
      const baselineAllocationUsd = env.HACKATHON_BASELINE_ALLOCATION_USD;
      const confirmedExecutions = await getConfirmedExecutions({
        agentId: scopedAgent.id,
        startAt: window.startAt,
        endAt: window.endAt,
      });

      let runningTotal = 0;
      const series = confirmedExecutions.map((row, index) => {
        runningTotal += row.realized_pnl_usd;
        return {
          timestamp: row.timestamp.toISOString(),
          cumulative_pnl_usd: round2(runningTotal),
          trade_count: index + 1,
        };
      });

      if (series.length === 0) {
        series.push({
          timestamp: window.startAt.toISOString(),
          cumulative_pnl_usd: 0,
          trade_count: 0,
        });
      }

      const nowIso = new Date().toISOString();
      const latest = series[series.length - 1];
      if (latest && latest.timestamp !== nowIso) {
        series.push({
          timestamp: nowIso,
          cumulative_pnl_usd: latest.cumulative_pnl_usd,
          trade_count: latest.trade_count,
        });
      }

      const currentPnlUsd = round2(runningTotal);
      const normalizedPnlPct = baselineAllocationUsd > 0 ? (currentPnlUsd / baselineAllocationUsd) * 100 : 0;

      return {
        payload: {
          window: query.data.window,
          start_at: window.startAt.toISOString(),
          end_at: window.endAt.toISOString(),
          baseline_allocation_usd: round2(baselineAllocationUsd),
          current_pnl_usd: currentPnlUsd,
          pnl_pct: round2(normalizedPnlPct),
          trade_count: confirmedExecutions.length,
          series,
        },
        resultCount: series.length,
      };
    });
  });

  app.get<{ Params: { id: string }; Querystring: z.infer<typeof PnlQuerySchema> }>(
    '/:id/drawdown-comparison',
    async (request, reply) => {
      const params = AgentIdParamsSchema.safeParse(request.params);
      if (!params.success) return sendError(reply, 404, 'AGENT_NOT_FOUND', 'Agent not found');

      const query = PnlQuerySchema.safeParse(request.query ?? {});
      if (!query.success) return sendError(reply, 400, 'INVALID_WINDOW', 'Window is invalid');

      const scopedAgent = await requireScopedAgent(request, reply, params.data.id);
      if (!scopedAgent) return;

      const window = resolveWindow(query.data.window);
      if ('error' in window) {
        if (window.error === 'COMPETITION_WINDOW_NOT_CONFIGURED') {
          return sendError(reply, 400, 'COMPETITION_WINDOW_NOT_CONFIGURED', 'Competition window start is not configured');
        }
        return sendError(reply, 400, 'INVALID_WINDOW', 'Window is invalid');
      }

      return runRoute(app, request, reply, '/v1/agents/:id/drawdown-comparison', scopedAgent.id, async () => {
        const blockedRows = await prisma.intentEvaluation.findMany({
          where: {
            agentId: scopedAgent.id,
            actionType: 'TRADE',
            result: EvaluationResult.BLOCK,
            createdAt: {
              gte: window.startAt,
              lte: window.endAt,
            },
          },
          orderBy: { createdAt: 'asc' },
          select: {
            createdAt: true,
            intentParams: true,
          },
        });

        const confirmedExecutions = await getConfirmedExecutions({
          agentId: scopedAgent.id,
          startAt: window.startAt,
          endAt: window.endAt,
        });

        let protectedRunning = 0;
        let baselineRunning = 0;
        let blockedTradeCount = 0;
        let protectedTradeCount = 0;
        const baselineAllocationUsd = env.HACKATHON_BASELINE_ALLOCATION_USD;

        const protectedSeries: TimelinePoint[] = [
          {
            timestamp: window.startAt.toISOString(),
            cumulative_pnl_usd: 0,
            trade_count: 0,
          },
        ];

        const baselineSeries: TimelinePoint[] = [
          {
            timestamp: window.startAt.toISOString(),
            cumulative_pnl_usd: 0,
            trade_count: 0,
          },
        ];

        type TimelineEvent =
          | { kind: 'confirmed'; timestamp: Date; delta: number }
          | { kind: 'blocked'; timestamp: Date; amountUsd: number };

        const timeline: TimelineEvent[] = [
          ...confirmedExecutions.map(row => ({
            kind: 'confirmed' as const,
            timestamp: row.timestamp,
            delta: row.realized_pnl_usd,
          })),
          ...blockedRows.map(row => ({
            kind: 'blocked' as const,
            timestamp: row.createdAt,
            amountUsd: extractAmountUsd(row.intentParams),
          })),
        ].sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());

        for (const event of timeline) {
          if (event.kind === 'confirmed') {
            protectedRunning += event.delta;
            baselineRunning += event.delta;
            protectedTradeCount += 1;
          } else {
            blockedTradeCount += 1;
            const fallbackAmount = baselineAllocationUsd * BLOCKED_TRADE_ASSUMED_LOSS_RATE;
            const assumedLoss = (event.amountUsd > 0 ? event.amountUsd : fallbackAmount) * BLOCKED_TRADE_ASSUMED_LOSS_RATE;
            baselineRunning -= assumedLoss;
          }

          protectedSeries.push({
            timestamp: event.timestamp.toISOString(),
            cumulative_pnl_usd: round2(protectedRunning),
            trade_count: protectedTradeCount,
          });

          baselineSeries.push({
            timestamp: event.timestamp.toISOString(),
            cumulative_pnl_usd: round2(baselineRunning),
            trade_count: protectedTradeCount + blockedTradeCount,
          });
        }

        const nowIso = new Date().toISOString();
        protectedSeries.push({
          timestamp: nowIso,
          cumulative_pnl_usd: round2(protectedRunning),
          trade_count: protectedTradeCount,
        });
        baselineSeries.push({
          timestamp: nowIso,
          cumulative_pnl_usd: round2(baselineRunning),
          trade_count: protectedTradeCount + blockedTradeCount,
        });

        const preventionValueUsd = round2(protectedRunning - baselineRunning);
        const preventionValuePct = baselineAllocationUsd > 0 ? round2((preventionValueUsd / baselineAllocationUsd) * 100) : 0;

        return {
          payload: {
            protected_series: protectedSeries.map(point => ({
              timestamp: point.timestamp,
              cumulative_pnl_usd: point.cumulative_pnl_usd,
            })),
            baseline_series: baselineSeries.map(point => ({
              timestamp: point.timestamp,
              cumulative_pnl_usd: point.cumulative_pnl_usd,
            })),
            prevention_value_usd: preventionValueUsd,
            prevention_value_pct: preventionValuePct,
            blocked_trade_count: blockedTradeCount,
            simulation_disclaimer:
              'Blocked trades are simulated as executed at requested USD size without slippage/partial-fill modeling. This is a best-effort comparison, not a full backtest.',
          },
          resultCount: timeline.length,
        };
      });
    },
  );

  app.get<{ Params: { id: string } }>('/:id/stats', async (request, reply) => {
    const params = AgentIdParamsSchema.safeParse(request.params);
    if (!params.success) return sendError(reply, 404, 'AGENT_NOT_FOUND', 'Agent not found');

    const scopedAgent = await requireScopedAgent(request, reply, params.data.id);
    if (!scopedAgent) return;

    return runRoute(app, request, reply, '/v1/agents/:id/stats', scopedAgent.id, async () => {
      const [
        totalEvaluations,
        allowCount,
        blockCount,
        allowTradeCount,
        emittedValidationCount,
        reputationRows,
      ] = await Promise.all([
        prisma.intentEvaluation.count({ where: { agentId: scopedAgent.id } }),
        prisma.intentEvaluation.count({ where: { agentId: scopedAgent.id, result: EvaluationResult.ALLOW } }),
        prisma.intentEvaluation.count({ where: { agentId: scopedAgent.id, result: EvaluationResult.BLOCK } }),
        prisma.intentEvaluation.count({
          where: {
            agentId: scopedAgent.id,
            actionType: 'TRADE',
            result: EvaluationResult.ALLOW,
          },
        }),
        prisma.validationRecord.findMany({
          where: {
            evaluation: {
              agentId: scopedAgent.id,
            },
            txHash: {
              not: '',
            },
          },
          distinct: ['evaluationId'],
          select: { evaluationId: true },
        }),
        prisma.reputationSignal.findMany({
          where: { agentId: scopedAgent.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            scoreSnapshot: true,
            createdAt: true,
          },
        }),
      ]);

      const confirmedExecutions = await prisma.$queryRaw<Array<{ realized_pnl_usd: unknown }>>`
        SELECT COALESCE(realized_pnl_usd, 0) AS realized_pnl_usd
        FROM trade_executions
        WHERE agent_id = ${scopedAgent.id}::uuid
          AND status = 'confirmed'
        ORDER BY COALESCE(confirmed_at, executed_at, created_at) ASC
      `;

      const confirmedTradeCount = confirmedExecutions.length;
      const executionSuccessRate = allowTradeCount > 0 ? (confirmedTradeCount / allowTradeCount) * 100 : 0;
      const emissionSuccessRate = totalEvaluations > 0 ? (emittedValidationCount.length / totalEvaluations) * 100 : 0;
      const blockRatePct = totalEvaluations > 0 ? (blockCount / totalEvaluations) * 100 : 0;

      const latestScore = reputationRows[0]?.scoreSnapshot ?? 0;
      const scoreWindow = reputationRows
        .map(entry => entry.scoreSnapshot)
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

      let scoreTrend: 'up' | 'down' | 'stable' = 'stable';
      if (scoreWindow.length >= 2) {
        const newest = scoreWindow[0];
        const oldest = scoreWindow[scoreWindow.length - 1];

        if (newest !== undefined && oldest !== undefined) {
          if (newest > oldest) scoreTrend = 'up';
          if (newest < oldest) scoreTrend = 'down';
        }
      }

      const tradePnls = confirmedExecutions.map(row => safeNumber(row.realized_pnl_usd) ?? 0);
      const sharpeEligible = tradePnls.length >= 3;
      const tradePnlStddev = stddev(tradePnls);

      let sharpeRatio: number | null = null;
      let sharpeDataQuality: 'ok' | 'insufficient_data' = 'insufficient_data';
      if (sharpeEligible && tradePnlStddev > 0) {
        sharpeRatio = round2(mean(tradePnls) / tradePnlStddev);
        sharpeDataQuality = 'ok';
      }

      const baselineAllocationUsd = env.HACKATHON_BASELINE_ALLOCATION_USD;
      let running = 0;
      let peak = 0;

      for (const delta of tradePnls) {
        running += delta;
        if (running > peak) peak = running;
      }

      const drawdownBase = Math.max(peak, baselineAllocationUsd);
      const currentDrawdownPct = drawdownBase > 0 ? Math.max(0, ((peak - running) / drawdownBase) * 100) : 0;
      const policyBreach = currentDrawdownPct > 4;

      return {
        payload: {
          total_evaluations: totalEvaluations,
          allow_count: allowCount,
          block_count: blockCount,
          block_rate_pct: round2(blockRatePct),
          execution_success_rate: round2(executionSuccessRate),
          emission_success_rate: round2(emissionSuccessRate),
          reputation_score: latestScore,
          score_trend: scoreTrend,
          sharpe_ratio: sharpeRatio,
          sharpe_data_quality: sharpeDataQuality,
          current_drawdown_pct: round2(currentDrawdownPct),
          policy_breach: policyBreach,
          breach_reason: policyBreach ? 'Current drawdown exceeds 4% daily loss budget threshold' : null,
          competition_window_start: getCompetitionWindowStart()?.toISOString() ?? null,
        },
      };
    });
  });
}
