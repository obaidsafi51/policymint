import { Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../db/client.js';
import { submitTradeIntent, waitForTradeIntentConfirmation } from '../../lib/blockchain/riskRouter.js';
import type { RiskRouterTradeIntent } from './trade-intent.mapper.js';
import { KrakenAdapter } from '../../exchange/kraken.js';
import { getKrakenCliReadiness } from '../../exchange/kraken-readiness.js';

const KRAKEN_PRICE_TIMEOUT_MS = 2_000;
const RISK_ROUTER_CONFIRM_TIMEOUT_MS = 30_000;
const TIMEOUT_RETRY_DELAY_MS = 5_000;

type ExecutionPath = 'kraken_cli' | 'risk_router';

export type TradeExecutionStatus =
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'timeout'
  | 'rejected'
  | 'abandoned'
  | 'skipped';

export interface ExecutionResult {
  status: TradeExecutionStatus;
  executionPath: ExecutionPath;
  executionReference: string | null;
  reason: string | null;
  fillPrice: number | null;
  fillVolume: number | null;
  realizedPnlUsd: number | null;
  errorCode: string | null;
  rawResponse: Record<string, unknown>;
}

interface ExecuteTradeIntentInput {
  agentId: string;
  evaluationId: string;
  venue: string;
  riskIntent: RiskRouterTradeIntent;
  signedIntent: `0x${string}`;
}

function isKrakenVenue(venue: string): boolean {
  return venue.trim().toLowerCase().startsWith('kraken');
}

function isKrakenExecutionEnabled(): boolean {
  const readiness = getKrakenCliReadiness();
  return env.KRAKEN_EXECUTION_ENABLED && readiness.ready;
}

export function shouldSkipKrakenExecution(venue: string): boolean {
  return isKrakenVenue(venue) && !isKrakenExecutionEnabled();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizePair(pair: string): string {
  const raw = pair.trim().toUpperCase();
  if (raw.includes('/')) return raw;
  if (raw.endsWith('USD')) return `${raw.slice(0, -3)}/USD`;
  return raw;
}

function toKrakenExecutionPair(pair: string): string {
  const normalized = normalizePair(pair);
  const [base, quote] = normalized.split('/');

  if (!base || !quote) return normalized;

  const mappedBase = base === 'BTC' ? 'XBT' : base;
  return `${mappedBase}/${quote}`;
}

function toKrakenTickerSymbol(executionPair: string): string {
  const [base, quote] = executionPair.split('/');

  if (!base || !quote) {
    return executionPair.replace('/', '');
  }

  if (base === 'XBT' && quote === 'USD') return 'XXBTZUSD';
  if (base === 'ETH' && quote === 'USD') return 'XETHZUSD';
  return `${base}${quote}`;
}

async function fetchKrakenPriceUsd(executionPair: string): Promise<number> {
  const pair = toKrakenTickerSymbol(executionPair);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), KRAKEN_PRICE_TIMEOUT_MS);

  try {
    const response = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${encodeURIComponent(pair)}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`kraken_ticker_http_${response.status}`);
    }

    const payload = await response.json() as {
      error?: string[];
      result?: Record<string, { c?: [string] }>;
    };

    if (Array.isArray(payload.error) && payload.error.length > 0) {
      throw new Error(payload.error.join(','));
    }

    const ticker = payload.result ? Object.values(payload.result)[0] : undefined;
    const lastTraded = ticker?.c?.[0];
    const price = Number(lastTraded);

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('invalid_kraken_price');
    }

    return price;
  } finally {
    clearTimeout(timeout);
  }
}

function formatVolume(amountUsdScaled: bigint, priceUsd: number): number {
  const amountUsd = Number(amountUsdScaled) / 1_000_000;
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return 0;
  const volume = amountUsd / priceUsd;
  return Math.max(0, Number(volume.toFixed(8)));
}

function extractKrakenOrderId(output: string): string | null {
  try {
    const parsed = JSON.parse(output) as Record<string, unknown>;
    const txid = parsed.txid;

    if (Array.isArray(txid) && typeof txid[0] === 'string') {
      return txid[0];
    }

    if (typeof parsed.order_id === 'string') return parsed.order_id;
    if (typeof parsed.id === 'string') return parsed.id;
  } catch {
    const match = output.match(/(?:txid|order[_\s-]*id|id)\s*[:=]\s*([a-zA-Z0-9_-]+)/i);
    if (match?.[1]) return match[1];
  }

  return null;
}

function classifyKrakenFailure(stderr: string): { status: TradeExecutionStatus; errorCode: string | null } {
  const normalized = stderr.toLowerCase();

  if (normalized.includes('insufficient funds')) {
    return { status: 'rejected', errorCode: 'insufficient_funds' };
  }

  if (normalized.includes('invalid pair') || normalized.includes('unknown asset pair')) {
    return { status: 'rejected', errorCode: 'invalid_pair' };
  }

  if (normalized.includes('invalid key') || normalized.includes('authentication')) {
    return { status: 'rejected', errorCode: 'auth_error' };
  }

  return { status: 'failed', errorCode: null };
}

