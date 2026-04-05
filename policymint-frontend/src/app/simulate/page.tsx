"use client";
import { useState } from "react";
import { Send, CheckCircle2, XCircle, Shield, RefreshCw } from "lucide-react";

type SimulateState = "idle" | "simulating" | "allowed" | "blocked";

export default function SimulatePage() {
  const [state, setState] = useState<SimulateState>("idle");

  const handleSimulate = (testMode: "allow" | "block") => {
    setState("simulating");
    setTimeout(() => {
      setState(testMode === "allow" ? "allowed" : "blocked");
    }, 1200);
  };

  const reset = () => setState("idle");

  return (
    <div className="flex flex-col max-w-4xl mx-auto py-10 px-8 w-full gap-8">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[10px] text-tertiary uppercase tracking-widest font-medium">
          <span>Operator</span> <span className="text-secondary">›</span> <span className="text-brand">Testing Engine</span>
        </div>
        <h1 className="text-3xl font-medium text-primary tracking-tight">Logic Simulator</h1>
        <p className="text-secondary text-sm mt-1">Simulate intents through your active policy clusters safely prior to testnet deployment.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        
        {/* Left Side: Input Form (Screen 12 Context) */}
        <div className="flex flex-col gap-6">
           <h3 className="text-lg font-medium tracking-wide text-primary border-b-0.5 border-border-default pb-4">Intent Parameters</h3>
           
           <div className="flex flex-col gap-5">
             <div className="flex flex-col gap-2">
               <label className="text-[10px] uppercase tracking-widest text-secondary font-medium">Target Agent</label>
               <select className="w-full bg-surface border-0.5 border-border-default rounded-xl px-4 py-3 text-sm text-primary focus:outline-none focus:border-brand transition-colors appearance-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-0">
                 <option>Sentinel-V2 (Arbitrage Core)</option>
                 <option>MarketGuard-01</option>
               </select>
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div className="flex flex-col gap-2">
                 <label className="text-[10px] uppercase tracking-widest text-secondary font-medium">Operation</label>
                 <select className="w-full bg-surface border-0.5 border-border-default rounded-xl px-4 py-3 text-sm text-primary focus:outline-none focus:border-brand transition-colors appearance-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-0">
                   <option>Execute Swap</option>
                   <option>Simple Transfer</option>
                 </select>
               </div>
               <div className="flex flex-col gap-2">
                 <label className="text-[10px] uppercase tracking-widest text-secondary font-medium">Asset</label>
                 <select className="w-full bg-surface border-0.5 border-border-default rounded-xl px-4 py-3 text-sm text-primary focus:outline-none focus:border-brand transition-colors appearance-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-0">
                   <option>WETH</option>
                   <option>USDC</option>
                 </select>
               </div>
             </div>

             <div className="flex flex-col gap-2">
               <label className="text-[10px] uppercase tracking-widest text-secondary font-medium">Value Amount</label>
               <input type="text" placeholder="e.g. 5.50" defaultValue="14.20" className="w-full bg-surface border-0.5 border-border-default rounded-xl px-4 py-3 text-sm text-primary font-mono focus:outline-none focus:border-brand transition-colors focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-0" />
             </div>

             <div className="flex flex-col gap-2">
               <label className="text-[10px] uppercase tracking-widest text-secondary font-medium">Target Contract</label>
               <input type="text" defaultValue="0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" className="w-full bg-surface border-0.5 border-border-default rounded-xl px-4 py-3 text-sm text-primary font-mono focus:outline-none focus:border-brand transition-colors focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-0" />
             </div>
           </div>

           <div className="flex flex-col gap-3 mt-4 pt-4 border-t-0.5 border-border-default">
             <button 
               onClick={() => handleSimulate("allow")} 
               disabled={state === "simulating"}
               className="w-full bg-brand hover:opacity-90 text-[#064430] font-medium tracking-wide flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
             >
               {state === "simulating" ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />} 
               {state === "simulating" ? "EVALUATING..." : "VERIFY INTENT (SUCCESS MOCK)"}
             </button>
             <button 
               onClick={() => handleSimulate("block")} 
               disabled={state === "simulating"}
               className="w-full bg-[#1b1013] hover:bg-danger/20 border-0.5 border-[#e74c6f]/30 text-[#e74c6f] font-medium tracking-wide flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-danger disabled:opacity-50"
             >
               Force Block Threshold
             </button>
           </div>
        </div>

        {/* Right Side: Verdict Result Console (Screen 13 Context) */}
        <div className="flex flex-col gap-6 relative min-h-[500px]">
           <h3 className="text-lg font-medium tracking-wide text-primary border-b-0.5 border-border-default pb-4">Engine Verdict</h3>
           
           <div className="flex-1 w-full relative">
             
             {/* Idle State */}
             <div className={`absolute inset-0 flex flex-col items-center justify-center text-center opacity-0 pointer-events-none transition-opacity duration-150 ease-out ${state === 'idle' ? 'opacity-100 pointer-events-auto' : ''}`}>
                <Shield size={48} strokeWidth={1} className="text-secondary/30 mb-4" />
                <h4 className="text-primary font-medium tracking-wide mb-1">Awaiting Intel</h4>
                <p className="text-secondary text-xs max-w-[240px]">Submit an intent configuration to run an isolated cluster dry-run.</p>
             </div>

             {/* Simulating State */}
             <div className={`absolute inset-0 flex flex-col items-center justify-center text-center opacity-0 pointer-events-none transition-opacity duration-150 ease-out bg-page/50 backdrop-blur-sm z-10 ${state === 'simulating' ? 'opacity-100 pointer-events-auto' : ''}`}>
                <div className="w-12 h-12 border-2 border-surface border-t-brand rounded-full animate-spin mb-4" />
                <span className="text-xs text-brand tracking-widest uppercase font-mono">Running Logic Layers...</span>
             </div>

             {/* Allowed State */}
             <div className={`absolute inset-0 flex flex-col gap-6 opacity-0 pointer-events-none transition-opacity duration-150 ease-out ${state === 'allowed' ? 'opacity-100 pointer-events-auto' : ''}`}>
               <div className="bg-[#0f291e] border-0.5 border-success/30 rounded-2xl p-6 flex items-start gap-4 shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-success/10 blur-[50px] -mr-8 -mt-8 pointer-events-none" />
                 <CheckCircle2 size={24} className="text-success shrink-0" />
                 <div className="flex flex-col gap-1 relative z-10">
                   <h4 className="text-lg font-medium text-success tracking-wide">EXECUTION ALLOWED</h4>
                   <p className="text-xs text-success/80 mt-1">Intent successfully cleared 4 policy modules without flagging limits.</p>
                 </div>
               </div>

               <div className="flex flex-col border-0.5 border-border-default rounded-2xl overflow-hidden bg-card text-xs font-mono">
                 <div className="bg-surface px-4 py-3 border-b-0.5 border-border-default text-secondary tracking-widest">
                   TRACE.LOG_ID: SIM_9901_A
                 </div>
                 <div className="p-4 flex flex-col gap-3 text-tertiary">
                    <div className="flex gap-2">
                       <span className="text-primary">[System]</span> Request parsed implicitly.
                    </div>
                    <div className="flex gap-2 text-success">
                       <span className="text-success">[P-0441]</span> Venue (Uniswap V3) verified natively.
                    </div>
                    <div className="flex gap-2 text-success">
                       <span className="text-success">[P-045a]</span> 14.20 WETH well under the target threshold limit.
                    </div>
                    <div className="flex gap-2 text-success">
                       <span className="text-success">[P-048b]</span> Daily loss margin untouched.
                    </div>
                    <div className="flex gap-2">
                       <span className="text-brand">[Logic]</span> Route verified. Signing payload internally returning success object.
                    </div>
                 </div>
               </div>

               <button onClick={reset} className="mt-auto bg-surface hover:bg-card border-0.5 border-border-default text-secondary hover:text-primary font-medium tracking-wide py-3 rounded-xl transition-colors">
                 Reset Environment
               </button>
             </div>

             {/* Blocked State */}
             <div className={`absolute inset-0 flex flex-col gap-6 opacity-0 pointer-events-none transition-opacity duration-150 ease-out ${state === 'blocked' ? 'opacity-100 pointer-events-auto' : ''}`}>
               <div className="bg-[#1b1013] border-0.5 border-[#5c2732] rounded-2xl p-6 flex items-start gap-4 shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-[#e74c6f]/10 blur-[50px] -mr-8 -mt-8 pointer-events-none" />
                 <XCircle size={24} className="text-[#e74c6f] shrink-0" />
                 <div className="flex flex-col gap-1 relative z-10 w-full">
                   <h4 className="text-lg font-medium text-[#e74c6f] tracking-wide">EXECUTION BLOCKED</h4>
                   <p className="text-xs text-[#e74c6f]/80 mt-1">Transaction halted! Policy boundary violated.</p>
                   
                   <div className="mt-4 pt-3 border-t-0.5 border-[#5c2732] flex flex-col gap-1">
                     <span className="text-[10px] text-[#e74c6f] uppercase tracking-widest font-medium">Triggered Node</span>
                     <span className="text-sm font-medium text-white">P-045a: Max Spend Cap Protocol</span>
                   </div>
                 </div>
               </div>

               <div className="flex flex-col border-0.5 border-border-default rounded-2xl overflow-hidden bg-card text-xs font-mono">
                 <div className="bg-surface px-4 py-3 border-b-0.5 border-border-default text-secondary tracking-widest">
                   TRACE.LOG_ID: SIM_9901_B
                 </div>
                 <div className="p-4 flex flex-col gap-3 text-tertiary">
                    <div className="flex gap-2">
                       <span className="text-primary">[System]</span> Request parsed implicitly.
                    </div>
                    <div className="flex gap-2 text-success">
                       <span className="text-success">[P-0441]</span> Venue (Uniswap V3) verified natively.
                    </div>
                    <div className="flex gap-2 text-danger font-medium p-2 bg-[#1b1013] border-0.5 border-[#5c2732] rounded-md">
                       <span className="text-danger">[P-045a] FAULT:</span> Value exceeds 5,000 USDC threshold cap. Siphon isolated.
                    </div>
                    <div className="flex gap-2">
                       <span className="text-danger">[System]</span> Hard stop executed. Intent payload dropped.
                    </div>
                 </div>
               </div>

               <button onClick={reset} className="mt-auto bg-[#1b1013] hover:bg-danger/20 border-0.5 border-[#5c2732] text-danger hover:text-white font-medium tracking-wide py-3 rounded-xl transition-all shadow-sm">
                 Acknowledge & Reset
               </button>
             </div>

           </div>
        </div>

      </div>
    </div>
  );
}
