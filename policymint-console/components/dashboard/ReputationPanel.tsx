import { formatNumber } from '@/lib/formatAmount';

interface ReputationPanelProps {
  score: number;
}

export function ReputationPanel({ score }: ReputationPanelProps) {
  return (
    <section className="h-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Reputation score</h2>
      <p className="mt-3 font-headline text-6xl font-extrabold leading-none text-[var(--text-brand)]">{formatNumber(score)}</p>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">target +50</p>
      <div className="mt-6 h-1.5 rounded-full bg-[var(--bg-card)]">
        <div className="h-1.5 rounded-full bg-[var(--text-brand)]" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </div>
    </section>
  );
}
