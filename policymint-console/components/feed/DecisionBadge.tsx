interface DecisionBadgeProps {
  variant: 'allowed' | 'blocked' | 'active' | 'inactive' | 'pending' | 'error';
  label: string;
}

const badgeStyles: Record<DecisionBadgeProps['variant'], string> = {
  allowed: 'border-[var(--border-success)] bg-[var(--bg-success)] text-[var(--text-success)]',
  blocked: 'border-[var(--border-danger)] bg-[var(--bg-danger)] text-[var(--text-danger)]',
  active: 'border-[var(--border-focus)] bg-[var(--bg-brand)] text-[var(--text-on-brand)]',
  inactive: 'border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)]',
  pending: 'border-[var(--text-warning)] bg-[var(--bg-warning)] text-[var(--text-warning)]',
  error: 'border-[var(--border-danger)] bg-[var(--bg-danger)] text-[var(--text-danger)]',
};

export function DecisionBadge({ variant, label }: DecisionBadgeProps) {
  return (
    <span className={`inline-flex rounded-md border px-2 py-[2px] font-mono text-[10px] font-medium uppercase tracking-wider leading-4 ${badgeStyles[variant]}`}>
      {label}
    </span>
  );
}
