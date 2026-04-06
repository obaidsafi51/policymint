'use client';

import { useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { Bot } from 'lucide-react';
import { AgentRegistrationForm, type AgentRegistrationFormValues } from '@/components/agents/AgentRegistrationForm';
import { RegistrationProgress } from '@/components/agents/RegistrationProgress';
import { RegistrationSuccess } from '@/components/agents/RegistrationSuccess';
import { useAuth } from '@/hooks/useAuth';
import { useAgentRegistration } from '@/hooks/useAgentRegistration';
import { formatAddress } from '@/lib/formatAddress';

export default function RegisterAgentPage() {
  const { address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const { address: sessionAddress } = useAuth();
  const {
    phase,
    steps,
    result,
    errorState,
    registrationId,
    isRegistering,
    register,
    retry,
  } = useAgentRegistration();

  const walletAddress = useMemo(() => sessionAddress ?? connectedAddress ?? '', [connectedAddress, sessionAddress]);

  async function submit(values: AgentRegistrationFormValues) {
    if (!walletAddress) {
      return;
    }

    await register({
      ...values,
      walletAddress,
      chainId: chainId || 11155111,
    });
  }

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-6xl items-center justify-center px-2 py-8">
      <div className="absolute inset-0 bg-[var(--bg-page)]/80 backdrop-blur-sm" />

      <section className="relative z-10 w-full overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[color-mix(in_srgb,var(--bg-surface)_82%,transparent)] md:grid md:grid-cols-[1fr_420px]">
        <AgentRegistrationForm
          walletAddress={walletAddress || 'Connect + sign in wallet to continue'}
          isSubmitting={isRegistering}
          onSubmit={submit}
        />

        <div className="bg-[var(--bg-elevated)] font-sans">
          {phase === 'SUCCESS' && result ? (
            <RegistrationSuccess
              registrationId={registrationId}
              agentId={result.agentId}
              apiKey={result.apiKey}
              txHashes={result.txHashes}
            />
          ) : null}

          {phase === 'REGISTERING' || phase === 'ERROR' ? (
            <RegistrationProgress
              steps={steps}
              failedStep={errorState?.failedStep}
              errorMessage={errorState?.errorMessage}
              onRetry={errorState ? () => void retry() : undefined}
            />
          ) : null}

          {phase === 'IDLE' ? (
            <section className="h-full p-6 md:p-8">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--bg-brand)] text-[var(--text-brand)]">
                <Bot size={28} />
              </span>
              <h2 className="mt-4 font-headline text-3xl font-bold text-[var(--text-primary)]">Agent Registry</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">Initialize a new smart agent, then watch backend and on-chain registration steps live.</p>
              <div className="mt-5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Flow</p>
                <p className="mt-2 text-sm text-[var(--text-primary)]">Database write → AgentRegistry register → Vault claim → token persistence → API key issue</p>
              </div>
            </section>
          ) : null}

          {phase === 'ERROR' && errorState?.alreadyRegistered ? (
            <section className="px-6 pb-8 md:px-8">
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Existing Agent</p>
                <p className="mt-1 text-sm text-[var(--text-primary)]">{errorState.alreadyRegistered.name ?? 'Unknown name'}</p>
                {errorState.alreadyRegistered.id ? <p className="font-mono text-xs text-[var(--text-secondary)]">{errorState.alreadyRegistered.id}</p> : null}
                {errorState.alreadyRegistered.erc8004TokenId ? (
                  <p className="mt-1 font-mono text-xs text-[var(--text-brand)]">token: {formatAddress(errorState.alreadyRegistered.erc8004TokenId)}</p>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}
