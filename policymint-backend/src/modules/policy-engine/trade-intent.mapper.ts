import { env } from '../../config/env.js';
import { publicClient } from '../../lib/blockchain/client.js';
import type { EvaluateIntentInput } from './evaluate.schema.js';

export interface RiskRouterTradeIntent {
  agentId: bigint;
  agentWallet: `0x${string}`;
  pair: string;
  action: string;
  amountUsdScaled: bigint;
  maxSlippageBps: bigint;
  nonce: bigint;
  deadline: bigint;
}

const TOKEN_DECIMALS: Record<string, number> = {
  ETH: 18,
  WETH: 18,
  BTC: 8,
  XBT: 8,
  WBTC: 8,
  SOL: 9,
  USDC: 6,
  USDT: 6,
  DAI: 18,
  USD: 6,
};

const TOKEN_TO_KRAKEN_PAIR: Record<string, string> = {
  ETH: 'XETHZUSD',
  WETH: 'XETHZUSD',
  BTC: 'XXBTZUSD',
  XBT: 'XXBTZUSD',
  WBTC: 'XXBTZUSD',
  SOL: 'SOLUSD',
  USDC: 'USDCUSD',
  USDT: 'USDTUSD',
  DAI: 'DAIUSD',
  USD: 'USDUSD',
};

const PRICE_CACHE_TTL_MS = 30_000;
const KRAKEN_FETCH_TIMEOUT_MS = 3_000;
const MAX_SLIPPAGE_BPS = 200;
const MAX_SAFE_INTEGER_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);
const priceCache = new Map<string, { price: number; expiresAt: number }>();

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function mapAction(intent: EvaluateIntentInput): string {
  if (intent.action_type !== 'trade') {
    throw new Error(`Unsupported action_type for RiskRouter: ${intent.action_type}`);
  }

  const side = typeof intent.params?.side === 'string' ? intent.params.side.toLowerCase() : null;

  if (side === 'buy' || side === 'sell') {
    return side.toUpperCase();
  }

  throw new Error('RiskRouter trade intents require params.side as buy or sell');
}

function toUnitAmount(amountRaw: string, decimals: number): number {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error(`Invalid token decimals: ${decimals}`);
  }

  const amount = BigInt(amountRaw);
  const divisor = BigInt(10) ** BigInt(decimals);
  const integerPart = amount / divisor;

  if (integerPart > MAX_SAFE_INTEGER_BIGINT || integerPart < -MAX_SAFE_INTEGER_BIGINT) {
    throw new Error('Amount exceeds safe integer range');
  }

  const fractionPart = amount % divisor;
  const fractionAsNumber = Number(fractionPart) / Number(divisor);

  return Number(integerPart) + fractionAsNumber;
}

async function getKrakenUsdPrice(tokenSymbol: string): Promise<number> {
  if (env.NODE_ENV === 'test') return 1;

  const normalized = normalizeSymbol(tokenSymbol);
  const now = Date.now();
  const cached = priceCache.get(normalized);
  if (cached && cached.expiresAt > now) return cached.price;

  const pair = TOKEN_TO_KRAKEN_PAIR[normalized] ?? `${normalized}USD`;
  const url = `https://api.kraken.com/0/public/Ticker?pair=${encodeURIComponent(pair)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), KRAKEN_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Kraken ticker request timed out after ${KRAKEN_FETCH_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Kraken ticker request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    error?: string[];
    result?: Record<string, { c?: [string] }>;
  };

  if (payload.error && payload.error.length > 0) {
    throw new Error(`Kraken ticker error: ${payload.error.join(', ')}`);
  }

  const resultEntry = payload.result ? Object.values(payload.result)[0] : undefined;
  const lastTraded = resultEntry?.c?.[0];

  if (!lastTraded) {
    throw new Error(`Kraken ticker result missing for pair ${pair}`);
  }

  const price = Number.parseFloat(lastTraded);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid Kraken price for ${pair}: ${lastTraded}`);
  }

  priceCache.set(normalized, { price, expiresAt: now + PRICE_CACHE_TTL_MS });
  return price;
}

async function getPrismUsdPrice(tokenSymbol: string): Promise<number | null> {
  if (env.NODE_ENV === 'test') return 1;

  const normalized = normalizeSymbol(tokenSymbol);
  const url = `${env.PRISM_BASE_URL.replace(/\/$/, '')}/crypto/${encodeURIComponent(normalized)}/price`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), KRAKEN_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${env.PRISM_API_KEY}` },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as Record<string, unknown>;
    const candidate = payload.priceUsd ?? payload.price_usd ?? payload.price ?? payload.usd ?? payload.value;
    const parsed = Number(candidate);

    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveUsdPrice(tokenSymbol: string): Promise<number> {
  if (normalizeSymbol(tokenSymbol) === 'USD') return 1;

  const prismPrice = await getPrismUsdPrice(tokenSymbol);
  if (prismPrice !== null) return prismPrice;

  return getKrakenUsdPrice(tokenSymbol);
}

function resolvePair(tokenIn: string, tokenOut?: string): string {
  const base = normalizeSymbol(tokenIn);
  const quote = normalizeSymbol(tokenOut ?? 'USD');
  return `${base}/${quote}`;
}

async function getChainDeadline(secondsFromNow: number): Promise<bigint> {
  if (env.NODE_ENV === 'test') {
    return BigInt(Math.floor(Date.now() / 1_000) + secondsFromNow);
  }

  const latestBlock = await publicClient.getBlock({ blockTag: 'latest' });
  return latestBlock.timestamp + BigInt(secondsFromNow);
}

export async function mapToRiskRouterIntent(input: {
  intent: EvaluateIntentInput;
  erc8004TokenId: string;
  agentWalletAddress: `0x${string}`;
  nonce: bigint;
  defaultMaxSlippageBps?: number;
}): Promise<RiskRouterTradeIntent> {
  const pairFromParams = typeof input.intent.params?.pair === 'string' ? input.intent.params.pair.trim() : '';
  const tokenIn = normalizeSymbol(input.intent.token_in);
  const tokenOut = normalizeSymbol(input.intent.token_out ?? 'USD');
  const decimals = TOKEN_DECIMALS[tokenIn] ?? 18;
  const priceUsd = await resolveUsdPrice(tokenIn);
  const amountUnits = toUnitAmount(input.intent.amount, decimals);
  const amountUsdScaled = BigInt(Math.max(0, Math.round(amountUnits * priceUsd * 1_000_000)));

  const maxSlippageBpsFromParams = Number(input.intent.params?.max_slippage_bps ?? NaN);
  const maxSlippageBps = Number.isFinite(maxSlippageBpsFromParams)
    ? Math.max(1, Math.floor(maxSlippageBpsFromParams))
    : input.defaultMaxSlippageBps ?? 50;

  if (maxSlippageBps > MAX_SLIPPAGE_BPS) {
    throw new Error(`maxSlippageBps exceeds backend ceiling (${MAX_SLIPPAGE_BPS})`);
  }

  const deadline = await getChainDeadline(300);

  return {
    agentId: BigInt(input.erc8004TokenId),
    agentWallet: input.agentWalletAddress,
    pair: pairFromParams.includes('/') ? pairFromParams.toUpperCase() : resolvePair(tokenIn, tokenOut),
    action: mapAction(input.intent),
    amountUsdScaled,
    maxSlippageBps: BigInt(maxSlippageBps),
    nonce: input.nonce,
    deadline,
  };
}