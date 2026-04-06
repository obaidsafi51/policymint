import { Check, X } from 'lucide-react';
import { PolicyChecklistItem } from '@/types';

interface PolicyChecklistProps {
  items: PolicyChecklistItem[];
}

function itemClass(state: PolicyChecklistItem['state']) {
  if (state === 'pass') {
    return 'bg-[var(--bg-success)] text-[var(--text-success)]';
  }

  if (state === 'fail') {
    return 'bg-[var(--bg-danger)] text-[var(--text-danger)]';
  }

  return 'bg-[var(--bg-surface)] text-[var(--text-tertiary)]';
}

export function PolicyChecklist({ items }: PolicyChecklistProps) {
  return (
    <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
      <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.15em] text-[var(--text-brand)]">Guardrail verification</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.policyName} className="flex items-start gap-2 rounded-lg bg-[var(--bg-card)] px-2 py-2">
            <span
              className={`mt-1 inline-flex h-[14px] w-[14px] items-center justify-center rounded-[3px] ${itemClass(item.state)}`}
            >
              {item.state === 'pass' ? <Check size={10} /> : null}
              {item.state === 'fail' ? <X size={10} /> : null}
            </span>
            <div>
              <p className="text-sm text-[var(--text-primary)]">{item.policyName}</p>
              <p className="font-mono text-[11px] text-[var(--text-secondary)]">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
