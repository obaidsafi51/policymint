'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { TradeIntent } from '@/types';

const intentSchema = z.object({
  action_type: z.enum(['swap', 'transfer', 'bridge', 'trade', 'custom']),
  venue: z.string().min(1, 'venue is required'),
  amount: z.string().refine((value) => Number(value) > 0, 'amount must be positive'),
  token_in: z.string().min(1, 'token_in is required'),
  token_out: z.string().optional(),
});

interface IntentFormProps {
  isLoading: boolean;
  onSubmit: (intent: TradeIntent) => Promise<void>;
}

type FormValues = z.infer<typeof intentSchema>;

export function IntentForm({ isLoading, onSubmit }: IntentFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(intentSchema),
    defaultValues: {
      action_type: 'swap',
      venue: 'kraken-spot',
      amount: '1000',
      token_in: 'ETH',
      token_out: 'USDC',
    },
  });

  return (
    <form
      className="w-full space-y-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 lg:w-[300px]"
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
      })}
    >
      <h2 className="font-headline text-2xl font-bold tracking-tight text-[var(--text-primary)]">Compose intent</h2>

      <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        Action type
        <select
          {...register('action_type')}
          className="focus-ring mt-1 h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)]"
        >
          <option value="swap">swap</option>
          <option value="transfer">transfer</option>
          <option value="bridge">bridge</option>
          <option value="trade">trade</option>
          <option value="custom">custom</option>
        </select>
      </label>

      <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        Venue
        <input
          {...register('venue')}
          className="focus-ring mt-1 h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)]"
        />
        {errors.venue ? <span className="text-[11px] text-[var(--text-danger)]">{errors.venue.message}</span> : null}
      </label>

      <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        Amount (usd)
        <input
          type="number"
          step="0.01"
          {...register('amount')}
          className="focus-ring mt-1 h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)]"
        />
        {errors.amount ? <span className="text-[11px] text-[var(--text-danger)]">{errors.amount.message}</span> : null}
      </label>

      <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        Token in
        <input
          {...register('token_in')}
          className="focus-ring mt-1 h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)]"
        />
      </label>

      <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        Token out
        <input
          {...register('token_out')}
          className="focus-ring mt-1 h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)]"
        />
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-[var(--text-brand)] px-3 text-sm font-semibold text-[var(--text-on-brand)] transition-transform duration-micro hover:scale-[0.98] disabled:opacity-80"
      >
        {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
        Simulate intent
      </button>

      <button
        type="button"
        onClick={() => reset()}
        className="w-full text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-brand)]"
      >
        Reset form
      </button>
    </form>
  );
}
