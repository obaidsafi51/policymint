'use client';

import { Bell, Settings } from 'lucide-react';
import { useAccount, useChainId } from 'wagmi';
import { usePathname } from 'next/navigation';
import { WalletButton } from '@/components/shared/WalletButton';

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const pathname = usePathname();

  const routeAgentId = (() => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length >= 2 && segments[0] === 'dashboard') {
      return segments[1];
    }
    return null;
  })();

  const agentBadge = routeAgentId
    ? {
        shortId: `#${routeAgentId.slice(0, 4).toUpperCase()}`,
        label: `${routeAgentId.slice(0, 8)}…`,
      }
    : null;

  const pageLabel = title === 'simulate'
    ? 'Simulation'
    : title === 'agents'
      ? 'Agents'
      : 'Dashboard Overview';

  const networkLabel = isConnected
    ? chainId === 84532
      ? 'BASE SEPOLIA'
      : chainId === 11155111
        ? 'SEPOLIA'
        : chainId === 1
          ? 'ETHEREUM'
          : `CHAIN ${chainId}`
    : 'NO WALLET';

  return (
    <header className="sticky top-0 z-50 flex h-11 items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-card)]/90 px-4 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-1 text-[var(--text-tertiary)] md:flex">
          <span className="font-mono text-[11px]">›</span>
          <span className="text-xs">{pageLabel}</span>
        </div>
        {title === 'dashboard' ? (
          <div className="hidden items-center gap-2 rounded border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-0.5 md:flex">
            <span className="rounded bg-[var(--bg-brand)] px-1 font-mono text-[10px] text-[var(--text-brand)]">{agentBadge?.shortId ?? '#----'}</span>
            <span className="text-[11px] text-[var(--text-secondary)]">{agentBadge?.label ?? 'No agent selected'}</span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-0.5 md:inline-flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--text-brand)]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-brand)]">{networkLabel}</span>
        </div>
        <button className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-brand)]">
          <Bell size={16} />
        </button>
        <button className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-brand)]">
          <Settings size={16} />
        </button>
        <WalletButton />
      </div>
    </header>
  );
}
