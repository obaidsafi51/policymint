"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { LayoutDashboard, Users, Shield, FileText, ReceiptText } from "lucide-react";

const menuItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Agents", href: "/agents", icon: Users },
  { name: "Policies", href: "/policies", icon: Shield },
  { name: "Simulate", href: "/simulate", icon: FileText },
  { name: "Audit log", href: "/audit", icon: ReceiptText },
];

export function Sidebar() {
  const pathname = usePathname();
  const { address } = useAccount();

  const walletLabel = address
    ? `${address.slice(0, 4)}...${address.slice(-3)}`
    : "0x4f...2e9";

  return (
    <aside className="hidden md:flex flex-col h-full py-6 bg-surface w-64 border-r-0.5 border-border-default shrink-0 z-50">
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0">
          <Shield size={18} className="text-on-brand" style={{ fill: "currentColor" }} />
        </div>
        <div className="min-w-0">
          <h1 className="text-brand font-medium tracking-tighter leading-none truncate">PolicyMint</h1>
          <p className="text-[10px] text-tertiary uppercase tracking-widest font-medium mt-1">Operator console</p>
        </div>
      </div>

      <nav className="flex-1 px-4 flex flex-col gap-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand text-on-brand"
                  : "text-secondary hover:bg-card hover:text-brand"
              }`}
            >
              <Icon size={20} className="shrink-0" style={isActive ? { fill: "currentColor" } : {}} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-6 pt-4 border-t-0.5 border-border-default">
        <div className="flex items-center gap-3 py-3">
          <div
            className="h-9 w-9 shrink-0 rounded-full border-0.5 border-border-default bg-card"
            aria-hidden
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-mono text-xs font-medium text-primary truncate">{walletLabel}</span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-brand">Mainnet</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
