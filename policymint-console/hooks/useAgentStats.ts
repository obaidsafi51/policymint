'use client';

import { useQuery } from '@tanstack/react-query';
import { ConsoleApiError, consoleApiRequest, hasApiUrl } from '@/lib/api';
import { ConsoleApiErrorCode } from '@/types';

function shouldPoll(): boolean {
  if (typeof document === 'undefined') {
    return true;
  }

  return document.visibilityState === 'visible';
}

export function useAgentStats(agentId: string) {
  const shouldUseApi = hasApiUrl() && agentId.length > 0;

  const query = useQuery({
    queryKey: ['agent', agentId, 'stats'],
    enabled: shouldUseApi,
    queryFn: async () => {
      const response = await consoleApiRequest<{
        total_evaluations: number;
        allow_count: number;
        block_count: number;
        block_rate_pct: number;
        execution_success_rate: number;
        emission_success_rate: number;
        reputation_score: number;
        score_trend: 'up' | 'down' | 'stable';
        sharpe_ratio: number | null;
        sharpe_data_quality: 'ok' | 'insufficient_data';
        current_drawdown_pct: number;
        policy_breach: boolean;
        breach_reason: string | null;
        competition_window_start: string | null;
      }>(`/v1/agents/${agentId}/stats`);

      return response;
    },
    refetchInterval: () => (shouldPoll() ? 15_000 : false),
    refetchIntervalInBackground: false,
  });

  if (!shouldUseApi) {
    return {
      stats: {
        total_evaluations: 14,
        allow_count: 12,
        block_count: 2,
        block_rate_pct: 14.2,
        execution_success_rate: 100,
        emission_success_rate: 100,
        reputation_score: 780,
        score_trend: 'stable' as const,
        sharpe_ratio: null,
        sharpe_data_quality: 'insufficient_data' as const,
        current_drawdown_pct: 2.4,
        policy_breach: false,
        breach_reason: null,
        competition_window_start: null,
      },
      computedAt: new Date().toISOString(),
      isLoading: false,
      isError: false,
      errorCode: undefined as ConsoleApiErrorCode | undefined,
      refetch: async () => undefined,
    };
  }

  const errorCode = query.error instanceof ConsoleApiError ? (query.error.code as ConsoleApiErrorCode) : undefined;

  return {
    stats: query.data?.data,
    computedAt: query.data?.meta.generated_at,
    isLoading: query.isLoading,
    isError: query.isError,
    errorCode,
    refetch: query.refetch,
  };
}
