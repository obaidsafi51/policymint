'use client';

import { useDashboardContext } from '@/components/dashboard/DashboardProvider';
import { DecisionCard } from '@/components/feed/DecisionCard';
import { useDecisionFeed } from '@/hooks/useDecisionFeed';

export function DecisionFeedRail() {
  const { agentId } = useDashboardContext();
  const { decisions, isLoading, isError, errorCode, hasMore, loadMore, isPolling } = useDecisionFeed(agentId);

  return (
    <aside className="flex h-full w-full flex-col border-l border-l-[var(--border-default)] bg-[var(--bg-card)] lg:w-[280px]" aria-live="polite">
      <div className="sticky top-0 z-10 border-b border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-medium tracking-tight text-[var(--text-primary)]">Live decisions</h2>
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${isPolling ? 'bg-[var(--text-brand)]' : 'bg-[var(--text-tertiary)]'}`} />
            <button className="text-xs text-[var(--text-brand)]">Filter</button>
          </div>
        </div>
      </div>
      <div className="pm-scrollbar flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
        {isLoading ? <p className="px-1 text-xs text-[var(--text-secondary)]">Loading decisions…</p> : null}
        {isError ? <p className="px-1 text-xs text-[var(--text-danger)]">{errorCode ?? 'ERROR'}</p> : null}
        {!isLoading && !isError
          ? decisions.map((decision) => (
              <DecisionCard key={decision.evaluation_id} decision={decision} />
            ))
          : null}
      </div>
      <div className="border-t border-[var(--border-default)] p-3">
        {hasMore ? (
          <button
            type="button"
            onClick={() => {
              void loadMore();
            }}
            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] transition-colors hover:text-[var(--text-brand)]"
          >
            Load More
          </button>
        ) : (
          <button className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] transition-colors hover:text-[var(--text-brand)]">
            View Complete Audit
          </button>
        )}
      </div>
    </aside>
  );
}
