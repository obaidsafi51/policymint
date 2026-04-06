'use client';

import { ReactNode } from 'react';
import { DecisionFeedRail } from '@/components/layout/DecisionFeedRail';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { DEFAULT_AGENT_ID } from '@/lib/constants';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="h-screen overflow-hidden bg-[var(--bg-page)]">
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex h-screen flex-1 flex-col overflow-hidden">
          <TopBar title="dashboard" />
          <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
            <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
            <DecisionFeedRail agentId={DEFAULT_AGENT_ID} />
          </div>
        </div>
      </div>
    </div>
  );
}
