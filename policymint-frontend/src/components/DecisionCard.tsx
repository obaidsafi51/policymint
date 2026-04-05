"use client";
import { Decision } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { TxHashLink } from "./TxHashLink";
import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

interface DecisionCardProps {
  decision: Decision;
}

export function DecisionCard({ decision }: DecisionCardProps) {
  const isAllow = decision.result === "ALLOW";
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="flex flex-col gap-2">
      <div 
        className={`bg-card rounded-r-card rounded-l-none p-4 flex justify-between items-center cursor-pointer hover:opacity-90 transition-opacity border-l-[3px] border-y-0 border-r-0 ${
          isAllow ? "border-l-success" : "border-l-danger"
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-8">
          <div className="flex flex-col gap-1 w-32">
            <span className="text-[9px] font-medium text-secondary uppercase tracking-widest">Agent</span>
            <span className="text-sm font-medium text-primary">{decision.agentId}</span>
          </div>
          
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-[9px] font-medium text-secondary uppercase tracking-widest">Action</span>
            <div className="flex items-center gap-3">
              <span className={isAllow ? "text-success font-medium text-sm" : "text-danger font-medium text-sm"}>
                {decision.actionType}
              </span>
              {(decision.value || decision.contractAddress) && (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-[1px] bg-border-default" />
                  <span className="text-xs font-mono text-primary font-medium">{decision.value || "-"}</span>
                  <div className="text-[10px] text-tertiary uppercase tracking-wider bg-surface px-2 py-0.5 rounded border-0.5 border-border-default">
                    On {decision.contractAddress ? "Contract" : "Unknown"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <StatusBadge status={isAllow ? "allowed" : "blocked"} label={decision.result} />
          {expanded ? <ChevronUp size={16} className="text-secondary" /> : <ChevronDown size={16} className="text-secondary" />}
        </div>
      </div>
      
      {expanded && (
        <div className="bg-card border-0.5 border-border-default rounded-card overflow-hidden animate-in slide-in-from-top-2 fade-in duration-100">
          <div className="bg-surface px-4 py-3 flex items-center gap-2 border-b-0.5 border-border-default">
             <CheckCircle2 size={16} className={isAllow ? "text-success" : "text-danger"} />
             <span className="text-sm font-medium text-primary">Decision Details</span>
          </div>
          <div className="p-5 flex flex-col gap-6">
            <div className="grid grid-cols-4 gap-4">
               <div>
                 <div className="text-[9px] text-secondary uppercase tracking-widest mb-1">Evaluation ID</div>
                 <div className="text-xs font-mono text-primary">{decision.id.substring(0, 8).toUpperCase()}-XX</div>
               </div>
               <div>
                 <div className="text-[9px] text-secondary uppercase tracking-widest mb-1">Policy Name</div>
                 <div className="text-xs text-primary">{decision.policyIdTriggered || "System Check"}</div>
               </div>
               <div>
                 <div className="text-[9px] text-secondary uppercase tracking-widest mb-1">Tx Hash</div>
                 {decision.txHash ? <TxHashLink hash={decision.txHash} /> : <span className="text-xs text-tertiary">-</span>}
               </div>
               <div>
                 <div className="text-[9px] text-secondary uppercase tracking-widest mb-1">Reputation Signal</div>
                 <div className="flex items-center gap-1">
                   <div className="w-1.5 h-3 bg-brand rounded-sm"/>
                   <div className="w-1.5 h-3 bg-brand rounded-sm"/>
                   <div className="w-1.5 h-3 bg-brand/30 rounded-sm"/>
                   <span className="text-xs font-medium text-primary ml-1 uppercase">Strong</span>
                 </div>
               </div>
            </div>
            
            <div className="flex flex-col gap-2">
               <div className="text-[9px] text-secondary uppercase tracking-widest">Signed Intent Payload</div>
               <div className="bg-page border-0.5 border-border-default p-4 rounded-tile font-mono text-xs text-secondary overflow-x-auto">
                 {`{
  "domain": "OPERATOR_V1",
  "operation": "${decision.actionType}",
  "params": {
    "token_in": "${decision.contractAddress || "0x..."}",
    "amount": "${decision.value || "0"}",
    "deadline": ${new Date(decision.timestamp).getTime()}
  },
  "signature": "0x${Math.random().toString(36).substring(2)}..."
}`}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
