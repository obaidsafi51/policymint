'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { buildApiUrl } from '@/lib/api';
import { txExplorerBaseUrl, txExplorerLink } from '@/lib/explorer';
import { fetcher } from '@/lib/fetcher';

interface AgentDetails {
  id: string;
  name: string;
  erc8004TokenId: string | null;
  registrationTxHash: string | null;
  chainId: number;
  isActive: boolean;
}

export default function AgentsPage() {
  const { loading, authenticated, agentIds } = useAuth();
  const agentRegistryAddress = process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS;

  const detailsQuery = useQuery({
    queryKey: ['agents', 'details', agentIds],
    enabled: authenticated && agentIds.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        agentIds.map(async (agentId) => {
          try {
            const details = await fetcher<AgentDetails>(buildApiUrl(`/v1/agents/${agentId}`));
            return {
              agentId,
              details,
            };
          } catch {
            return {
              agentId,
              details: null,
            };
          }
        }),
      );

      return entries;
    },
  });

  const agentEntries = detailsQuery.data ?? agentIds.map((agentId) => ({ agentId, details: null }));

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">
      <header>
        <h1 className="font-headline text-3xl font-bold text-[var(--text-primary)]">Agents</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Your registered operator agents available in this session.</p>
      </header>

      {!authenticated && !loading ? (
        <article className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <p className="text-sm text-[var(--text-secondary)]">Sign in with your operator wallet to view agents.</p>
          <Link href="/agents/register" className="mt-3 inline-flex rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--text-brand)]">
            Register Agent
          </Link>
        </article>
      ) : null}

      {authenticated && agentIds.length === 0 ? (
        <article className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <p className="text-sm text-[var(--text-secondary)]">No active agents found for this operator wallet.</p>
          <Link href="/agents/register" className="mt-3 inline-flex rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--text-brand)]">
            Register Agent
          </Link>
        </article>
      ) : null}

      {authenticated && agentIds.length > 0 ? (
        <div className="space-y-3">
          {agentEntries.map(({ agentId, details }) => (
            <article key={agentId} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
              <p className="font-mono text-xs text-[var(--text-tertiary)]">AGENT UUID</p>
              <p className="mt-1 font-mono text-sm text-[var(--text-primary)]">{agentId}</p>
              <div className="mt-2 grid gap-1 text-xs text-[var(--text-secondary)]">
                <p>Name: <span className="text-[var(--text-primary)]">{details?.name ?? 'Unavailable'}</span></p>
                <p>Token ID: <span className="font-mono text-[var(--text-primary)]">{details?.erc8004TokenId ?? 'Not minted'}</span></p>
                <p>Status: <span className={details?.isActive ? 'text-[var(--text-brand)]' : 'text-[var(--text-secondary)]'}>{details ? (details.isActive ? 'Active' : 'Inactive') : 'Unknown'}</span></p>
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/dashboard/${agentId}`} className="inline-flex rounded-lg bg-[var(--text-brand)] px-3 py-2 text-sm font-semibold text-[var(--text-on-brand)] hover:opacity-90">
                  Open Dashboard
                </Link>
                {details?.registrationTxHash ? (
                  <a
                    href={txExplorerLink(details.registrationTxHash, details.chainId)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--text-brand)]"
                  >
                    View Registration Tx
                  </a>
                ) : null}
                {details?.erc8004TokenId && agentRegistryAddress ? (
                  <a
                    href={`${txExplorerBaseUrl(details.chainId)}/token/${agentRegistryAddress}?a=${details.erc8004TokenId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--text-brand)]"
                  >
                    View Token
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {detailsQuery.isError ? (
        <p className="text-xs text-[var(--text-danger)]">Some agent details could not be loaded. UUID links remain available.</p>
      ) : null}
    </section>
  );
}
