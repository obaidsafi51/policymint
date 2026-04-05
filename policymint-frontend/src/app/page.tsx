"use client";

import Link from "next/link";
import { useMetrics, useDecisionStream } from "@/lib/api";
import { MetricTile } from "@/components/MetricTile";
import { DecisionCard } from "@/components/DecisionCard";
import { DrawdownChart, PnLChart, ReputationChart } from "@/components/DashboardCharts";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import type { MetricData } from "@/lib/types";

const METRIC_ORDER = ["cumulativePnL", "reputationScore", "maxDrawdown", "decisionsToday"] as const;

export default function DashboardPage() {
  const { metrics, isLoading } = useMetrics();
  const { decisions } = useDecisionStream();

  const metricList: MetricData[] | null = metrics
    ? METRIC_ORDER.map((key) => metrics[key]).filter((m): m is MetricData => m != null)
    : null;

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 bg-page">
      <div className="flex-1 min-w-0 flex flex-col pt-6 px-8 pb-10 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 shrink-0">
          {isLoading || !metricList ? (
            <>
              <LoadingSkeleton variant="tile" />
              <LoadingSkeleton variant="tile" />
              <LoadingSkeleton variant="tile" />
              <LoadingSkeleton variant="tile" />
            </>
          ) : (
            metricList.map((m, i) => (
              <MetricTile key={METRIC_ORDER[i]} label={m.label} value={m.value} subtitle={m.subtitle} valueColor={m.valueColor} />
            ))
          )}
        </div>

        <div className="space-y-4 shrink-0 w-full pt-6">
          <DrawdownChart />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PnLChart />
            <ReputationChart />
          </div>
        </div>

      </div>

      <aside className="w-full lg:w-[240px] shrink-0 lg:h-full min-h-0 flex flex-col border-t-0.5 lg:border-t-0 lg:border-l-0.5 border-border-default bg-page">
        <div className="p-4 border-b-0.5 border-border-default flex items-center justify-between bg-card shrink-0">
          <h2 className="text-sm font-medium text-primary truncate">Live decisions</h2>
          <button type="button" className="text-sm font-medium text-brand hover:opacity-80 transition-opacity shrink-0">
            Filter
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 min-h-0">
          {decisions.map((d) => (
            <DecisionCard key={d.id} decision={d} />
          ))}
        </div>
        <div className="p-3 border-t-0.5 border-border-default bg-card shrink-0">
          <Link
            href="/audit"
            className="flex w-full items-center justify-center rounded-tile border-0.5 border-border-default py-2.5 text-[10px] font-medium text-primary uppercase tracking-widest hover:border-hover transition-colors"
          >
            View complete audit
          </Link>
        </div>
      </aside>
    </div>
  );
}
