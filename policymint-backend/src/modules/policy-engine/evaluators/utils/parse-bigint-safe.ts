export function parseBigIntSafe(value: unknown): bigint | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  try {
    return BigInt(value.trim());
  } catch {
    return null;
  }
}
