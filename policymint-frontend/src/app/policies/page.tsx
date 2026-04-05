"use client";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Search, Layers, Box, Settings2, Link as LinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PoliciesPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto h-full w-full p-8">
      
      {/* Breadcrumb & Header */}
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[10px] text-tertiary uppercase tracking-widest font-medium">
            <span>Operator</span> <span className="text-secondary">›</span> <span className="text-brand">Configuration</span>
          </div>
          <h1 className="text-3xl font-medium text-primary tracking-tight">Policy Guardrails</h1>
        </div>
        <button className="flex items-center gap-2 bg-brand hover:bg-brand/90 text-[#064430] px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} /> Create Policy
        </button>
      </div>

      {/* Metric Tiles (4-col) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
        <div className="bg-card border-0.5 border-border-default rounded-xl p-5 flex flex-col justify-between h-28 relative">
          <span className="text-[10px] text-secondary tracking-widest uppercase font-medium">Total Policies</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-medium text-primary">14</span>
            <span className="text-[10px] bg-surface text-secondary px-1.5 py-0.5 rounded font-mono font-medium border-0.5 border-border-default">ACTIVE</span>
          </div>
        </div>
        <div className="bg-card border-0.5 border-border-default rounded-xl p-5 flex flex-col justify-between h-28 relative">
          <span className="text-[10px] text-secondary tracking-widest uppercase font-medium">Secured Venues</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-medium text-primary">28</span>
            <span className="text-[10px] font-medium text-success">+3 recently</span>
          </div>
        </div>
        <div className="bg-card border-0.5 border-border-default rounded-xl p-5 flex flex-col justify-between h-28 relative">
          <span className="text-[10px] text-secondary tracking-widest uppercase font-medium">Enforced Volume</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-medium text-brand">$142.5M</span>
            <span className="text-[10px] text-secondary font-medium tracking-wide">30d trailing</span>
          </div>
        </div>
        <div className="bg-card border-0.5 border-border-default rounded-xl p-5 flex flex-col justify-between h-28 relative">
          <span className="text-[10px] text-secondary tracking-widest uppercase font-medium">Blocked Volume</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-medium text-danger">$1.84M</span>
            <span className="text-[10px] bg-danger/10 text-danger px-1.5 py-0.5 rounded font-medium border-0.5 border-danger/20">PREVENTED</span>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex items-center justify-between border-b-0.5 border-border-default pb-6 pt-4 mt-2">
         <div className="flex bg-surface p-1 rounded-lg border-0.5 border-border-default w-fit">
           <button className="px-5 py-1.5 bg-card border-0.5 border-border-default rounded-md text-xs font-medium text-primary shadow-sm tracking-wide">All Policies</button>
           <button className="px-5 py-1.5 text-secondary hover:text-primary rounded-md text-xs font-medium tracking-wide transition-colors">Active</button>
           <button className="px-5 py-1.5 text-secondary hover:text-primary rounded-md text-xs font-medium tracking-wide transition-colors">Drafts</button>
           <button className="px-5 py-1.5 text-tertiary hover:text-primary rounded-md text-xs font-medium tracking-wide transition-colors">Archived</button>
         </div>

         <div className="flex items-center gap-3">
           <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
             <input type="text" placeholder="Search by name, ID or contract..." className="bg-surface border-0.5 border-border-default rounded-lg pl-9 pr-4 py-2 text-xs text-primary focus:outline-none focus:border-brand w-64" />
           </div>
           <button className="bg-surface border-0.5 border-border-default px-4 py-2 rounded-lg text-secondary hover:text-primary text-xs font-medium flex items-center gap-2">
             <Settings2 size={14} /> Filter
           </button>
         </div>
      </div>

      {/* Policy Card Grid flow */}
      <div className="grid grid-cols-1 gap-4 mt-2 mb-12">
        {[
          { id: "P-0441", order: "01", name: "Venue Allowlist (DeFi Primary)", type: "WHITELIST", status: "active", venues: ["Uniswap V3", "Aave V3", "Curve"], targets: "All Global Agents", triggers: 142 },
          { id: "P-045a", order: "02", name: "Max Spend Cap Protocol", type: "RISK_LIMIT", status: "active", venues: ["Global"], targets: "Sentinel-V2", triggers: 4 },
          { id: "P-048b", order: "03", name: "Daily Loss Budget (Drawdown Halt)", type: "CIRCUIT_BREAKER", status: "active", venues: ["Global"], targets: "MarketGuard", triggers: 0 },
          { id: "P-049c", order: "04", name: "Suspicious Contract Logic Trap", type: "THREAT_BLOCK", status: "inactive", venues: ["Global"], targets: "All Global Agents", triggers: 12 }
        ].map((policy) => (
          <div 
             key={policy.id} 
             onClick={() => router.push(`/policies/${policy.id}`)}
             className={`bg-card border-l-[3px] border-y-0.5 border-r-0.5 border-y-border-default border-r-border-default rounded-r-2xl rounded-l-none p-6 flex items-center justify-between hover:bg-surface/30 transition-colors cursor-pointer group ${policy.status === 'active' ? 'border-l-success' : 'border-l-secondary'}`}
          >
             
             <div className="flex items-center gap-6 min-w-[320px]">
               <div className="flex flex-col gap-1 items-center justify-center bg-surface border-0.5 border-border-default w-12 h-12 rounded-xl text-xs font-mono text-secondary">
                 <span className="text-[9px] opacity-60">ORD</span>
                 <span className="text-primary">{policy.order}</span>
               </div>
               <div className="flex flex-col gap-1">
                 <span className="font-medium text-base text-primary tracking-wide">{policy.name}</span>
                 <div className="flex items-center gap-2 text-xs font-mono text-tertiary">
                   <LinkIcon size={12} className="opacity-70" />
                   {policy.id} • {policy.type.replace('_', ' ')}
                 </div>
               </div>
             </div>

             <div className="flex flex-col min-w-[140px] gap-1.5">
               <span className="text-[9px] uppercase tracking-widest text-secondary font-medium">Target Venues</span>
               <div className="flex items-center gap-2">
                 <Box size={12} className="text-tertiary" />
                 <span className="text-xs text-primary font-medium tracking-wide">
                   {policy.venues.length > 1 ? `${policy.venues[0]} +${policy.venues.length - 1}` : policy.venues[0]}
                 </span>
               </div>
             </div>

             <div className="flex flex-col min-w-[140px] gap-1.5">
               <span className="text-[9px] uppercase tracking-widest text-secondary font-medium">Applied Agent Targets</span>
               <div className="flex items-center gap-2">
                 <Layers size={12} className="text-brand opacity-80" />
                 <span className="text-xs text-primary font-medium tracking-wide">
                   {policy.targets}
                 </span>
               </div>
             </div>

             <div className="flex flex-col min-w-[80px] gap-1.5 items-center">
               <span className="text-[9px] uppercase tracking-widest text-secondary font-medium">Triggers (30d)</span>
               <span className="font-mono text-sm text-primary">{policy.triggers}</span>
             </div>

             <div className="flex min-w-[120px] justify-end pr-2">
                <StatusBadge status={policy.status as "active" | "inactive"} />
             </div>

          </div>
        ))}
      </div>
      
    </div>
  )
}
