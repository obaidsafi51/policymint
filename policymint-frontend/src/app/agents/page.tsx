"use client";
import { useAgents } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { MetricTile } from "@/components/MetricTile";
import { RegisterAgentModal } from "@/components/RegisterAgentModal";
import { useState } from "react";

export default function AgentsPage() {
  const { agents } = useAgents();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto h-full relative p-8 w-full">
      <div className="flex justify-between items-center bg-card border-0.5 border-border-default rounded-card p-6">
        <div>
          <h1 className="text-xl font-medium text-primary">Registered agents</h1>
          <p className="text-secondary text-sm mt-1 font-inter">Manage autonomous trading agents</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-brand text-[#064430] font-medium px-4 py-2 rounded-tile hover:opacity-90 transition-opacity">
          Register agent
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricTile label="Active agents" value="5" subtitle="Operating" valueColor="success" />
        <MetricTile label="Total volume" value="$42,102.88" subtitle="24h Volume" valueColor="primary" />
        <MetricTile label="Security score" value="98.4" subtitle="System health" valueColor="brand" />
      </div>

      <div className="flex justify-between items-center bg-card border-0.5 border-border-default rounded-card p-4">
        <input 
          type="text" 
          placeholder="Search agents..." 
          className="bg-surface border-0.5 border-border-default rounded-tile px-4 py-2 text-sm outline-none focus:outline-none w-64 text-primary focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:border-transparent transition-all" 
        />
        <div className="flex gap-1">
          {["All", "Active", "Paused", "Blocked"].map(filter => (
            <button key={filter} className={`px-4 py-1.5 rounded-tile text-sm font-medium transition-colors ${filter === "All" ? "bg-surface text-primary border-0.5 border-border-default" : "text-secondary hover:text-primary hover:bg-surface/50 border-0.5 border-transparent"}`}>
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {agents.map((agent: import("@/lib/types").Agent, i: number) => {
          const isPositive = i % 2 !== 0; 
          const pnl = isPositive ? "+$12,480.20" : "-$850.12";
          const repScore = isPositive ? "+64.5" : "-14.2";
          const pills = isPositive ? ["Slippage", "Max Drawdown"] : ["Gas Threshold", "Reorg Protection"];
          const uptime = isPositive ? "2m ago" : "Offline";

          return (
            <div key={agent.id} className="bg-card border-0.5 border-border-default rounded-card p-5 flex items-center justify-between hover:bg-surface/30 transition-colors group">
              
              <div className="flex items-center gap-4 min-w-[280px]">
                <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0 border-0.5 border-brand/20">
                   <div className="w-4 h-4 bg-current rounded-sm mask-shield" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-primary">{agent.name}</span>
                  <span className="text-[10px] text-tertiary font-mono tracking-wider">#{agent.id.substring(0,4)} • ROUTINE</span>
                </div>
              </div>

              <div className="flex flex-col min-w-[100px]">
                <span className="text-[9px] uppercase text-secondary tracking-widest mb-1">Status</span>
                <StatusBadge status={agent.status} />
              </div>

              <div className="flex flex-col min-w-[100px]">
                <span className="text-[9px] uppercase text-secondary tracking-widest mb-1">Reputation</span>
                <span className="font-mono text-sm text-primary">{repScore}</span>
              </div>

              <div className="flex flex-col min-w-[140px]">
                <span className="text-[9px] uppercase text-secondary tracking-widest mb-1">PNL (CUMULATIVE)</span>
                <span className={isPositive ? "font-mono font-medium text-success text-sm" : "font-mono font-medium text-danger text-sm"}>
                  {pnl}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 flex-1 items-center px-4">
                {pills.map(pill => (
                  <div key={pill} className="bg-surface border-0.5 border-border-default text-tertiary text-[10px] px-2 py-1 rounded">
                    {pill}
                  </div>
                ))}
                {isPositive && <div className="bg-surface border-0.5 border-border-default text-tertiary text-[10px] px-2 py-1 rounded">+2 more</div>}
              </div>

              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end min-w-[60px]">
                  <span className="text-[9px] uppercase text-secondary tracking-widest">Uptime</span>
                  <span className="text-[11px] text-primary">{uptime}</span>
                </div>
                <button className="text-secondary hover:text-primary transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </button>
                <div className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${agent.status === 'active' ? 'bg-brand' : 'bg-surface border-0.5 border-border-default'}`}>
                  <div className={`w-4 h-4 bg-card rounded-full shadow-sm transition-transform ${agent.status === 'active' ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
              
            </div>
          );
        })}
      </div>

      {showModal && <RegisterAgentModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
