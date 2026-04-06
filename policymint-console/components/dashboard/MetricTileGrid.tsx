import { formatNumber, formatUsd } from '@/lib/formatAmount';
import { MetricTile } from '@/components/dashboard/MetricTile';

interface MetricTileGridProps {
  reputation: number;
  pnlLatest: number;
  tradesToday: number;
  blocksToday: number;
}

export function MetricTileGrid({ reputation, pnlLatest, tradesToday, blocksToday }: MetricTileGridProps) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricTile
        label="reputation score"
        value={`${formatNumber(reputation)}`}
        subtitle="target +50"
        tone="brand"
      />
      <MetricTile
        label="cumulative pnl"
        value={formatUsd(pnlLatest)}
        subtitle="+12.4% from start"
        tone={pnlLatest >= 0 ? 'success' : 'danger'}
      />
      <MetricTile label="decisions today" value={formatNumber(tradesToday)} subtitle="live policy checks" tone="neutral" />
      <MetricTile
        label="blocks today"
        value={formatNumber(blocksToday)}
        subtitle="guardrail interventions"
        tone={blocksToday > 0 ? 'danger' : 'neutral'}
      />
    </section>
  );
}