async function createPendingExecution(input: {
  agentId: string;
  evaluationId: string;
  executionPath: ExecutionPath;
  pair: string;
  action: string;
  amountUsdScaled: bigint;
}) {
  await prisma.$executeRaw`
    INSERT INTO trade_executions (
      agent_id,
      evaluation_id,
      execution_path,
      status,
      pair,
      action,
      amount_usd_scaled,
      executed_at,
      created_at,
      updated_at
    ) VALUES (
      ${input.agentId}::uuid,
      ${input.evaluationId}::uuid,
      ${input.executionPath},
      'pending',
      ${input.pair},
      ${input.action},
      ${input.amountUsdScaled.toString()}::bigint,
      NOW(),
      NOW(),
      NOW()
    )
  `;
}

async function updateExecutionResult(input: {
  evaluationId: string;
  status: TradeExecutionStatus;
  fillPrice?: number | null;
  fillVolume?: number | null;
  realizedPnlUsd?: number | null;
  orderId?: string | null;
  rawResponse?: Record<string, unknown>;
}) {
  await prisma.$executeRaw`
    UPDATE trade_executions
    SET
      status = ${input.status},
      fill_price = ${input.fillPrice ?? null},
      fill_volume = ${input.fillVolume ?? null},
      realized_pnl_usd = ${input.realizedPnlUsd ?? null},
      order_id = ${input.orderId ?? null},
      raw_response = ${input.rawResponse ? (input.rawResponse as Prisma.JsonObject) : null},
      confirmed_at = ${input.status === 'confirmed' ? new Date() : null},
      updated_at = NOW()
    WHERE evaluation_id = ${input.evaluationId}::uuid
  `;
}

async function waitForRiskRouterWithTimeout(txHash: `0x${string}`) {
  await Promise.race([
    waitForTradeIntentConfirmation(txHash),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('riskrouter_confirmation_timeout')), RISK_ROUTER_CONFIRM_TIMEOUT_MS);
    }),
  ]);
}

async function executeViaRiskRouter(input: {
  evaluationId: string;
  riskIntent: RiskRouterTradeIntent;
  signedIntent: `0x${string}`;
}): Promise<ExecutionResult> {
  try {
    const submission = await submitTradeIntent({
      intent: input.riskIntent,
      signature: input.signedIntent,
    });

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await waitForRiskRouterWithTimeout(submission.txHash);

        const result: ExecutionResult = {
          status: 'confirmed',
          executionPath: 'risk_router',
          executionReference: submission.txHash,
          reason: null,
          fillPrice: null,
          fillVolume: null,
          realizedPnlUsd: 0,
          errorCode: null,
          rawResponse: {
            tx_hash: submission.txHash,
            confirmation_attempts: attempt,
          },
        };

        await updateExecutionResult({
          evaluationId: input.evaluationId,
          status: result.status,
          realizedPnlUsd: result.realizedPnlUsd,
          rawResponse: result.rawResponse,
        });

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const timedOut = message.includes('timeout');

        if (timedOut && attempt < 2) {
          await sleep(TIMEOUT_RETRY_DELAY_MS);
          continue;
        }

        const status: TradeExecutionStatus = timedOut ? 'abandoned' : 'failed';

        const result: ExecutionResult = {
          status,
          executionPath: 'risk_router',
          executionReference: submission.txHash,
          reason: timedOut ? 'riskrouter_confirmation_timeout' : message,
          fillPrice: null,
          fillVolume: null,
          realizedPnlUsd: null,
          errorCode: timedOut ? 'confirmation_timeout' : null,
          rawResponse: {
            tx_hash: submission.txHash,
            error: message,
          },
        };

        await updateExecutionResult({
          evaluationId: input.evaluationId,
          status: result.status,
          rawResponse: result.rawResponse,
        });

        return result;
      }
    }

    const fallback: ExecutionResult = {
      status: 'failed',
      executionPath: 'risk_router',
      executionReference: null,
      reason: 'riskrouter_unknown_failure',
      fillPrice: null,
      fillVolume: null,
      realizedPnlUsd: null,
      errorCode: null,
      rawResponse: { error: 'riskrouter_unknown_failure' },
    };

    await updateExecutionResult({
      evaluationId: input.evaluationId,
      status: fallback.status,
      rawResponse: fallback.rawResponse,
    });

    return fallback;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    const result: ExecutionResult = {
      status: 'failed',
      executionPath: 'risk_router',
      executionReference: null,
      reason: message,
      fillPrice: null,
      fillVolume: null,
      realizedPnlUsd: null,
      errorCode: null,
      rawResponse: {
        error: message,
      },
    };

    await updateExecutionResult({
      evaluationId: input.evaluationId,
      status: result.status,
      rawResponse: result.rawResponse,
    });

    return result;
  }
}

