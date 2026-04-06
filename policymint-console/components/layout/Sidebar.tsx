'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useChainId } from 'wagmi';
import {
  BarChart3,
  Beaker,
  Box,
  Bot,
  FileText,
  HelpCircle,
  ScrollText,
  Shield,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3, disabled: false },
  { href: '#', label: 'Agents', icon: Bot, disabled: true },
  { href: '#', label: 'Policies', icon: Shield, disabled: true },
  { href: '/simulate', label: 'Simulate', icon: Beaker, disabled: false },
  { href: '#', label: 'Audit Log', icon: ScrollText, disabled: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const chainId = useChainId();

  const networkLabel = isConnected
    ? chainId === 84532
      ? 'MAINNET'
      : chainId === 11155111
        ? 'SEPOLIA'
        : chainId === 1
          ? 'ETHEREUM'
          : `CHAIN ${chainId}`
    : 'NO WALLET';

  return (
    <aside className="sticky top-0 hidden h-screen w-[200px] shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-6 md:flex md:flex-col">
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="inline-flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-brand)]">
            <Box size={16} className="text-[var(--text-brand)]" />
          </div>
          <div>
            <p className="font-headline text-base font-extrabold tracking-tight text-[var(--text-brand)]">PolicyMint</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Operator Console</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href !== '#' && pathname.startsWith(item.href);

          const baseClass = isActive
            ? 'bg-[var(--text-brand)] text-[var(--text-on-brand)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-brand)]';

          const itemClass = `focus-ring inline-flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-micro ${baseClass}`;

          if (item.disabled) {
            return (
              <div
                key={item.label}
                className={itemClass}
                aria-disabled="true"
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={itemClass}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[var(--border-default)] pt-6">
        <button className="w-full rounded-xl bg-[var(--text-brand)] py-2 text-sm font-semibold text-[var(--text-on-brand)] transition-opacity hover:opacity-90">
          + New Policy
        </button>
        <div className="mt-4 space-y-1">
          <button className="inline-flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--text-brand)]">
            <FileText size={14} />
            <span>Docs</span>
          </button>
          <button className="inline-flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--text-brand)]">
            <HelpCircle size={14} />
            <span>Support</span>
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-2">
          <div className="flex items-center gap-2">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBl_4KPx6m7x-tyGrc22ejo8YtB1yvAX-s7JkXYBDHHovzb8nY1LT9Ei1X0uzJJgw7ynZUCd3Q7mP1ch7zmN--KTF7sKchNOJdQR85f2jH4wPIuazFOPSUXOGgUfGlySCQnHBf9AcNiQV9dtt-x2_hksE9LylvYPFNZqGP3gN9pWoWsYUHEu6CPj-2Xe-uRn_L9j1k6LzbvbAME_Ig7FZQDkfHainVMpNPoohkj88Z3uC21bOQeIho64QOJ7Kp2HRF8ZqrY7Wf3IQSR"
              alt="Operator Avatar"
              className="h-8 w-8 rounded-full object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[var(--text-primary)]">Operator</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-brand)]">{networkLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
