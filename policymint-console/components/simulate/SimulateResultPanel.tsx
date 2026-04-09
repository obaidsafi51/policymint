import { CheckCircle2, XCircle } from 'lucide-react';
import { PolicyChecklist } from '@/components/simulate/PolicyChecklist';
import { SimulateResult } from '@/types';

interface SimulateResultPanelProps {
  result: SimulateResult | null;
  isLoading: boolean;
  error: string | null;
}

export function SimulateResultPanel({ result, isLoading, error }: SimulateResultPanelProps) {
  const verdict = result?.policyEngine?.result;

  const borderClass = verdict === 'allow'
    ? 'border border-[var(--border-success)]'
    : verdict === 'block'
      ? 'border border-[var(--border-danger)]'
      : 'border border-[var(--border-default)]';

  return (
    <div className="flex-1 space-y-4">
      <section className={`rounded-xl bg-[var(--bg-surface)] p-5 ${borderClass}`}>
        {!result && !isLoading && !error ? (
          <div>
            <p className="font-headline text-3xl font-bold tracking-tight text-[var(--text-primary)]">Enter an intent to simulate</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              active policies: venue allowlist, spend cap per tx, daily loss budget.
            </p>
          </div>
        ) : null}

        {isLoading ? <div className="shimmer h-28 rounded-base" /> : null}

        {error ? (
          <p className="text-[13px] leading-5 text-[var(--text-danger)]">{error}</p>
        ) : null}

        {result ? (
          <div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-card)]">
              {verdict === 'allow' ? (
                <CheckCircle2 size={24} className="text-[var(--text-success)]" />
              ) : (
                <XCircle size={24} className="text-[var(--text-danger)]" />
              )}
            </div>
            <p
              className={`mt-3 font-headline text-4xl font-bold leading-none ${verdict === 'allow' ? 'text-[var(--text-success)]' : 'text-[var(--text-danger)]'}`}
            >
              {verdict === 'allow' ? 'Intent allowed' : 'Intent blocked'}
            </p>
            {verdict === 'block' && result.policyEngine?.reason ? (
              <p className="mt-2 text-sm text-[var(--text-danger)]">{result.policyEngine.reason}</p>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3 text-xs text-[var(--text-secondary)] lg:grid-cols-4">
              <span className="font-mono">eval: {result.policyEngine?.evaluation_id ?? '—'}</span>
              <span className="font-mono">latency: {result.latency_ms}ms</span>
              <span>
                RiskRouter: {result.onChain.valid ? 'valid ✓' : `invalid (${result.onChain.reason})`}
              </span>
              <span>PolicyMint: {verdict === 'allow' ? 'allowed ✓' : 'blocked ✕'}</span>
            </div>
          </div>
        ) : null}
      </section>

      <PolicyChecklist items={result?.checklist ?? []} />
    </div>
  );
}
