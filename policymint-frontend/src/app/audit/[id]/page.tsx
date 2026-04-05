import { AlertTriangle, Home, Clock, Copy, ArrowLeft, Activity, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";

export default function AuditDetailPage() {
  return (
    <div className="flex flex-col max-w-5xl mx-auto h-full w-full py-8 px-6 gap-8 pb-16">
      
      {/* Violation Detected Banner */}
      <div className="w-full bg-[#1b1013] border-0.5 border-[#5c2732] rounded-2xl p-6 flex justify-between items-center">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-[#381e24] border-0.5 border-[#5c2732] flex items-center justify-center text-[#e74c6f] shrink-0 shadow-sm">
             <AlertTriangle size={24} />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-medium tracking-wide text-white">VIOLATION DETECTED</h2>
            <div className="flex items-center text-[10px] text-danger/80 font-mono uppercase tracking-widest gap-2">
              <span>TX_HASH: 0x82...f931</span>
              <span>•</span>
              <span className="text-[#e74c6f] font-medium">CRITICAL PRIORITY</span>
            </div>
          </div>
        </div>
        <button className="bg-[#2a1318] border-0.5 border-[#e74c6f]/30 hover:border-[#e74c6f]/60 text-[#e74c6f] text-xs font-medium px-6 py-3 rounded-xl tracking-wide uppercase transition-colors">
          IMMEDIATE ACTION REQUIRED
        </button>
      </div>

      {/* Detail Split View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Agent Intent Box */}
        <div className="flex flex-col gap-8 flex-1">
           <div className="flex items-center gap-2 text-brand font-medium tracking-wide text-sm uppercase">
             <Home size={14} /> AGENT INTENT
           </div>

           <div className="flex flex-col gap-2">
             <span className="text-[10px] text-brand uppercase tracking-widest font-medium">Amount</span>
             <div className="text-3xl font-mono text-primary font-medium tracking-tight">
               50,000 <span className="text-brand">USDC</span>
             </div>
           </div>

           <div className="flex flex-col gap-2">
             <span className="text-[10px] text-secondary uppercase tracking-widest font-medium">Venue</span>
             <div className="flex items-center gap-2 text-primary font-mono text-sm tracking-wide">
               <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center border-0.5 border-border-default text-secondary">
                 <span className="text-[10px] font-bold">?</span>
               </div>
               Unknown Addr (0x71...c22)
             </div>
           </div>

           <div className="flex flex-col gap-2">
             <span className="text-[10px] text-brand uppercase tracking-widest font-medium">Action</span>
             <div className="flex items-center gap-2 text-primary font-medium tracking-wide">
                <Clock size={20} className="text-brand shrink-0" />
                Transfer
             </div>
           </div>
        </div>

        {/* Policy Violated Box */}
        <div className="flex flex-col gap-6 flex-1">
           <div className="flex items-center gap-2 text-[#e74c6f] font-medium tracking-wide text-sm uppercase">
             <AlertTriangle size={14} /> POLICY VIOLATED
           </div>

           <div className="bg-[#0a1210] border-0.5 border-[#2c3d36] rounded-xl p-6 flex flex-col gap-3 relative overflow-hidden">
              <span className="text-[10px] text-secondary uppercase tracking-widest font-medium">Spend Cap Per TX</span>
              <div className="flex justify-between items-end">
                <div className="text-primary font-mono text-lg font-medium tracking-wide">
                  Max 5,000
                </div>
                <div className="text-[#e74c6f] font-mono text-xs">+45,000 Over</div>
              </div>
           </div>

           <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center w-full">
                <span className="text-[10px] text-primary uppercase tracking-widest font-medium">Daily Loss Budget</span>
                <span className="text-[10px] text-secondary font-medium tracking-widest">85% consumed</span>
              </div>
              <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden relative">
                <div className="absolute left-0 top-0 h-full bg-[#e74c6f] w-[85%] rounded-full" />
              </div>
              <span className="text-[10px] text-tertiary italic tracking-wide">Remaining safety margin: 1,500 USDC</span>
           </div>
        </div>
      </div>

      {/* Signed Intent Block */}
      <div className="flex flex-col gap-4 w-full mt-4">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2 text-brand font-medium tracking-wide text-sm uppercase">
             <Copy size={14} /> SIGNED INTENT
          </div>
          <button className="flex items-center gap-1.5 text-brand text-[11px] hover:text-brand/80 transition-colors uppercase font-medium tracking-widest">
            <Copy size={12} /> Copy JSON
          </button>
        </div>

        <div className="w-full bg-[#0a1210] border-0.5 border-[#2c3d36] rounded-2xl p-6 font-mono text-[11px] leading-loose text-tertiary overflow-x-auto">
          <span className="text-secondary">{"{"}</span><br />
          &nbsp;&nbsp;<span className="text-brand">&quot;id&quot;</span>: <span className="text-secondary">&quot;intent_01HS9Y6B&quot;</span>,<br />
          &nbsp;&nbsp;<span className="text-brand">&quot;agent_signature&quot;</span>: <span className="text-secondary">&quot;0x91a2...f3b9&quot;</span>,<br />
          &nbsp;&nbsp;<span className="text-brand">&quot;payload&quot;</span>: {"{"}<br />
          &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-brand">&quot;asset&quot;</span>: <span className="text-secondary">&quot;USDC&quot;</span>,<br />
          &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-brand">&quot;amount&quot;</span>: <span className="text-secondary">&quot;50000000000&quot;</span>,<br />
          &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-brand">&quot;recipient&quot;</span>: <span className="text-secondary">&quot;0x71C7656EC7ab88b098defB751B7401B5f6d8976f&quot;</span>,<br />
          &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-brand">&quot;logic_hash&quot;</span>: <span className="text-secondary">&quot;sha256:e3b0c442...&quot;</span><br />
          &nbsp;&nbsp;{"}"},<br />
          &nbsp;&nbsp;<span className="text-brand">&quot;timestamp&quot;</span>: <span className="text-secondary">1710412800</span><br />
          <span className="text-secondary">{"}"}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center w-full mt-4 pt-6">
         <Link href="/audit" className="flex items-center gap-2 text-secondary hover:text-primary transition-colors text-sm font-medium tracking-wide">
           <ArrowLeft size={16} /> Back to Logs
         </Link>

         <div className="flex items-center gap-4">
           <button className="text-secondary hover:text-primary uppercase tracking-widest text-xs font-medium px-4 py-3 transition-colors">
             View Agent Logs
           </button>
           <button className="border border-[#e74c6f]/60 hover:bg-[#e74c6f]/10 text-[#e74c6f] uppercase tracking-widest text-xs font-medium px-6 py-3 rounded-lg transition-colors shadow-sm">
             Override Decision
           </button>
         </div>
      </div>

      {/* Bottom Metrics Tile Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-8 pt-8 border-t-0.5 border-border-default">
         <div className="bg-card border-0.5 border-border-default rounded-xl p-5 flex gap-4 items-center hover:bg-surface/30 cursor-default transition-colors">
           <div className="w-10 h-10 rounded-full bg-surface border-0.5 border-border-default flex items-center justify-center text-brand shrink-0">
             <Activity size={18} />
           </div>
           <div className="flex flex-col gap-1">
             <span className="text-xs font-medium text-primary tracking-wide">Agent Stability</span>
             <span className="text-[10px] text-tertiary">Normal behavior for 48h prior to this event.</span>
           </div>
         </div>
         <div className="bg-card border-0.5 border-border-default rounded-xl p-5 flex gap-4 items-center hover:bg-surface/30 cursor-default transition-colors">
           <div className="w-10 h-10 rounded-full bg-surface border-0.5 border-border-default flex items-center justify-center text-brand shrink-0">
             <ShieldCheck size={18} />
           </div>
           <div className="flex flex-col gap-1">
             <span className="text-xs font-medium text-primary tracking-wide">Validation State</span>
             <span className="text-[10px] text-tertiary">Signature is valid. Logic hash verified.</span>
           </div>
         </div>
         <div className="bg-card border-0.5 border-border-default rounded-xl p-5 flex gap-4 items-center hover:bg-surface/30 cursor-default transition-colors">
           <div className="w-10 h-10 rounded-full bg-surface border-0.5 border-border-default flex items-center justify-center text-brand shrink-0">
             <Wallet size={18} />
           </div>
           <div className="flex flex-col gap-1">
             <span className="text-xs font-medium text-primary tracking-wide">Vault Liquidity</span>
             <span className="text-[10px] text-tertiary">842,000 USDC available in hot storage.</span>
           </div>
         </div>
      </div>

    </div>
  );
}
