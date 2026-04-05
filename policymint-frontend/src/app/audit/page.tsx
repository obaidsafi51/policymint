"use client";
import { StatusBadge } from "@/components/StatusBadge";
import { TxHashLink } from "@/components/TxHashLink";
import { Download, X, ChevronLeft, ChevronRight, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AuditLogPage() {
  const router = useRouter();

  const handleRowClick = (id: string) => {
    // Navigate to dynamic detail page
    router.push(`/audit/${id}`);
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto h-full w-full p-8">
      
      {/* Breadcrumb & Header */}
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[10px] text-tertiary uppercase tracking-widest font-medium">
            <span>Console</span> <span className="text-secondary">›</span> <span className="text-brand">History</span>
          </div>
          <h1 className="text-3xl font-medium text-primary tracking-tight">Audit Log</h1>
        </div>
        <button className="flex items-center gap-2 bg-surface hover:bg-surface/80 border-0.5 border-border-default px-4 py-2 rounded-lg text-sm font-medium text-secondary hover:text-primary transition-colors">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Metric Tiles (4-col) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
        <div className="bg-card border-0.5 border-border-default rounded-xl p-5 flex flex-col justify-between h-28 relative">
          <span className="text-[10px] text-secondary tracking-widest uppercase font-medium">Total Scanned</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-medium text-primary">1,402,931</span>
            <span className="text-[10px] bg-surface text-success px-1.5 py-0.5 rounded font-mono font-medium border-0.5 border-success/20">+12%</span>
          </div>
        </div>
        <div className="bg-card border-0.5 border-border-default rounded-xl p-5 flex flex-col justify-between h-28 relative">
          <span className="text-[10px] text-secondary tracking-widest uppercase font-medium">Threats Blocked</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-medium text-danger">42</span>
            <span className="text-[10px] bg-danger/10 text-danger px-1.5 py-0.5 rounded font-medium border-0.5 border-danger/20">High</span>
          </div>
        </div>
        <div className="bg-card border-0.5 border-border-default rounded-xl p-5 flex flex-col justify-between h-28 relative">
          <span className="text-[10px] text-secondary tracking-widest uppercase font-medium">Policy Latency</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-medium text-primary">14ms</span>
            <span className="text-[10px] text-tertiary font-medium">Stable</span>
          </div>
        </div>
        <div className="bg-card border-0.5 border-border-default rounded-xl p-5 flex flex-col justify-between h-28 relative">
          <span className="text-[10px] text-secondary tracking-widest uppercase font-medium">Active Agents</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-medium text-primary">08</span>
            <span className="text-[10px] text-success flex items-center gap-1 font-medium"><div className="w-1.5 h-1.5 bg-success rounded-full"/>Live</span>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col gap-4 mt-4">
        <div className="flex items-end justify-between">
          <div className="flex gap-8 items-center">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-secondary uppercase tracking-widest font-medium">Result Filter</span>
              <div className="flex bg-surface p-1 rounded-lg border-0.5 border-border-default">
                <button className="px-4 py-1.5 bg-card border-0.5 border-border-default rounded-md text-xs font-medium text-primary shadow-sm tracking-wide">All</button>
                <button className="px-4 py-1.5 text-secondary hover:text-primary rounded-md text-xs font-medium tracking-wide transition-colors">Allowed</button>
                <button className="px-4 py-1.5 text-secondary hover:text-primary rounded-md text-xs font-medium tracking-wide transition-colors">Blocked</button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-secondary uppercase tracking-widest font-medium">Action Type</span>
              <div className="flex items-center gap-2 h-9">
                <div className="flex items-center gap-1.5 bg-brand/5 border border-brand/20 text-brand px-3 py-1 rounded-full text-xs font-medium tracking-wide">
                  Transfer <X size={12} className="cursor-pointer opacity-70 hover:opacity-100" />
                </div>
                <div className="flex items-center gap-1.5 bg-brand/5 border border-brand/20 text-brand px-3 py-1 rounded-full text-xs font-medium tracking-wide">
                  Swap <X size={12} className="cursor-pointer opacity-70 hover:opacity-100" />
                </div>
                <button className="text-xs text-secondary hover:text-primary bg-surface/50 px-3 py-1 rounded-full border border-dashed border-border-default font-medium tracking-wide ml-1">
                  + Add Action
                </button>
              </div>
            </div>
          </div>
          
          <button className="text-[11px] text-tertiary hover:text-secondary font-medium tracking-wide flex items-center gap-1.5 transition-colors pb-2">
             <X size={12} /> Clear filters
          </button>
        </div>

        <div className="flex gap-4">
          <div className="bg-surface border-0.5 border-border-default rounded-lg px-3 py-2 flex items-center gap-2 text-primary font-medium text-xs">
            <span className="text-secondary opacity-60">📅</span> 2023-11-20 — 2023-11-27
            <ChevronDownIcon />
          </div>
          <div className="bg-surface border-0.5 border-border-default rounded-lg px-3 py-2 flex items-center gap-2 text-primary font-medium text-xs">
            <span className="text-secondary opacity-60">🤖</span> Sentinel-Prime v2.4
            <ChevronDownIcon />
          </div>
        </div>
      </div>

      {/* Main Table Layer */}
      <div className="flex flex-col border-t-0.5 border-border-default mt-2">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-default text-[10px] uppercase tracking-widest text-secondary/70">
              <th className="py-5 font-medium pl-2">Timestamp</th>
              <th className="py-5 font-medium">Agent</th>
              <th className="py-5 font-medium">Action</th>
              <th className="py-5 font-medium">Venue</th>
              <th className="py-5 font-medium">Amount</th>
              <th className="py-5 font-medium">Result</th>
              <th className="py-5 font-medium">Policy</th>
              <th className="py-5 font-medium text-right pr-2">Tx Hash</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: "1", time: "14:02:33.04", agent: "Sentinel-01", action: "SWAP", venue: "Uniswap V3", amount: "4.20 ETH", result: "ALLOWED", policy: "MaxSlippage:1%", hash: "0x4f...d29" },
              { id: "2", time: "14:01:12.88", agent: "Sentinel-01", action: "TRANSFER", venue: "Unknown Addr", amount: "50,000 USDC", result: "BLOCKED", policy: "WhitelistingReq", hash: null, failed: true },
              { id: "3", time: "13:58:45.10", agent: "Sentry-Beta", action: "DEPOSIT", venue: "Aave V3", amount: "12.5 ETH", result: "ALLOWED", policy: "ProtocolApproval", hash: "0x91...a1b" },
              { id: "4", time: "13:55:01.44", agent: "Sentinel-01", action: "APPROVE", venue: "1inch", amount: "Infinite", result: "ALLOWED", policy: "RouterApproval", hash: "0x22...f03" }
            ].map((row, index) => (
              <tr 
                key={index} 
                className="border-b-0.5 border-border-default/50 hover:bg-surface/30 transition-colors cursor-pointer"
                onClick={() => handleRowClick(row.id)}
              >
                <td className="py-4 text-xs font-mono text-tertiary pl-2 tracking-wide">{row.time}</td>
                <td className="py-4 text-xs text-primary font-medium w-[120px]">{row.agent}</td>
                <td className="py-4 text-xs">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono tracking-wider ${row.failed ? 'bg-[#381e24] text-danger border-0.5 border-danger/30' : 'bg-[#0f291e] text-brand border-0.5 border-brand/30'}`}>
                    {row.action}
                  </span>
                </td>
                <td className="py-4 text-xs text-secondary font-medium w-[140px]">{row.venue}</td>
                <td className="py-4 text-xs font-mono text-primary font-medium">{row.amount}</td>
                <td className="py-4"><StatusBadge status={row.result === 'ALLOWED' ? 'allowed' : 'blocked'} label={row.result} /></td>
                <td className="py-4 text-xs text-secondary truncate w-[160px] tracking-wide">{row.policy}</td>
                <td className="py-4 text-right pr-2">
                  {row.hash ? <TxHashLink hash={row.hash} /> : <span className="text-xs text-tertiary font-mono italic">Rejected</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination */}
        <div className="flex items-center justify-between py-6">
          <span className="text-xs text-secondary tracking-wide">Showing 1-25 of 1,432 entries</span>
          <div className="flex items-center gap-1 font-mono text-xs">
            <button className="w-8 h-8 flex items-center justify-center text-tertiary hover:text-primary transition-colors"><ChevronLeft size={16}/></button>
            <button className="w-8 h-8 flex items-center justify-center bg-brand/10 text-brand border border-brand/20 rounded font-medium">1</button>
            <button className="w-8 h-8 flex items-center justify-center text-secondary hover:text-primary transition-colors">2</button>
            <button className="w-8 h-8 flex items-center justify-center text-secondary hover:text-primary transition-colors">3</button>
            <button className="w-8 h-8 flex items-center justify-center text-tertiary hover:text-primary transition-colors"><ChevronRight size={16}/></button>
          </div>
        </div>
      </div>

      {/* Bottom Layout Split (Violation Analysis & Decision Stream) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12 w-full mt-4">
        
        {/* Violation Analysis Card */}
        <div className="bg-[#150a0d] border border-[#5c2732] rounded-2xl p-6 flex flex-col relative overflow-hidden">
          <ShieldAlert size={120} strokeWidth={1} className="text-[#e74c6f]/5 absolute -right-6 -bottom-6" />
          <div className="flex items-start gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-[#381e24] flex items-center justify-center border-0.5 border-[#5c2732] shrink-0 text-danger">
              <span className="text-lg font-bold"><X size={20} /></span>
            </div>
            <div className="flex flex-col">
              <h3 className="text-[#e74c6f] font-medium tracking-wide">Violation Analysis</h3>
              <span className="text-[10px] text-danger/60 font-mono tracking-widest mt-0.5">LOG_ID: BLK-9982-X</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 relative z-10 w-full">
            <div className="flex flex-col gap-2">
              <span className="text-[9px] uppercase tracking-widest text-[#7EAA9A] font-medium">Triggered Policy</span>
              <div className="bg-[#0a1210] border-0.5 border-[#2c3d36] rounded-xl px-4 py-3 text-sm text-primary font-medium tracking-wide">
                P-004: Anti-Phishing Blacklist (Rev. 3)
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <span className="text-[9px] uppercase tracking-widest text-[#7EAA9A] font-medium">Risk Logic</span>
              <div className="text-xs text-secondary leading-relaxed italic border-l-2 border-border-default pl-3 py-1">
                &quot;Target address [0x71...ea] flagged in active &apos;Lazarus Group&apos; cluster. Intent detected as unauthorized asset siphon.&quot;
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 mt-8 relative z-10 w-full">
             <button className="flex-1 bg-[#e74c6f]/90 hover:bg-[#c23e5a] text-[#381e24] font-medium py-3 rounded-xl transition-colors tracking-wide text-sm">
               Override Decision
             </button>
             <button className="flex-1 bg-surface border-0.5 border-border-default text-secondary hover:text-primary py-3 rounded-xl transition-colors font-medium tracking-wide text-sm">
               View Agent Logs
             </button>
          </div>
        </div>

        {/* Decision Stream Panel */}
        <div className="bg-card border-0.5 border-border-default rounded-2xl flex flex-col overflow-hidden h-full">
          <div className="border-b-0.5 border-border-default px-6 py-4 flex justify-between items-center bg-surface">
             <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"/>
               <h3 className="font-medium text-sm text-primary tracking-wide">Decision Stream</h3>
             </div>
             <div className="flex items-center gap-2">
                <div className="bg-[#0a1210] border-0.5 border-border-default rounded-md flex px-1 py-0.5 text-[10px] text-tertiary gap-1 font-mono items-center">
                  Cmd<span className="opacity-50">+</span>K
                </div>
                <input 
                  type="text" 
                  placeholder="Search History" 
                  className="bg-transparent border-none text-xs text-primary w-28 focus:outline-none placeholder:text-tertiary placeholder:font-medium" 
                />
             </div>
          </div>
          
          <div className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto w-full">
            <div className="flex gap-3">
              <div className="w-4 h-4 rounded-full bg-[#0f291e] border-0.5 border-success/30 flex items-center justify-center text-success shrink-0 mt-0.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div className="flex flex-col w-full">
                 <div className="flex gap-1 text-xs text-secondary font-mono tracking-wide leading-relaxed">
                   <span className="text-primary font-medium">0x4a...f3</span> validated against <span className="text-primary">liquidity_threshold</span>. <span className="text-brand">ALLOWED</span>
                 </div>
                 <span className="text-[9px] text-tertiary mt-1 uppercase tracking-widest font-mono">2 seconds ago</span>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-4 h-4 rounded-full bg-[#0f291e] border-0.5 border-success/30 flex items-center justify-center text-success shrink-0 mt-0.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div className="flex flex-col w-full border-b border-border-default/30 pb-5">
                 <div className="flex gap-1 text-xs text-secondary font-mono tracking-wide leading-relaxed">
                   <span className="text-primary font-medium">Curve Swap</span> simulation: <span className="text-primary">+1.2% slippage</span>. <span className="text-brand">ALLOWED</span>
                 </div>
                 <span className="text-[9px] text-tertiary mt-1 uppercase tracking-widest font-mono">14 seconds ago</span>
              </div>
            </div>

            <div className="flex gap-3 bg-[#381e24]/40 p-3 -mx-3 rounded-lg border border-[#e74c6f]/10">
              <div className="w-4 h-4 rounded-full bg-[#e74c6f]/20 border-0.5 border-[#e74c6f]/40 flex items-center justify-center text-danger shrink-0 mt-0.5">
                <X size={10} strokeWidth={3} />
              </div>
              <div className="flex flex-col w-full">
                 <div className="flex gap-1 text-xs text-secondary font-mono tracking-wide leading-relaxed">
                   Suspicious contract interaction detected. <span className="text-[#e74c6f]">BLOCKED</span>
                 </div>
                 <span className="text-[9px] text-tertiary mt-1 uppercase tracking-widest font-mono">1 minute ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}

function ChevronDownIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><polyline points="6 9 12 15 18 9"></polyline></svg>;
}
