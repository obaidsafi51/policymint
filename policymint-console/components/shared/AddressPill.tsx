'use client';

import { Copy } from 'lucide-react';
import { formatAddress } from '@/lib/formatAddress';

interface AddressPillProps {
  address: string;
}

export function AddressPill({ address }: AddressPillProps) {
  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      // no-op
    }
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-[var(--border-default)] px-2 py-1 text-[12px] leading-[18px] text-[var(--text-secondary)]">
      <span className="font-mono">{formatAddress(address)}</span>
      <button
        type="button"
        onClick={copyAddress}
        aria-label="Copy full address"
        className="focus-ring rounded-sm"
      >
        <Copy size={14} />
      </button>
    </div>
  );
}