async function executeViaKrakenCli(input: {
  evaluationId: string;
  riskIntent: RiskRouterTradeIntent;
}): Promise<ExecutionResult> {
  const adapter = new KrakenAdapter();
  const pair = toKrakenExecutionPair(input.riskIntent.pair);
  const action = input.riskIntent.action.trim().toLowerCase() === 'sell' ? 'sell' : 'buy';

  let priceUsd: number;
  try {
    priceUsd = await fetchKrakenPriceUsd(pair);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    const result: ExecutionResult = {
      status: 'failed',
      executionPath: 'kraken_cli',
      executionReference: null,
      reason: message,
      fillPrice: null,
      fillVolume: null,
      realizedPnlUsd: null,
      errorCode: 'price_lookup_failed',
      rawResponse: { error: message },
    };

    await updateExecutionResult({
      evaluationId: input.evaluationId,
      status: result.status,
      rawResponse: result.rawResponse,
    });

    return result;
  }

  const volume = formatVolume(input.riskIntent.amountUsdScaled, priceUsd);

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const cliResult = action === 'sell'
      ? await adapter.paperSell(pair, volume)
      : await adapter.paperBuy(pair, volume);

    const rawResponse = {
      stdout: cliResult.stdout,
      stderr: cliResult.stderr,
      exit_code: cliResult.exitCode,
      timed_out: cliResult.timedOut,
      paper_trading: env.KRAKEN_PAPER_TRADING,
      attempt,
    };

    if (cliResult.timedOut) {
      if (attempt < 2) {
        await sleep(TIMEOUT_RETRY_DELAY_MS);
        continue;
      }

      const result: ExecutionResult = {
        status: 'abandoned',
        executionPath: 'kraken_cli',
        executionReference: null,
        reason: 'kraken_cli_timeout',
        fillPrice: null,
        fillVolume: null,
        realizedPnlUsd: null,
        errorCode: 'timeout',
        rawResponse,
      };

      await updateExecutionResult({
        evaluationId: input.evaluationId,
        status: result.status,
        rawResponse,
      });

      return result;
    }

    if (!cliResult.success) {
      const classification = classifyKrakenFailure(cliResult.stderr || cliResult.stdout);

      const result: ExecutionResult = {
        status: classification.status,
        executionPath: 'kraken_cli',
        executionReference: null,
        reason: cliResult.stderr || 'kraken_cli_failed',
        fillPrice: null,
        fillVolume: null,
        realizedPnlUsd: null,
        errorCode: classification.errorCode,
        rawResponse,
      };

      await updateExecutionResult({
        evaluationId: input.evaluationId,
        status: result.status,
        rawResponse,
      });

      return result;
    }

    const orderId = extractKrakenOrderId(cliResult.stdout);

    const result: ExecutionResult = {
      status: 'confirmed',
      executionPath: 'kraken_cli',
      executionReference: orderId,
      reason: null,
      fillPrice: priceUsd,
      fillVolume: volume,
      realizedPnlUsd: 0,
      errorCode: null,
      rawResponse,
    };

    await updateExecutionResult({
      evaluationId: input.evaluationId,
      status: result.status,
      fillPrice: result.fillPrice,
      fillVolume: result.fillVolume,
      realizedPnlUsd: result.realizedPnlUsd,
      orderId,
      rawResponse,
    });

    return result;
  }

  const fallback: ExecutionResult = {
    status: 'failed',
    executionPath: 'kraken_cli',
    executionReference: null,
    reason: 'kraken_cli_unknown_failure',
    fillPrice: null,
    fillVolume: null,
    realizedPnlUsd: null,
    errorCode: null,
    rawResponse: { error: 'kraken_cli_unknown_failure' },
  };

  await updateExecutionResult({
    evaluationId: input.evaluationId,
    status: fallback.status,
    rawResponse: fallback.rawResponse,
  });

  return fallback;
}

export async function executeTradeIntent(input: ExecuteTradeIntentInput): Promise<ExecutionResult> {
  const executionPath: ExecutionPath = isKrakenVenue(input.venue) ? 'kraken_cli' : 'risk_router';

  await createPendingExecution({
    agentId: input.agentId,
    evaluationId: input.evaluationId,
    executionPath,
    pair: normalizePair(input.riskIntent.pair),
    action: input.riskIntent.action.toLowerCase(),
    amountUsdScaled: input.riskIntent.amountUsdScaled,
  });

  if (shouldSkipKrakenExecution(input.venue)) {
    const readiness = getKrakenCliReadiness();

    const result: ExecutionResult = {
      status: 'skipped',
      executionPath: 'kraken_cli',
      executionReference: null,
      reason: readiness.ready ? 'kraken_execution_disabled' : (readiness.reason ?? 'kraken_execution_disabled'),
      fillPrice: null,
      fillVolume: null,
      realizedPnlUsd: null,
      errorCode: 'kraken_execution_disabled',
      rawResponse: {
        reason: readiness.ready ? 'kraken_execution_disabled' : readiness.reason,
      },
    };

    await updateExecutionResult({
      evaluationId: input.evaluationId,
      status: result.status,
      rawResponse: result.rawResponse,
    });

    return result;
  }

  if (executionPath === 'kraken_cli') {
    return executeViaKrakenCli({
      evaluationId: input.evaluationId,
      riskIntent: input.riskIntent,
    });
  }

  return executeViaRiskRouter({
    evaluationId: input.evaluationId,
    riskIntent: input.riskIntent,
    signedIntent: input.signedIntent,
  });
}
