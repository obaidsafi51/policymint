'use client';

import { RegistrationStep, RegistrationStepItem } from '@/components/agents/RegistrationStep';

interface RegistrationProgressProps {
  steps: RegistrationStepItem[];
  errorMessage?: string;
  failedStep?: string;
  onRetry?: () => void;
}

export function RegistrationProgress({
  steps,
  errorMessage,
  failedStep,
  onRetry,
}: RegistrationProgressProps) {
  return (
    <section className="h-full p-6 md:p-8">
      <h2 className="font-headline text-3xl font-bold text-[var(--text-primary)]">Registration in Progress</h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">Agent is being created on-chain. Live execution steps appear below.</p>

      <ul className="mt-5 space-y-2">
        {steps.map((step) => (
          <RegistrationStep key={step.stepNumber} step={step} />
        ))}
      </ul>

      {errorMessage ? (
        <div className="mt-5 rounded-lg border border-[var(--border-danger)] bg-[var(--bg-danger)] p-3">
          <p className="text-sm font-semibold text-[var(--text-danger)]">Step failed{failedStep ? `: ${failedStep}` : ''}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{errorMessage}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="focus-ring mt-3 inline-flex h-8 items-center rounded-md border border-[var(--border-default)] px-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
