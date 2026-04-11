'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { PerformanceWindow } from '@/hooks/usePnL';
import { DEFAULT_AGENT_ID } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';

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
  const router = useRouter();
  const pathname = usePathname();
  const { agentIds } = useAuth();
  const queryClient = useQueryClient();
  const [window, setWindow] = useState<PerformanceWindow>('competition');

  const routeAgentId = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length >= 2 && segments[0] === 'dashboard') {
      return segments[1];
    }
    return null;
  }, [pathname]);

  const resolvedAgentId = routeAgentId ?? agentId;
  const isRefreshing = useIsFetching({ queryKey: ['agent', resolvedAgentId] }) > 0;

  useEffect(() => {
    if (agentIds.length === 0) {
      if (pathname.startsWith('/dashboard')) {
        router.replace('/onboarding');
      }
      return;
    }

    if (pathname === '/dashboard') {
      router.replace(`/dashboard/${agentIds[0]}`);
      return;
    }

    if (routeAgentId && !agentIds.includes(routeAgentId)) {
      router.replace(`/dashboard/${agentIds[0]}`);
    }
  }, [agentIds, pathname, routeAgentId, router]);

  const refreshAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['agent', resolvedAgentId] });
    await queryClient.refetchQueries({ queryKey: ['agent', resolvedAgentId], type: 'active' });
  }, [queryClient, resolvedAgentId]);

  const value = useMemo(
    () => ({
      agentId: resolvedAgentId,
      window,
      setWindow,
      refreshAll,
      isRefreshing,
    }),
    [resolvedAgentId, window, refreshAll, isRefreshing],
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
