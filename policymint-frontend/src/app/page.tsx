"use client";

import { useMetrics, useDecisionStream } from "@/lib/api";
import { MetricTile } from "@/components/MetricTile";
import { DecisionCard } from "@/components/DecisionCard";
import { DrawdownChart, PnLChart, ReputationChart } from "@/components/DashboardCharts";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ChevronDown, ShieldAlert, Zap, Layers } from "lucide-react";

export default function DashboardPage() {
  const { metrics, isLoading } = useMetrics();
  const { decisions } = useDecisionStream();

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="flex-1 w-full flex flex-col pt-8 px-8 space-y-6 overflow-y-auto pb-12">
        
        {/* Header Block & Nav */}
        <div className="flex justify-between items-end w-full">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[10px] text-tertiary uppercase tracking-widest font-medium">
              <span>Operator</span> <span className="text-secondary">›</span> <span className="text-brand">Global Performance</span>
            </div>
            <h1 className="text-3xl font-medium text-primary tracking-tight">Main Dashboard</h1>
          </div>
          <button className="flex items-center gap-3 bg-surface hover:bg-card border-0.5 border-border-default px-5 py-2.5 rounded-xl text-sm font-medium text-primary transition-colors">
            <span className="text-secondary text-[10px] uppercase tracking-widest mr-1">Agent</span> 
            All Active Clusters <ChevronDown size={14} className="text-tertiary"/>
          </button>
        </div>

        {/* Top 4 Metrics Tile Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 shrink-0 mt-4">
          {isLoading || !metrics ? (
            <>
              <LoadingSkeleton variant="tile" />
              <LoadingSkeleton variant="tile" />
              <LoadingSkeleton variant="tile" />
              <LoadingSkeleton variant="tile" />
            </>
          ) : (
            (Object.values(metrics) as import("@/lib/types").MetricData[]).map((m, i) => (
              <MetricTile key={i} label={m.label} value={m.value} subtitle={m.subtitle} valueColor={m.valueColor} progress={i === 1 ? 85 : i === 2 ? 65 : undefined} />
            ))
          )}
        </div>
        
        {/* Primary Dash2 Charts */}
        <div className="space-y-4 shrink-0 w-full pt-4">
           <DrawdownChart />
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <PnLChart />
             <ReputationChart />
           </div>
        </div>

        {/* Dash1 Best Elements - System Overview block */}
        <div className="pt-6 mt-6 border-t-0.5 border-border-default">
           <h3 className="text-lg font-medium text-primary mb-6">System Overview</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-[#0f291e] to-card border-0.5 border-success/30 rounded-card p-6 flex flex-col justify-between">
                 <div className="flex items-center gap-3 mb-8">
                   <div className="w-10 h-10 rounded-full bg-success/20 flex flex-col items-center justify-center text-success">
                     <span className="font-bold">A+</span>
                   </div>
                   <span className="text-sm font-medium text-success/80 uppercase tracking-widest">Compliance Score</span>
                 </div>
                 <div className="flex flex-col gap-2">
                   <span className="text-4xl font-mono text-success">99.8%</span>
                   <span className="text-xs text-success/60 tracking-wide">0 critical violations today.</span>
                 </div>
              </div>

              <div className="bg-card border-0.5 border-border-default rounded-card p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center justify-between mb-8 relative z-10">
                   <span className="text-xs font-medium text-secondary uppercase tracking-widest">Active Agents</span>
                   <Layers size={16} className="text-brand" />
                </div>
                <div className="flex flex-col gap-3 relative z-10">
                   <div className="flex -space-x-3">
                     {[1,2,3,4,5].map(i => (
                       <div key={i} className={`w-8 h-8 rounded-full border-2 border-card flex items-center justify-center text-[10px] font-bold ${i === 1 ? 'bg-brand text-[#064430]' : 'bg-surface text-secondary'}`}>
                         A{i}
                       </div>
                     ))}
                   </div>
                   <span className="text-xs text-tertiary">5 active trading modules</span>
                </div>
                <Zap size={100} className="absolute -right-4 -bottom-4 text-surface/30 stroke-1" />
              </div>

              <div className="bg-[#1b1013] border-0.5 border-[#e74c6f]/30 rounded-card p-6 flex flex-col justify-between relative overflow-hidden transition-all hover:bg-[#e74c6f]/5 cursor-pointer">
                 <div className="flex items-center justify-between mb-8 relative z-10">
                   <span className="text-xs font-medium text-[#e74c6f] uppercase tracking-widest">Risk Simulation</span>
                   <ShieldAlert size={16} className="text-[#e74c6f]" />
                 </div>
                 <div className="flex flex-col gap-1 relative z-10">
                   <span className="text-lg font-medium text-white tracking-wide">2 threats blocked</span>
                   <span className="text-xs text-[#e74c6f]/80">View incident P-982</span>
                 </div>
              </div>
           </div>
        </div>

      </div>

      {/* Right Rail Decision Stream */}
      <div className="w-full lg:w-[320px] shrink-0 h-[calc(100vh-60px)] sticky top-0 overflow-hidden border-l-0.5 border-border-default bg-surface flex flex-col">
        <div className="p-5 border-b-0.5 border-border-default flex items-center justify-between bg-card">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"/>
            <h4 className="text-[11px] font-medium text-primary uppercase tracking-widest">Decision Stream</h4>
          </div>
          <span className="text-[10px] font-medium text-brand hover:text-brand/80 transition-colors uppercase tracking-widest cursor-pointer">Filter</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
           {decisions.map(d => (
             <DecisionCard key={d.id} decision={d} />
           ))}
        </div>
      </div>
    </div>
  );
}
