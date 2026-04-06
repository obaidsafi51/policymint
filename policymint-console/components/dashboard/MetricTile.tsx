interface MetricTileProps {
  label: string;
  value: string;
  subtitle: string;
  tone?: 'brand' | 'success' | 'danger' | 'neutral';
}

const toneClass: Record<NonNullable<MetricTileProps['tone']>, string> = {
  brand: 'text-[var(--text-brand)]',
  success: 'text-[var(--text-success)]',
  danger: 'text-[var(--text-danger)]',
  neutral: 'text-[var(--text-primary)]',
};

export function MetricTile({ label, value, subtitle, tone = 'neutral' }: MetricTileProps) {
  return (
    <article className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{label}</p>
      <p className={`mt-2 font-headline text-[36px] font-bold leading-none ${toneClass[tone]}`}>{value}</p>
      <p className="mt-2 text-[11px] leading-4 text-[var(--text-secondary)]">{subtitle}</p>
    </article>
  );
}
