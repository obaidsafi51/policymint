export type SimDirection = 'buy' | 'sell';

export function formatPair(tokenIn: string, tokenOut?: string): string {
  const base = tokenIn.trim().toUpperCase();
  const quote = (tokenOut ?? 'USD').trim().toUpperCase();
  return `${base}${quote}`;
}

export function resolveDirection(input: {
  actionType: string;
  params?: Record<string, unknown>;
}): SimDirection {
  const actionType = input.actionType.trim().toLowerCase();

  if (actionType === 'sell') {
    return 'sell';
  }

  if (actionType === 'buy') {
    return 'buy';
  }

  const side = String(input.params?.side ?? input.params?.direction ?? '').trim().toLowerCase();
  if (side === 'sell') {
    return 'sell';
  }

  return 'buy';
}

export function formatAction(direction: SimDirection): 'BUY' | 'SELL' {
  return direction === 'sell' ? 'SELL' : 'BUY';
}
