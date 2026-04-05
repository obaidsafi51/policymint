import { env } from '../../config/env.js';
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
};

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function mapAction(intent: EvaluateIntentInput): string {
  const side = typeof intent.params?.side === 'string' ? intent.params.side.toLowerCase() : null;

  if (side === 'buy' || side === 'sell') {
    return side.toUpperCase();
  }

  if (intent.action_type === 'trade' || intent.action_type === 'swap') {
    return 'BUY';
  }

  return 'SELL';
}

function toUnitAmount(amountRaw: string, decimals: number): number {
  const amount = BigInt(amountRaw);
  const divisor = BigInt(10) ** BigInt(decimals);
  const integerPart = amount / divisor;
  const fractionPart = amount % divisor;
  const fractionAsNumber = Number(fractionPart) / Number(divisor);

  return Number(integerPart) + fractionAsNumber;
}

async function getKrakenUsdPrice(tokenSymbol: string): Promise<number> {
  if (env.NODE_ENV === 'test') {
    return 1;
  }

  const normalized = normalizeSymbol(tokenSymbol);
  const pair = TOKEN_TO_KRAKEN_PAIR[normalized] ?? `${normalized}USD`;
  const url = `https://api.kraken.com/0/public/Ticker?pair=${encodeURIComponent(pair)}`;
  const response = await fetch(url);

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

  return price;
}

function resolvePair(tokenIn: string, tokenOut?: string): string {
  const base = normalizeSymbol(tokenIn);
  const quote = normalizeSymbol(tokenOut ?? 'USD');
  return `${base}${quote}`;
}

export async function mapToRiskRouterIntent(input: {
  intent: EvaluateIntentInput;
  erc8004TokenId: string;
  agentWalletAddress: `0x${string}`;
  nonce: number;
  defaultMaxSlippageBps?: number;
}): Promise<RiskRouterTradeIntent> {
  const tokenIn = normalizeSymbol(input.intent.token_in);
  const tokenOut = normalizeSymbol(input.intent.token_out ?? 'USD');
  const decimals = TOKEN_DECIMALS[tokenIn] ?? 18;
  const priceUsd = await getKrakenUsdPrice(tokenIn);
  const amountUnits = toUnitAmount(input.intent.amount, decimals);
  const amountUsdScaled = BigInt(Math.max(0, Math.round(amountUnits * priceUsd * 1_000_000)));
  const maxSlippageBpsFromParams = Number(input.intent.params?.max_slippage_bps ?? NaN);
  const maxSlippageBps = Number.isFinite(maxSlippageBpsFromParams)
    ? Math.max(1, Math.floor(maxSlippageBpsFromParams))
    : input.defaultMaxSlippageBps ?? 50;

  return {
    agentId: BigInt(input.erc8004TokenId),
    agentWallet: input.agentWalletAddress,
    pair: resolvePair(tokenIn, tokenOut),
    action: mapAction(input.intent),
    amountUsdScaled,
    maxSlippageBps: BigInt(maxSlippageBps),
    nonce: BigInt(input.nonce),
    deadline: BigInt(Math.floor(Date.now() / 1_000) + 300),
  };
}
