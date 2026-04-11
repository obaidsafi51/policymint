'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const { address: sessionAddress, authenticated } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [agentWallet, setAgentWallet] = useState<string>('');
  const [agentWalletError, setAgentWalletError] = useState<string | null>(null);
  const [walletDebugInfo, setWalletDebugInfo] = useState<string>('');
  const [isLoadingAgentWallet, setIsLoadingAgentWallet] = useState(false);
  const {
    phase,
    steps,
    result,
    errorState,
    registrationId,
    isRegistering,
    register,
    retry,
    retryVaultClaim,
  } = useAgentRegistration();

  const walletAddress = useMemo(() => sessionAddress ?? '', [sessionAddress]);

  useEffect(() => {
    if (!authenticated) {
      setAgentWallet('');
      setAgentWalletError(null);
      return;
    }
  }, [authenticated]);

  async function loadAgentWalletFromMetaMask() {
    if (!authenticated || !sessionAddress) {
      setAgentWallet('');
      setWalletDebugInfo('');
      setAgentWalletError('Sign in with your operator wallet first, then load a different account for agent wallet.');
      return;
    }

    if (typeof window === 'undefined' || !(window as Window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum) {
      setAgentWalletError('MetaMask is not available in this browser.');
      return;
    }

    setIsLoadingAgentWallet(true);
    setAgentWalletError(null);
    setWalletDebugInfo('');

    try {
      const ethereum = (window as Window & {
        ethereum: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
      }).ethereum;

      await ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });

      const requestedAccounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = Array.isArray(requestedAccounts)
        ? requestedAccounts.filter((account): account is string => typeof account === 'string')
        : [];
      const normalizedAccounts = accounts.map((account: string) => account.toLowerCase());
      setWalletDebugInfo(
        normalizedAccounts.length > 0
          ? `MetaMask returned ${normalizedAccounts.length} account(s): ${normalizedAccounts.join(', ')}`
          : 'MetaMask returned 0 accounts.',
      );
      if (normalizedAccounts.length === 0) {
        setAgentWalletError('No wallet accounts were returned by MetaMask.');
        return;
      }

      if (connectedAddress && connectedAddress.toLowerCase() !== sessionAddress.toLowerCase()) {
        setAgentWallet('');
        setAgentWalletError('Connected wallet differs from signed-in operator wallet. Reconnect MetaMask with the operator wallet or sign in again.');
        return;
      }

      const excludedWallets = new Set(
        [walletAddress, connectedAddress]
          .filter((address): address is string => Boolean(address))
          .map((address) => address.toLowerCase()),
      );
      const nonOperatorAccounts = normalizedAccounts.filter(
        (account) => !excludedWallets.has(account),
      );

      if (nonOperatorAccounts.length === 0) {
        setAgentWallet('');
        setAgentWalletError(
          'MetaMask returned only your operator wallet. Switch to or add a second account for agent identity.',
        );
        return;
      }

      let selectedAgentWallet = nonOperatorAccounts[0];

      if (nonOperatorAccounts.length > 1) {
        const options = nonOperatorAccounts
          .map((account, index) => `${index + 1}. ${account}`)
          .join('\n');

        const answer = window.prompt(
          `Choose MetaMask account number for Agent Wallet:\n\n${options}\n\nEnter number:`,
          '1',
        );

        if (!answer) {
          setAgentWalletError('Agent wallet selection was cancelled.');
          return;
        }

        const selectedIndex = Number(answer.trim()) - 1;
        if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= nonOperatorAccounts.length) {
          setAgentWalletError('Invalid account selection. Please try again.');
          return;
        }

        selectedAgentWallet = nonOperatorAccounts[selectedIndex];
      }

      setAgentWallet(selectedAgentWallet);
      setAgentWalletError(null);
    } catch (error) {
      setAgentWalletError(error instanceof Error ? error.message : 'Failed to load account from MetaMask.');
    } finally {
      setIsLoadingAgentWallet(false);
    }
  }

  async function submit(values: AgentRegistrationFormValues) {
    if (!walletAddress) {
      setSubmitError('Connect and sign in with your wallet to register an agent.');
      return;
    }

    if (!agentWallet) {
      setSubmitError('Load an agent wallet from MetaMask before registering.');
      return;
    }

    if (agentWallet.toLowerCase() === walletAddress.toLowerCase()) {
      setSubmitError('Agent wallet must be different from operator wallet.');
      return;
    }

    setSubmitError(null);

    await register({
      ...values,
      walletAddress: agentWallet,
      chainId: chainId || 11155111,
    });
  }

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-6xl items-center justify-center px-2 py-8">
      <div className="absolute inset-0 bg-[var(--bg-page)]/80 backdrop-blur-sm" />

      <section className="relative z-10 w-full overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[color-mix(in_srgb,var(--bg-surface)_82%,transparent)] md:grid md:grid-cols-[1fr_420px]">
        <AgentRegistrationForm
          operatorWallet={walletAddress || 'Connect + sign in wallet to continue'}
          connectedWallet={connectedAddress ?? undefined}
          signedInWallet={sessionAddress ?? undefined}
          agentWallet={agentWallet || 'Not loaded yet'}
          walletDebugInfo={walletDebugInfo || undefined}
          onLoadAgentWallet={() => {
            void loadAgentWalletFromMetaMask();
          }}
          isLoadingAgentWallet={isLoadingAgentWallet}
          agentWalletError={agentWalletError ?? undefined}
          isSubmitting={isRegistering}
          isSubmitDisabled={!walletAddress || !agentWallet}
          submitError={submitError ?? undefined}
          initialValues={{
            name: 'PolicyMint',
            strategyType: 'MOMENTUM',
            description: 'Policy-protected autonomous trading agent with provable risk controls. Enforces spend caps, venue allowlists, and daily loss budgets via EIP-712 signed validation artifacts on every trade intent.',
          }}
          onSubmit={submit}
        />

        <div className="bg-[var(--bg-elevated)] font-sans">
          {phase === 'SUCCESS' && result ? (
            <RegistrationSuccess
              registrationId={registrationId}
              agentUuid={result.agentUuid}
              erc8004TokenId={result.erc8004TokenId}
              registrationTxHash={result.registrationTxHash}
              vaultClaimTxHash={result.vaultClaimTxHash}
              vaultClaimStatus={result.vaultClaimStatus}
              vaultClaimError={result.vaultClaimError}
              apiKey={result.apiKey}
              txHashes={result.txHashes}
              chainId={chainId}
              onRetryVaultClaim={retryVaultClaim}
            />
          ) : null}

          {phase === 'REGISTERING' || phase === 'ERROR' ? (
            <RegistrationProgress
              steps={steps}
              chainId={chainId}
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
