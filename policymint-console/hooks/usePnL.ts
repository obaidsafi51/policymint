'use client';

import { useQuery } from '@tanstack/react-query';
import { AgentPnlSeriesPoint, ConsoleApiErrorCode } from '@/types';
import { ConsoleApiError, consoleApiRequest, hasApiUrl } from '@/lib/api';
import { mockPnl } from '@/lib/mockData';

export type PerformanceWindow = '1h' | '24h' | '7d' | 'competition';

function shouldPoll(): boolean {
  if (typeof document === 'undefined') {
    return true;
  }

  return document.visibilityState === 'visible';
}

function mapSeries(points: AgentPnlSeriesPoint[]) {
  return points.map((point) => ({
    ts: point.timestamp,
    pnl: point.cumulative_pnl_usd,
  }));
}

export function usePnL(agentId: string, window: PerformanceWindow = 'competition') {
  const shouldUseApi = hasApiUrl() && agentId.length > 0;

  const query = useQuery({
    queryKey: ['agent', agentId, 'pnl', window],
    enabled: shouldUseApi,
    queryFn: async () => {
      const response = await consoleApiRequest<{
        window: PerformanceWindow;
        start_at: string;
        end_at: string;
        baseline_allocation_usd: number;
        current_pnl_usd: number;
        pnl_pct: number;
        trade_count: number;
        series: AgentPnlSeriesPoint[];
      }>(`/v1/agents/${agentId}/pnl?window=${window}`);

      return response;
    },
    refetchInterval: () => (shouldPoll() ? 30_000 : false),
    refetchIntervalInBackground: false,
  });

  if (!shouldUseApi) {
    return {
      series: mockPnl,
      currentPnl: mockPnl[mockPnl.length - 1]?.pnl ?? 0,
      tradeCount: 0,
      isLoading: false,
      isError: false,
      errorCode: undefined as ConsoleApiErrorCode | undefined,
    };
  }

  const errorCode = query.error instanceof ConsoleApiError ? (query.error.code as ConsoleApiErrorCode) : undefined;
  const responseData = query.data?.data;
  const series = responseData ? mapSeries(responseData.series) : [];

  return {
    series,
    currentPnl: responseData?.current_pnl_usd ?? 0,
    tradeCount: responseData?.trade_count ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    errorCode,
    refetch: query.refetch,
  };
}
