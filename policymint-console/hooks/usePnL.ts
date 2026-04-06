'use client';

import useSWR from 'swr';
import { buildApiUrl, hasApiUrl } from '@/lib/api';
import { fetcher } from '@/lib/fetcher';
import { mockDrawdown, mockPnl, mockStats } from '@/lib/mockData';

interface StatsResponse {
  tradesToday: number;
  blocksToday: number;
}

interface PnlPoint {
  ts: string;
  pnl: number;
}

interface DrawdownPoint {
  ts: string;
  protected: number;
  baseline: number;
}

export function usePnL(agentId: string) {
  const shouldUseApi = hasApiUrl() && agentId.length > 0;

  const pnl = useSWR<PnlPoint[]>(
    shouldUseApi ? buildApiUrl(`/v1/agents/${agentId}/pnl?window=competition`) : null,
    fetcher,
    { refreshInterval: 10_000 },
  );

  const drawdown = useSWR<DrawdownPoint[]>(
    shouldUseApi ? buildApiUrl(`/v1/agents/${agentId}/drawdown-comparison`) : null,
    fetcher,
    { refreshInterval: 10_000 },
  );

  const stats = useSWR<StatsResponse>(
    shouldUseApi ? buildApiUrl(`/v1/agents/${agentId}/stats`) : null,
    fetcher,
    { refreshInterval: 10_000 },
  );

  if (!shouldUseApi) {
    return {
      pnlData: mockPnl,
      drawdownData: mockDrawdown,
      stats: mockStats,
      isLoading: false,
      error: undefined,
    };
  }

  return {
    pnlData: pnl.data ?? [],
    drawdownData: drawdown.data ?? [],
    stats: stats.data ?? { tradesToday: 0, blocksToday: 0 },
    isLoading: pnl.isLoading || drawdown.isLoading || stats.isLoading,
    error: pnl.error ?? drawdown.error ?? stats.error,
  };
}
