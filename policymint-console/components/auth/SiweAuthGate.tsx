'use client';

import { WalletButton } from '@/components/shared/WalletButton';

export function SiweAuthGate() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] px-4">
      <section className="w-full max-w-md rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
        <h1 className="text-[24px] font-medium leading-8 text-[var(--text-primary)]">operator sign-in</h1>
        <p className="mt-1 text-[13px] leading-5 text-[var(--text-secondary)]">
          authenticate with SIWE to access dashboard and simulation.
        </p>

        <div className="mt-4">
          <WalletButton autoSignIn />
        </div>
      </section>
    </main>
  );
}
