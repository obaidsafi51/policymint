'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, Eye, EyeOff, TriangleAlert } from 'lucide-react';
import { formatAddress } from '@/lib/formatAddress';

interface RegistrationSuccessProps {
  registrationId?: string;
  agentId: string;
  apiKey: string;
  txHashes?: string[];
}

function txLink(txHash: string) {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

export function RegistrationSuccess({ registrationId, agentId, apiKey, txHashes = [] }: RegistrationSuccessProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // no-op
    }
  }

  return (
    <section className="h-full p-6 md:p-8">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--bg-brand)] text-[var(--text-brand)]">
        <CheckCircle2 size={28} />
      </span>
      <h2 className="mt-4 font-headline text-4xl font-extrabold text-[var(--text-primary)]">Registration Successful</h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">Agent has been minted on-chain and registered to your operator console.</p>

      <div className="mt-5 space-y-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Agent UUID</span>
          <button
            type="button"
            onClick={() => copyText(agentId)}
            className="focus-ring inline-flex items-center gap-1 rounded px-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-brand)]"
          >
            <Copy size={12} /> Copy
          </button>
        </div>
        <p className="font-mono text-xs text-[var(--text-primary)]">{agentId}</p>
      </div>

      {registrationId ? (
        <div className="mt-3 space-y-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
          <span className="text-xs uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Registration ID</span>
          <p className="font-mono text-xs text-[var(--text-secondary)]">{registrationId}</p>
        </div>
      ) : null}

      <div className="mt-3 rounded-lg border border-[var(--border-danger)] bg-[var(--bg-danger)] p-3">
        <div className="mb-2 flex items-center gap-2 text-[var(--text-danger)]">
          <TriangleAlert size={14} />
          <span className="text-[10px] font-bold uppercase tracking-[0.14em]">One-time reveal key</span>
        </div>
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-2 py-1 font-mono text-xs text-[var(--text-primary)]">
            {showApiKey ? apiKey : '••••••••••••••••••••••••••••'}
          </p>
          <button
            type="button"
            onClick={() => setShowApiKey((prev) => !prev)}
            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label={showApiKey ? 'Hide API key' : 'Reveal API key'}
          >
            {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            type="button"
            onClick={() => copyText(apiKey)}
            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Copy API key"
          >
            <Copy size={14} />
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-[var(--text-danger)]">This key will not be shown again. Copy it now — access depends on this credential.</p>
      </div>

      {txHashes.length > 0 ? (
        <div className="mt-3 space-y-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
          <span className="text-xs uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Transaction Hashes</span>
          <div className="space-y-1">
            {txHashes.map((txHash) => (
              <a
                key={txHash}
                href={txLink(txHash)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs text-[var(--text-info)] hover:underline"
              >
                {formatAddress(txHash)}
                <ExternalLink size={14} className="text-[var(--text-secondary)]" />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <Link
          href="/dashboard"
          className="focus-ring inline-flex h-9 w-full items-center justify-center rounded-lg bg-[var(--bg-elevated)] px-4 text-sm font-semibold text-[var(--text-primary)] hover:opacity-90"
        >
          Go to Dashboard
        </Link>
      </div>
    </section>
  );
}
