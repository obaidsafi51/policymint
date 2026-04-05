"use client";
import { ArrowLeft, Save, ShieldCheck, Trash2, Plus, Box, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { useState } from "react";

export default function PolicyDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="flex flex-col gap-6 max-w-[1000px] mx-auto h-full w-full py-8 px-6 pb-16">
      
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-2 w-full">
        <Link href="/policies" className="flex items-center gap-2 text-secondary hover:text-primary transition-colors text-sm font-medium tracking-wide">
          <ArrowLeft size={16} /> Back to Policies
        </Link>
        <div className="flex items-center gap-2 text-[10px] text-tertiary uppercase tracking-widest font-medium">
          <span>Config</span> <span className="text-secondary">›</span> <span className="text-brand font-mono">{params.id.toUpperCase() || 'P-0441'}</span>
        </div>
      </div>

      {/* Header Block */}
      <div className="flex justify-between items-center w-full pb-6 border-b-0.5 border-border-default">
         <div className="flex items-center gap-4">
           <h1 className="text-3xl font-medium text-primary tracking-tight">Policy Configuration</h1>
           <StatusBadge status="active" />
         </div>
         <div className="flex items-center gap-3">
           <button className="text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 transition-all font-medium text-xs px-4 py-2.5 rounded-lg flex items-center gap-2">
             <Trash2 size={14} /> Disable Policy
           </button>
           <button className="bg-brand text-[#064430] hover:opacity-90 font-medium text-sm px-6 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2">
             <Save size={16} /> Save Changes
           </button>
         </div>
      </div>

      <div className="flex flex-col gap-8 w-full mt-2">
         
         {/* Screen 10 Elements (Venue Allowlist + Global Spend Cap) */}
         <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-primary font-medium tracking-wide text-lg">
              <Box size={18} className="text-brand" /> Venue Allowlist
            </div>
            <p className="text-xs text-secondary mb-2 tracking-wide leading-relaxed max-w-2xl">
              Specify precisely which smart contracts this policy cluster permits execution upon. Any attempt to interact with an address not defined in this mapping will result in immediate hard-block rejection.
            </p>
            
            <div className="bg-card border-0.5 border-border-default rounded-2xl overflow-hidden flex flex-col">
               <div className="flex items-center justify-between px-6 py-4 bg-surface border-b-0.5 border-border-default">
                  <div className="flex items-center gap-2 bg-card p-1 rounded-lg border-0.5 border-border-default">
                    <button onClick={() => setActiveTab('all')} className={`px-4 py-1.5 rounded-md text-xs font-medium tracking-wide transition-colors ${activeTab === 'all' ? 'bg-surface text-primary shadow-sm border-0.5 border-border-default' : 'text-secondary hover:text-primary'}`}>Enabled</button>
                    <button onClick={() => setActiveTab('pending')} className={`px-4 py-1.5 rounded-md text-xs font-medium tracking-wide transition-colors ${activeTab === 'pending' ? 'bg-surface text-primary shadow-sm border-0.5 border-border-default' : 'text-secondary hover:text-primary'}`}>Pending Audit</button>
                  </div>
                  <button className="text-xs font-medium text-brand hover:text-brand/80 flex items-center gap-2">
                    <Plus size={14} /> Add Contract
                  </button>
               </div>
               <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-default text-[10px] uppercase tracking-widest text-secondary/70 bg-surface/30">
                      <th className="py-4 font-medium pl-6">Venue Name</th>
                      <th className="py-4 font-medium">Contract Address</th>
                      <th className="py-4 font-medium text-right pr-6">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b-0.5 border-border-default/50 hover:bg-surface/30">
                      <td className="py-4 text-xs text-primary font-medium pl-6">Uniswap V3 Router</td>
                      <td className="py-4 text-xs font-mono text-tertiary">0x68b3465833fb72A70ecDF485E0...</td>
                      <td className="py-4 text-right pr-6"><StatusBadge status="active" /></td>
                    </tr>
                    <tr className="border-b-0.5 border-border-default/50 hover:bg-surface/30">
                      <td className="py-4 text-xs text-primary font-medium pl-6">Aave V3 Pool</td>
                      <td className="py-4 text-xs font-mono text-tertiary">0x87870Bca3F3fD6335C3F4ce8...</td>
                      <td className="py-4 text-right pr-6"><StatusBadge status="active" /></td>
                    </tr>
                  </tbody>
               </table>
            </div>
         </div>

         {/* Spend Cap Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            
            <div className="flex flex-col gap-4">
               <div className="flex items-center gap-2 text-primary font-medium tracking-wide text-sm uppercase">
                 <ShieldCheck size={14} className="text-brand" /> Global Spend Cap
               </div>
               <div className="bg-card border-0.5 border-border-default rounded-2xl p-6 flex flex-col gap-6">
                 <div className="flex flex-col gap-2">
                   <label className="text-[10px] uppercase tracking-widest text-secondary font-medium">Tx Threshold Limit</label>
                   <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary font-mono">$</span>
                     <input type="text" defaultValue="5,000.00" className="w-full bg-surface border-0.5 border-border-default rounded-xl pl-8 pr-4 py-3 text-sm text-primary font-mono focus:outline-none focus:border-brand" />
                     <span className="absolute right-4 top-1/2 -translate-y-1/2 text-tertiary text-xs">USDC</span>
                   </div>
                 </div>
                 <div className="flex flex-col gap-2">
                   <label className="text-[10px] uppercase tracking-widest text-secondary font-medium">Reset Schedule</label>
                   <select className="w-full bg-surface border-0.5 border-border-default rounded-xl px-4 py-3 text-sm text-primary focus:outline-none focus:border-brand appearance-none">
                     <option>Every 24 Hours (UTC 00:00)</option>
                     <option>Every 12 Hours</option>
                     <option>Weekly (Sunday 00:00)</option>
                   </select>
                 </div>
               </div>
            </div>

            <div className="flex flex-col gap-4">
               <div className="flex items-center gap-2 text-[#e74c6f] font-medium tracking-wide text-sm uppercase">
                 <ShieldAlert size={14} className="text-[#e74c6f]" /> Daily Loss Budget
               </div>
               <div className="bg-[#1b1013] border-0.5 border-[#5c2732] rounded-2xl p-6 flex flex-col gap-6">
                 <div className="flex flex-col gap-2">
                   <label className="text-[10px] uppercase tracking-widest text-[#e74c6f]/80 font-medium">Max Drawdown Allocation</label>
                   <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-danger font-mono cursor-default">-</span>
                     <input type="text" defaultValue="50,000.00" className="w-full bg-[#150a0d] border-0.5 border-[#5c2732] rounded-xl pl-8 pr-4 py-3 text-sm text-[#e74c6f] font-mono focus:outline-none focus:border-[#e74c6f] shadow-sm" />
                     <span className="absolute right-4 top-1/2 -translate-y-1/2 text-danger/50 text-xs">USDC</span>
                   </div>
                   <span className="text-[10px] text-danger/60 italic tracking-wide mt-1">Halt all agent trading if day-start balance drops by this ceiling.</span>
                 </div>
               </div>
            </div>

         </div>

         {/* Risk / Slippage Limits (Screen 11 block) */}
         <div className="bg-card border-0.5 border-border-default rounded-2xl p-6 flex flex-col gap-6 mt-4">
            <h3 className="font-medium text-primary uppercase text-sm tracking-widest border-b-0.5 border-border-default pb-4">Execution Guardrails</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
               
               <div className="flex flex-col gap-3">
                 <div className="flex justify-between items-center">
                    <label className="text-xs text-primary font-medium tracking-wide">Slippage Tolerance</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-9 h-5 bg-surface border-0.5 border-border-default peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                    </label>
                 </div>
                 <p className="text-[10px] text-tertiary">Reject intents where observed aggregator routing exceeds max acceptable slippage logic.</p>
                 <div className="flex items-center bg-surface border-0.5 border-border-default rounded-xl mt-1 max-w-[140px] px-3">
                    <input type="text" defaultValue="1.5" className="w-full bg-transparent py-2.5 text-sm font-mono text-primary focus:outline-none text-right" />
                    <span className="text-secondary ml-1">%</span>
                 </div>
               </div>

               <div className="flex flex-col gap-3">
                 <div className="flex justify-between items-center">
                    <label className="text-xs text-primary font-medium tracking-wide">Oracle Delay Threshold</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-9 h-5 bg-surface border-0.5 border-border-default peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                    </label>
                 </div>
                 <p className="text-[10px] text-tertiary">Reject swaps if the referenced Chainlink oracle heartbeat exceeds the freshness barrier.</p>
                 <div className="flex items-center bg-surface border-0.5 border-border-default rounded-xl mt-1 max-w-[140px] px-3">
                    <input type="text" defaultValue="120" className="w-full bg-transparent py-2.5 text-sm font-mono text-primary focus:outline-none text-right" />
                    <span className="text-secondary ml-2 text-xs">sec</span>
                 </div>
               </div>
               
            </div>
         </div>

      </div>
    </div>
  );
}
