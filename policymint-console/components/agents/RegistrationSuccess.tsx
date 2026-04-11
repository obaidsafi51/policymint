'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, Eye, EyeOff, TriangleAlert } from 'lucide-react';
import { txExplorerLink } from '@/lib/explorer';
import { formatAddress } from '@/lib/formatAddress';

interface RegistrationSuccessProps {
  registrationId?: string;
  agentUuid: string;
  erc8004TokenId: string | null;
  registrationTxHash: string | null;
  vaultClaimTxHash: string | null;
  vaultClaimStatus: 'claimed' | 'pending_retry' | 'skipped';
  vaultClaimError: string | null;
  apiKey: string;
  txHashes?: string[];
  chainId?: number;
  onRetryVaultClaim?: () => Promise<void>;
}

export function RegistrationSuccess({
  registrationId,
  agentUuid,
  erc8004TokenId,
  registrationTxHash,
  vaultClaimTxHash,
  vaultClaimStatus,
  vaultClaimError,
  apiKey,
  txHashes = [],
  chainId,
  onRetryVaultClaim,
}: RegistrationSuccessProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [retryingVaultClaim, setRetryingVaultClaim] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // no-op
    }
  }

  async function handleRetryVaultClaim() {
    if (!onRetryVaultClaim) {
      return;
    }

    setRetryingVaultClaim(true);
    setRetryError(null);

    try {
      await onRetryVaultClaim();
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : 'Retry vault claim failed');
    } finally {
      setRetryingVaultClaim(false);
    }
  }

  return (
    <section className="h-full p-6 md:p-8">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--bg-brand)] text-[var(--text-brand)]">
        <CheckCircle2 size={28} />
      </span>
      <h2 className="mt-4 font-headline text-4xl font-extrabold text-[var(--text-primary)]">Registration Successful</h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">Agent has been minted on-chain and registered to your operator console.</p>

      <span className="mt-3 inline-flex rounded-md bg-[var(--bg-success)] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-success)]">
        Agent Active
      </span>

      <div className="mt-5 space-y-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Agent UUID</span>
          <button
            type="button"
            onClick={() => copyText(agentUuid)}
            className="focus-ring inline-flex items-center gap-1 rounded px-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-brand)]"
          >
            <Copy size={12} /> Copy
          </button>
        </div>
        <p className="font-mono text-xs text-[var(--text-primary)]">{agentUuid}</p>
      </div>

      {erc8004TokenId ? (
        <div className="mt-3 space-y-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
          <span className="text-xs uppercase tracking-[0.1em] text-[var(--text-tertiary)]">On-chain Agent ID (uint256)</span>
          <p className="font-mono text-xs text-[var(--text-primary)]">{erc8004TokenId}</p>
          {registrationTxHash ? (
            <a
              href={txExplorerLink(registrationTxHash, chainId)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[var(--text-info)] hover:underline"
            >
              AgentRegistered event
              <ExternalLink size={14} className="text-[var(--text-secondary)]" />
            </a>
          ) : null}
        </div>
      ) : null}

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
              <div key={txHash} className="flex items-center gap-2">
                <a
                  href={txExplorerLink(txHash, chainId)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-[var(--text-info)] hover:underline"
                >
                  {formatAddress(txHash)}
                  <ExternalLink size={16} className="text-[var(--text-secondary)]" />
                </a>
                <button
                  type="button"
                  onClick={() => copyText(txHash)}
                  className="focus-ring inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text-brand)]"
                  aria-label="Copy transaction hash"
                >
                  <Copy size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {vaultClaimStatus === 'pending_retry' ? (
        <div className="mt-3 rounded-lg border border-[var(--text-warning)] bg-[var(--bg-card)] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-warning)]">Vault Claim Needs Retry</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Registration succeeded, but sandbox capital claim failed.</p>
          {vaultClaimError ? <p className="mt-1 text-xs text-[var(--text-secondary)]">{vaultClaimError}</p> : null}
          {retryError ? <p className="mt-1 text-xs text-[var(--text-danger)]">{retryError}</p> : null}
          {onRetryVaultClaim ? (
            <button
              type="button"
              onClick={() => void handleRetryVaultClaim()}
              disabled={retryingVaultClaim}
              className="focus-ring mt-2 inline-flex h-8 items-center rounded-md border border-[var(--border-default)] px-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-60"
            >
              {retryingVaultClaim ? 'Retrying…' : 'Retry Vault Claim'}
            </button>
          ) : null}
        </div>
      ) : null}

      {vaultClaimTxHash ? (
        <div className="mt-3 space-y-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
          <span className="text-xs uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Vault Claim Transaction</span>
          <a
            href={txExplorerLink(vaultClaimTxHash, chainId)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-xs text-[var(--text-info)] hover:underline"
          >
            {formatAddress(vaultClaimTxHash)}
            <ExternalLink size={16} className="text-[var(--text-secondary)]" />
          </a>
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
