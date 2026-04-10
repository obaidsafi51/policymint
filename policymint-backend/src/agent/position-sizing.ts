const USD_SCALE = 1_000_000;
const MIN_POSITION_USD = 10;
const MAX_POSITION_USD = 450;

export function computeAmountUsdScaled(input: {
  spendCapPerTxUsd: number;
  drawdownRiskScore: number;
  confidence: number;
}): bigint {
  const normalizedCap = Math.min(Math.max(input.spendCapPerTxUsd, MIN_POSITION_USD), MAX_POSITION_USD);
  const normalizedRisk = Math.min(Math.max(input.drawdownRiskScore, 0), 1);
  const normalizedConfidence = Math.min(Math.max(input.confidence, 0), 1);

  let usdPosition = normalizedCap * (1 - normalizedRisk);
  usdPosition = Math.max(MIN_POSITION_USD, Math.min(MAX_POSITION_USD, usdPosition));

  if (normalizedConfidence < 0.6) {
    usdPosition /= 2;
    usdPosition = Math.max(MIN_POSITION_USD, usdPosition);
  }

  return BigInt(Math.round(usdPosition * USD_SCALE));
}
