'use client';

import { Check, Copy, ExternalLink, X } from 'lucide-react';
import { txExplorerLink } from '@/lib/explorer';
import { formatAddress } from '@/lib/formatAddress';

export type RegistrationStepStatus = 'pending' | 'active' | 'done' | 'failed';

export interface RegistrationStepItem {
  stepNumber: number;
  stepLabel: string;
  status: RegistrationStepStatus;
  message?: string;
  txHash?: string;
}

interface RegistrationStepProps {
  step: RegistrationStepItem;
  chainId?: number;
}

function stepDot(status: RegistrationStepStatus) {
  if (status === 'done') {
    return (
      <span className="inline-flex h-[14px] w-[14px] items-center justify-center rounded-[3px] bg-[var(--bg-success)] text-[var(--text-success)]">
        <Check size={10} />
      </span>
    );
  }

  if (status === 'failed') {
    return (
      <span className="inline-flex h-[14px] w-[14px] items-center justify-center rounded-[3px] bg-[var(--bg-danger)] text-[var(--text-danger)]">
        <X size={10} />
      </span>
    );
  }

  if (status === 'active') {
    return (
      <span className="inline-flex h-[14px] w-[14px] animate-spin rounded-[3px] bg-[var(--text-warning)]" />
    );
  }

  return <span className="inline-flex h-[14px] w-[14px] rounded-[3px] bg-[var(--bg-surface)]" />;
}

export function RegistrationStep({ step, chainId }: RegistrationStepProps) {
  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // no-op
    }
  }

  return (
    <li className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2">
      <div className="flex items-start gap-2">
        <span className="mt-1">{stepDot(step.status)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[var(--text-primary)]">{step.stepNumber}. {step.stepLabel}</p>
          {step.message ? <p className="mt-1 text-xs text-[var(--text-secondary)]">{step.message}</p> : null}
          {step.txHash ? (
            <div className="mt-1 flex items-center gap-2">
              <a
                href={txExplorerLink(step.txHash, chainId)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs text-[var(--text-info)] hover:underline"
              >
                {formatAddress(step.txHash)}
                <ExternalLink size={16} className="text-[var(--text-secondary)]" />
              </a>
              <button
                type="button"
                onClick={() => copyText(step.txHash!)}
                className="focus-ring inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text-brand)]"
                aria-label="Copy transaction hash"
              >
                <Copy size={14} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
