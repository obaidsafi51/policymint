export function formatAddress(value: string): string {
  if (!value) return '—';
  if (value.length <= 10) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
