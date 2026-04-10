export interface PositionSizingInput {
  spendCapPerTxUsd: number;
  drawdownRiskScore: number;
  confidence: number;
}

export interface PositionSizingResult {
  usdAmount: number;
  amountUsdScaled: bigint;
}

const MIN_USD_POSITION = 10;
const MAX_USD_POSITION = 450;
const USD_SCALE = 1_000_000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computePositionSizing(input: PositionSizingInput): PositionSizingResult {
  const safeCap = clamp(input.spendCapPerTxUsd, 0, MAX_USD_POSITION);
  const drawdownRiskScore = clamp(input.drawdownRiskScore, 0, 1);
  const confidence = clamp(input.confidence, 0, 1);

  let usdAmount = safeCap * (1 - drawdownRiskScore);

  if (confidence < 0.6) {
    usdAmount = usdAmount * 0.5;
  }

  const minPosition = safeCap >= MIN_USD_POSITION ? MIN_USD_POSITION : 0;
  usdAmount = clamp(usdAmount, minPosition, safeCap);
  const scaled = BigInt(Math.round(usdAmount * USD_SCALE));

  return {
    usdAmount,
    amountUsdScaled: scaled,
  };
}
