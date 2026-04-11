'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';

export const registrationSchema = z.object({
  name: z.string().min(3, 'Agent name must be at least 3 characters').max(50, 'Agent name must be at most 50 characters'),
  strategyType: z.enum(['MOMENTUM', 'REBALANCING']),
  description: z.string().max(200, 'Description must be 200 characters or less').optional().default(''),
});

export type AgentRegistrationFormValues = z.infer<typeof registrationSchema>;

interface AgentRegistrationFormProps {
  operatorWallet: string;
  connectedWallet?: string;
  signedInWallet?: string;
  agentWallet: string;
  onLoadAgentWallet: () => void;
  isLoadingAgentWallet?: boolean;
  agentWalletError?: string;
  isSubmitting: boolean;
  isSubmitDisabled?: boolean;
  submitError?: string;
  initialValues?: Partial<AgentRegistrationFormValues>;
  onSubmit: (values: AgentRegistrationFormValues) => Promise<void>;
}

export function AgentRegistrationForm({
  operatorWallet,
  connectedWallet,
  signedInWallet,
  agentWallet,
  onLoadAgentWallet,
  isLoadingAgentWallet,
  agentWalletError,
  isSubmitting,
  isSubmitDisabled,
  submitError,
  initialValues,
  onSubmit,
}: AgentRegistrationFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AgentRegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: initialValues?.name ?? 'PolicyMint',
      strategyType: initialValues?.strategyType ?? 'MOMENTUM',
      description: initialValues?.description ?? 'Policy-protected autonomous trading agent with provable risk controls. Enforces spend caps, venue allowlists, and daily loss budgets via EIP-712 signed validation artifacts on every trade intent.',
    },
  });

  const strategyType = watch('strategyType');

  function strategyClass(active: boolean) {
    return active
      ? 'bg-[var(--bg-elevated)] border-[var(--border-focus)] text-[var(--text-brand)]'
      : 'bg-[var(--bg-card)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]';
  }

  const normalizedConnectedWallet = connectedWallet?.toLowerCase() ?? '';
  const normalizedSignedInWallet = signedInWallet?.toLowerCase() ?? '';
  const hasWalletMismatch =
    Boolean(normalizedConnectedWallet) &&
    Boolean(normalizedSignedInWallet) &&
    normalizedConnectedWallet !== normalizedSignedInWallet;

  return (
    <form
      className="space-y-5 border-r border-[var(--border-default)] p-6 font-sans md:p-8"
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
      })}
    >
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">Register Agent</h1>
        <Link
          href="/dashboard"
          className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
          aria-label="Close registration"
        >
          <X size={16} />
        </Link>
      </div>

      <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        Agent name
        <input
          {...register('name')}
          className="focus-ring mt-1 h-8 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)]"
          placeholder="MarketGuard-v1"
        />
        {errors.name ? <span className="mt-1 block text-[11px] text-[var(--text-danger)]">{errors.name.message}</span> : null}
      </label>

      <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        Operator wallet (SIWE)
        <input
          readOnly
          value={operatorWallet}
          className="mt-1 h-8 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-3 font-mono text-xs text-[var(--text-secondary)]"
        />
        <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] normal-case tracking-normal text-[var(--text-secondary)] md:grid-cols-2">
          <p>
            <span className="text-[var(--text-tertiary)]">Connected:</span>{' '}
            <span className="font-mono">{connectedWallet || 'Not connected'}</span>
          </p>
          <p>
            <span className="text-[var(--text-tertiary)]">Signed-in:</span>{' '}
            <span className="font-mono">{signedInWallet || 'Not signed in'}</span>
          </p>
        </div>
        {hasWalletMismatch ? (
          <span className="mt-1 block text-[11px] normal-case tracking-normal text-[var(--text-danger)]">
            Connected wallet and signed-in operator wallet do not match.
          </span>
        ) : null}
        {submitError ? <span className="mt-1 block text-[11px] text-[var(--text-danger)]">{submitError}</span> : null}
      </label>

      <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        Agent wallet (on-chain identity)
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={onLoadAgentWallet}
            disabled={isLoadingAgentWallet || isSubmitting}
            className="focus-ring inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-3 text-[10px] font-semibold tracking-[0.08em] text-[var(--text-primary)] hover:border-[var(--border-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingAgentWallet ? 'Loading…' : 'Load from MetaMask'}
          </button>

          <input
            readOnly
            value={agentWallet}
            className="h-8 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-3 font-mono text-xs text-[var(--text-secondary)]"
          />
        </div>
        {agentWalletError ? <span className="mt-1 block text-[11px] text-[var(--text-danger)]">{agentWalletError}</span> : null}
      </label>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">Strategy type</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setValue('strategyType', 'MOMENTUM', { shouldValidate: true })}
            className={`focus-ring h-8 rounded-md border text-xs font-semibold transition-colors ${strategyClass(strategyType === 'MOMENTUM')}`}
          >
            Momentum
          </button>
          <button
            type="button"
            onClick={() => setValue('strategyType', 'REBALANCING', { shouldValidate: true })}
            className={`focus-ring h-8 rounded-md border text-xs font-semibold transition-colors ${strategyClass(strategyType === 'REBALANCING')}`}
          >
            Rebalancing
          </button>
        </div>
      </div>

      <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        Description
        <textarea
          {...register('description')}
          rows={3}
          className="focus-ring mt-1 w-full resize-none rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
          placeholder="Optional short strategy summary"
        />
        {errors.description ? <span className="mt-1 block text-[11px] text-[var(--text-danger)]">{errors.description.message}</span> : null}
      </label>

      <button
        type="submit"
        disabled={isSubmitting || isSubmitDisabled}
        className="focus-ring inline-flex h-9 w-full items-center justify-center rounded-lg bg-[var(--text-brand)] px-4 text-sm font-extrabold uppercase tracking-[0.12em] text-[var(--text-on-brand)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Register Agent
      </button>
    </form>
  );
}
