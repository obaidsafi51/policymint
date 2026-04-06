'use client';

import { DecisionCard } from '@/components/feed/DecisionCard';
import { useDecisionFeed } from '@/hooks/useDecisionFeed';

interface DecisionFeedRailProps {
  agentId: string;
}

export function DecisionFeedRail({ agentId }: DecisionFeedRailProps) {
  const { decisions } = useDecisionFeed(agentId);

  return (
    <aside className="flex h-full w-full flex-col border-l border-l-[var(--border-default)] bg-[var(--bg-card)] lg:w-[280px]" aria-live="polite">
      <div className="sticky top-0 z-10 border-b border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-medium tracking-tight text-[var(--text-primary)]">Live decisions</h2>
          <button className="text-xs text-[var(--text-brand)]">Filter</button>
        </div>
      </div>
      <div className="pm-scrollbar flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
        {decisions.map((decision) => (
          <DecisionCard key={decision.evaluation_id} decision={decision} />
        ))}
      </div>
      <div className="border-t border-[var(--border-default)] p-3">
        <button className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] transition-colors hover:text-[var(--text-brand)]">
          View Complete Audit
        </button>
      </div>
    </aside>
  );
}
