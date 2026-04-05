"use client";

import { Decision } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { TxHashLink } from "./TxHashLink";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface DecisionCardProps {
  decision: Decision;
}

export function DecisionCard({ decision }: DecisionCardProps) {
  const isAllow = decision.result === "ALLOW";
  const [expanded, setExpanded] = useState(false);
  const rawHeadline = decision.summary ?? `${decision.actionType}${decision.value ? ` · ${decision.value}` : ""}`;
  const tradeLine = rawHeadline.replace(/\u2192/g, "->");
  const footer = isAllow ? decision.venue : decision.reason ?? decision.policyIdTriggered ?? "Policy enforcement";

  const borderLeft = isAllow ? "border-l-success" : "border-l-danger";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className={`w-full text-left bg-card border-y-0.5 border-r-0.5 border-border-default border-l-[3px] ${borderLeft} rounded-l-none rounded-r-tile p-3 flex flex-col gap-2 transition-opacity hover:opacity-95`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-medium text-primary truncate">{decision.agentId}</span>
          <StatusBadge status={isAllow ? "allowed" : "blocked"} label={isAllow ? "ALLOWED" : "BLOCKED"} />
        </div>
        <p className="font-mono text-[11px] text-primary leading-snug">{tradeLine}</p>
        <p className="text-[10px] text-tertiary leading-snug line-clamp-2">{footer}</p>
      </button>

      {expanded && (
        <div className="bg-card border-0.5 border-border-default rounded-card overflow-hidden animate-in slide-in-from-top-2 fade-in duration-100">
          <div className="bg-surface px-4 py-3 flex items-center gap-2 border-b-0.5 border-border-default">
            <CheckCircle2 size={16} className={isAllow ? "text-success" : "text-danger"} />
            <span className="text-sm font-medium text-primary">Decision Details</span>
          </div>
          <div className="p-5 flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[9px] text-secondary uppercase tracking-widest mb-1">Evaluation ID</div>
                <div className="text-xs font-mono text-primary">{decision.id.substring(0, 8).toUpperCase()}-XX</div>
              </div>
              <div>
                <div className="text-[9px] text-secondary uppercase tracking-widest mb-1">Policy Name</div>
                <div className="text-xs text-primary">{decision.policyIdTriggered || "System Check"}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[9px] text-secondary uppercase tracking-widest mb-1">Tx Hash</div>
                {decision.txHash ? <TxHashLink hash={decision.txHash} /> : <span className="text-xs text-tertiary">-</span>}
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
  "signature": "0x${decision.id.replace(/[^a-fA-F0-9]/g, "").slice(0, 40)}..."
}`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
