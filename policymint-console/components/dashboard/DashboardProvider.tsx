'use client';

import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { PerformanceWindow } from '@/hooks/usePnL';
import { DEFAULT_AGENT_ID } from '@/lib/constants';

type DashboardContextValue = {
  agentId: string;
  window: PerformanceWindow;
  setWindow: (nextWindow: PerformanceWindow) => void;
  refreshAll: () => Promise<void>;
  isRefreshing: boolean;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

interface DashboardProviderProps {
  children: ReactNode;
  agentId?: string;
}

export function DashboardProvider({ children, agentId = DEFAULT_AGENT_ID }: DashboardProviderProps) {
  const queryClient = useQueryClient();
  const [window, setWindow] = useState<PerformanceWindow>('competition');
  const isRefreshing = useIsFetching({ queryKey: ['agent', agentId] }) > 0;

  async function refreshAll() {
    await queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
    await queryClient.refetchQueries({ queryKey: ['agent', agentId], type: 'active' });
  }

  const value = useMemo(
    () => ({
      agentId,
      window,
      setWindow,
      refreshAll,
      isRefreshing,
    }),
    [agentId, window, isRefreshing],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error('useDashboardContext must be used within DashboardProvider');
  }

  return context;
}
