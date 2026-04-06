'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

interface SimulateLayoutProps {
  children: ReactNode;
}

export default function SimulateLayout({ children }: SimulateLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar title="simulate" />
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
