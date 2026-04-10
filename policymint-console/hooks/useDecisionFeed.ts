'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { ConsoleApiError, consoleApiRequest, hasApiUrl } from '@/lib/api';
import { mockDecisions } from '@/lib/mockData';
import { AgentEventItem, AgentEventsResponse, ConsoleApiErrorCode, PolicyDecision } from '@/types';

type FeedWindow = '1h' | '24h' | 'competition';

type FeedFilters = {
  result?: 'allow' | 'block';
  window?: FeedWindow;
};

const PAGE_SIZE = 20;

function shouldPoll(): boolean {
  if (typeof document === 'undefined') {
    return true;
  }

  return document.visibilityState === 'visible';
}

function toPolicyDecision(item: AgentEventItem): PolicyDecision {
  return {
    evaluation_id: item.evaluation_id,
    result: item.result,
    reason: item.reason,
    policy_id: item.policy_id,
    eip712_signed_intent: item.evaluation_id,
    validation_tx_hash: item.validation_tx_hash,
    timestamp: item.timestamp,
    agent_name: 'PolicyMint Agent',
    action_summary: `${item.action_type} ${item.venue} $${Math.round(item.amount_usd).toLocaleString()}`,
  };
}

export function useDecisionFeed(agentId: string, filters?: FeedFilters) {
  const shouldUseApi = hasApiUrl() && agentId.length > 0;

  const query = useInfiniteQuery({
    queryKey: ['agent', agentId, 'events', filters?.result ?? 'all', filters?.window ?? 'competition'],
    enabled: shouldUseApi,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();

      if (pageParam) {
        params.set('cursor', pageParam);
      }

      if (filters?.result) {
        params.set('result', filters.result);
      }

      if (filters?.window) {
        params.set('window', filters.window);
      }

      params.set('limit', String(PAGE_SIZE));

      const suffix = params.toString();
      const path = `/v1/agents/${agentId}/events${suffix ? `?${suffix}` : ''}`;
      const response = await consoleApiRequest<AgentEventsResponse['data']>(path);
      return response.data;
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    refetchInterval: () => (shouldPoll() ? 10_000 : false),
    refetchIntervalInBackground: false,
  });

  const decisions = shouldUseApi
    ? (query.data?.pages.flatMap((page) => page.events.map(toPolicyDecision)) ?? [])
    : mockDecisions;

  const errorCode = query.error instanceof ConsoleApiError ? (query.error.code as ConsoleApiErrorCode) : undefined;

  return {
    decisions,
    isLoading: shouldUseApi ? query.isLoading : false,
    isError: shouldUseApi ? query.isError : false,
    errorCode,
    hasMore: shouldUseApi ? Boolean(query.hasNextPage) : false,
    loadMore: shouldUseApi ? query.fetchNextPage : async () => undefined,
    isPolling: shouldUseApi ? query.isRefetching : false,
    error: shouldUseApi ? query.error : undefined,
  };
}
