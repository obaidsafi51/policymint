'use client';

import { useQuery } from '@tanstack/react-query';
import { ConsoleApiError, consoleApiRequest, hasApiUrl } from '@/lib/api';
import { ConsoleApiErrorCode } from '@/types';
import { PerformanceWindow } from '@/hooks/usePnL';

function shouldPoll(): boolean {
  if (typeof document === 'undefined') {
    return true;
  }

  return document.visibilityState === 'visible';
}

export function useDrawdown(agentId: string, window: PerformanceWindow = 'competition') {
  const shouldUseApi = hasApiUrl() && agentId.length > 0;

  const query = useQuery({
    queryKey: ['agent', agentId, 'drawdown', window],
    enabled: shouldUseApi,
    queryFn: async () => {
      const response = await consoleApiRequest<{
        protected_series: Array<{ timestamp: string; cumulative_pnl_usd: number }>;
        baseline_series: Array<{ timestamp: string; cumulative_pnl_usd: number }>;
        prevention_value_usd: number;
        prevention_value_pct: number;
        blocked_trade_count: number;
        simulation_disclaimer: string;
      }>(`/v1/agents/${agentId}/drawdown-comparison?window=${window}`);

      return response;
    },
    refetchInterval: () => (shouldPoll() ? 30_000 : false),
    refetchIntervalInBackground: false,
  });

  if (!shouldUseApi) {
    return {
      drawdownData: [],
      preventionValueUsd: 0,
      preventionPct: 0,
      isProtectedUnderperforming: false,
      isLoading: false,
      isError: false,
      errorCode: undefined as ConsoleApiErrorCode | undefined,
      refetch: async () => undefined,
    };
  }

  const errorCode = query.error instanceof ConsoleApiError ? (query.error.code as ConsoleApiErrorCode) : undefined;
  const responseData = query.data?.data;

  const protectedSeries = responseData?.protected_series ?? [];
  const baselineSeries = responseData?.baseline_series ?? [];
  const seriesLength = Math.min(protectedSeries.length, baselineSeries.length);

  const drawdownData = Array.from({ length: seriesLength }).map((_, index) => ({
    ts: protectedSeries[index].timestamp,
    protected: protectedSeries[index].cumulative_pnl_usd,
    baseline: baselineSeries[index].cumulative_pnl_usd,
  }));

  const isProtectedUnderperforming = drawdownData.some((point) => point.protected < point.baseline);

  return {
    drawdownData,
    preventionValueUsd: responseData?.prevention_value_usd ?? 0,
    preventionPct: responseData?.prevention_value_pct ?? 0,
    isProtectedUnderperforming,
    isLoading: query.isLoading,
    isError: query.isError,
    errorCode,
    refetch: query.refetch,
  };
}
