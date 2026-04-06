'use client';

import { useState } from 'react';
import { ChevronDown, Copy, ExternalLink } from 'lucide-react';
import { PolicyDecision } from '@/types';
import { DecisionBadge } from '@/components/feed/DecisionBadge';
import { formatAddress } from '@/lib/formatAddress';

interface DecisionCardProps {
  decision: PolicyDecision;
}

function formatDecisionTime(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '--:--:--';
  }

  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes().toString().padStart(2, '0');
  const utcSeconds = date.getUTCSeconds().toString().padStart(2, '0');
  const meridiem = utcHours >= 12 ? 'PM' : 'AM';
  const hour12 = utcHours % 12 === 0 ? 12 : utcHours % 12;
  const hour = hour12.toString().padStart(2, '0');

  return `${hour}:${utcMinutes}:${utcSeconds} ${meridiem}`;
}

export function DecisionCard({ decision }: DecisionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const sideColorClass = decision.result === 'allow' ? 'border-l-[var(--text-success)]' : 'border-l-[var(--text-danger)]';

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // no-op
    }
  }

  return (
    <article className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
      <div className={`flex gap-3 border-l-[3px] px-3 py-3 ${sideColorClass}`}>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {decision.agent_name}
            </p>
            <DecisionBadge
              variant={decision.result === 'allow' ? 'allowed' : 'blocked'}
              label={decision.result === 'allow' ? 'ALLOW' : 'BLOCK'}
            />
          </div>
          <p className="truncate text-xs text-[var(--text-secondary)]">
            {decision.action_summary}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            {formatDecisionTime(decision.timestamp)} UTC
          </p>
        </div>
        <button
          type="button"
          aria-label="Expand decision details"
          onClick={() => setExpanded((state) => !state)}
          className={`focus-ring h-6 w-6 rounded-sm text-[var(--text-tertiary)] transition-transform duration-panel ease-in-out ${expanded ? 'rotate-180' : 'rotate-0'}`}
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {expanded ? (
        <div className="space-y-2 border-t border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-3">
          <div className="flex items-center justify-between gap-2 text-[11px] leading-4">
            <span className="font-mono text-[var(--text-secondary)]">
              {formatAddress(decision.evaluation_id)}
            </span>
            <button
              type="button"
              aria-label="Copy evaluation id"
              onClick={() => copyText(decision.evaluation_id)}
              className="focus-ring rounded-sm"
            >
              <Copy size={14} className="text-[var(--text-secondary)]" />
            </button>
          </div>
          <p className="text-xs text-[var(--text-primary)]">
            Policy: {decision.policy_id ?? 'no policy block'}
          </p>
          {decision.reason ? (
            <p className="text-xs text-[var(--text-danger)]">
              {decision.reason}
            </p>
          ) : null}
          {decision.validation_tx_hash ? (
            <a
              href={`https://sepolia.etherscan.io/tx/${decision.validation_tx_hash}`}
              target="_blank"
              rel="noreferrer"
              className="focus-ring inline-flex items-center gap-1 rounded-sm text-[12px] leading-[18px] text-[var(--text-info)]"
            >
              <span className="font-mono">{formatAddress(decision.validation_tx_hash)}</span>
              <ExternalLink size={14} />
            </a>
          ) : null}
          <pre
            className="max-h-36 overflow-auto rounded-md border border-[var(--border-default)] bg-[var(--bg-page)] p-2 text-[11px] leading-4 text-[var(--text-secondary)]"
          >
            {decision.eip712_signed_intent}
          </pre>
        </div>
      ) : null}
    </article>
  );
}
