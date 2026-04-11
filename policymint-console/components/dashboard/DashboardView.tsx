'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useDashboardContext } from '@/components/dashboard/DashboardProvider';
import { DrawdownChart } from '@/components/dashboard/DrawdownChart';
import { MetricTileGrid } from '@/components/dashboard/MetricTileGrid';
import { PnLChart } from '@/components/dashboard/PnLChart';
import { ReputationPanel } from '@/components/dashboard/ReputationPanel';
import { useAuth } from '@/hooks/useAuth';
import { usePnL } from '@/hooks/usePnL';
import { useDrawdown } from '@/hooks/useDrawdown';
import { useAgentStats } from '@/hooks/useAgentStats';
import { formatNumber, formatUsd } from '@/lib/formatAmount';

const topAuditRows = [
  { time: '14:22:01', code: 'POL-9283', text: 'Liquidity migration check verified', status: 'SUCCESS', hash: '0x...eb42' },
  { time: '14:21:58', code: 'POL-1022', text: 'Gas price optimization agent active', status: 'SUCCESS', hash: '0x...f11a' },
  { time: '14:21:45', code: 'POL-4412', text: 'Unusual slippage detected on AMM-Pool_4', status: 'ALERT', hash: '0x...99c2' },
  { time: '14:21:30', code: 'POL-0012', text: 'Epoch 102 transition complete', status: 'SUCCESS', hash: '0x...8a23' },
];
export function DashboardView() {
  const { agentId, window, refreshAll, isRefreshing } = useDashboardContext();
  const { agentIds } = useAuth();

  const { series: pnlData, currentPnl } = usePnL(agentId, window);
  const { drawdownData, preventionValueUsd, preventionPct } = useDrawdown(agentId, window);
  const { stats } = useAgentStats(agentId);
  const activeAgentIds = agentIds;
  const visibleAgentIds = activeAgentIds.slice(0, 3);
  const overflowCount = Math.max(0, activeAgentIds.length - visibleAgentIds.length);

  const score = stats?.reputation_score ?? 780;

  const pnlLatest = pnlData[pnlData.length - 1]?.pnl ?? currentPnl;
  const drawdownPct = -(stats?.current_drawdown_pct ?? 2.4);
  const decisionsToday = stats?.total_evaluations ?? 0;
  const blocksToday = stats?.block_count ?? 0;

  const compliance = Math.max(0, Math.min(100, 95 + score / 20));

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-headline text-5xl font-extrabold tracking-tight text-[var(--text-primary)]">System Overview</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">Real-time surveillance of autonomous policy enforcement and agent health across the Base Sepolia network.</p>
        </div>
        <Link href="/agents/register" className="inline-flex items-center gap-2 self-start rounded-xl bg-[var(--text-brand)] px-4 py-2 text-sm font-semibold text-[var(--text-on-brand)] hover:opacity-90">
          <Plus size={14} />
          Deploy Agent
        </Link>
        <button
          type="button"
          onClick={() => {
            void refreshAll();
          }}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--text-brand)]"
        >
          {isRefreshing ? 'Refreshing…' : 'Refresh All'}
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <article className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 xl:col-span-8">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Global policy compliance</span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-brand)]">Live feed • 12ms latency</span>
          </div>
          <div className="mt-6 flex items-end gap-4">
            <span className="font-headline text-7xl font-extrabold leading-none text-[var(--text-brand)]">{compliance.toFixed(1)}</span>
            <span className="mb-2 text-3xl text-[var(--text-tertiary)]">%</span>
          </div>
          <div className="mt-7 h-2 rounded-full bg-[var(--bg-card)]">
            <div className="h-2 rounded-full bg-[var(--text-brand)]" style={{ width: `${compliance}%` }} />
          </div>
        </article>

        <article className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 xl:col-span-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Active agents</span>
          <div className="mt-4 flex -space-x-3">
            {visibleAgentIds.map((id) => (
              <div
                key={id}
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--bg-card)] bg-[var(--bg-elevated)] text-[11px] font-bold text-[var(--text-brand)]"
                title={id}
              >
                {id.slice(0, 2).toUpperCase()}
              </div>
            ))}
            {overflowCount > 0 ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--bg-card)] bg-[var(--bg-elevated)] text-[11px] font-bold text-[var(--text-brand)]">
                +{overflowCount}
              </div>
            ) : null}
          </div>
          <p className="mt-6 text-3xl font-bold text-[var(--text-primary)]">{activeAgentIds.length}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Autonomous units processing</p>
        </article>
      </section>

      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Audit Stream</h3>
          <div className="flex items-center gap-4">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Passed</span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Warning</span>
          </div>
        </div>
        <div className="divide-y divide-[var(--border-default)]">
          {topAuditRows.map((row) => (
            <div key={row.time + row.code} className="flex items-center justify-between px-5 py-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{row.time}</span>
                <span className="rounded border border-[var(--border-default)] bg-[var(--bg-card)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-brand)]">{row.code}</span>
                <span className="text-[var(--text-primary)]">{row.text}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{row.hash}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${row.status === 'SUCCESS' ? 'bg-[var(--bg-success)] text-[var(--text-success)]' : 'bg-[var(--bg-danger)] text-[var(--text-danger)]'}`}
                >
                  {row.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Risk Simulation</h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Active models</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span>DeFi Cascade Risk</span>
                <span className="font-mono text-[var(--text-brand)]">92% SAFE</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--bg-surface)]">
                <div className="h-1.5 w-[92%] rounded-full bg-[var(--text-brand)]" />
              </div>
            </div>
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span>Liquidation Sweep</span>
                <span className="font-mono text-[var(--text-secondary)]">READY</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--bg-surface)]">
                <div className="h-1.5 w-[4%] rounded-full bg-[var(--text-secondary)]" />
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Mint Performance</h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Operator revenue</p>
          <div className="mt-6 flex items-end justify-between">
            <div>
              <p className="font-mono text-4xl text-[var(--text-primary)]">4.1209 <span className="text-lg text-[var(--text-secondary)]">ETH</span></p>
              <p className="mt-1 text-[11px] font-bold text-[var(--text-brand)]">+12.4% THIS EPOCH</p>
            </div>
            <div className="flex h-14 w-32 items-end gap-1">
              <span className="h-4 flex-1 rounded-sm bg-[var(--bg-brand)]" />
              <span className="h-6 flex-1 rounded-sm bg-[var(--bg-brand)]" />
              <span className="h-5 flex-1 rounded-sm bg-[var(--bg-brand)]" />
              <span className="h-8 flex-1 rounded-sm bg-[var(--bg-brand)]" />
              <span className="h-7 flex-1 rounded-sm bg-[var(--bg-brand)]" />
              <span className="h-10 flex-1 rounded-sm bg-[var(--text-brand)]" />
            </div>
          </div>
        </article>
      </section>

      <section className="space-y-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <h2 className="font-headline text-xl font-bold text-[var(--text-primary)]">Analytics board</h2>
        <MetricTileGrid
          reputation={score}
          pnlLatest={pnlLatest}
          tradesToday={decisionsToday}
          blocksToday={blocksToday}
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-12">
            <DrawdownChart data={drawdownData} />
          </div>
          <div className="xl:col-span-6">
            <PnLChart data={pnlData} />
          </div>
          <div className="xl:col-span-6">
            <ReputationPanel score={score} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">Cumulative PnL</span>
          <p className="mt-2 font-mono text-3xl font-bold text-[var(--text-brand)]">{formatUsd(pnlLatest)}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{preventionPct.toFixed(2)}% prevention delta</p>
        </article>
        <article className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">Reputation score</span>
          <p className="mt-2 font-mono text-3xl font-bold text-[var(--text-brand)]">+{score.toFixed(1)}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">target: +50</p>
        </article>
        <article className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">Max drawdown</span>
          <p className="mt-2 font-mono text-3xl font-bold text-[var(--text-danger)]">{drawdownPct}%</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">budget: 5%</p>
        </article>
        <article className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">Decisions today</span>
          <p className="mt-2 font-mono text-3xl font-bold text-[var(--text-primary)]">{formatNumber(decisionsToday)}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{blocksToday} blocked • {formatUsd(preventionValueUsd)} saved</p>
        </article>
      </section>
    </div>
  );
}
