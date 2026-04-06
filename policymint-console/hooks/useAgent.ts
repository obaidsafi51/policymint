'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { buildApiUrl, hasApiUrl } from '@/lib/api';
import { mockAgent } from '@/lib/mockData';
import { AgentConfig } from '@/types';

interface AgentResponse {
  id: string;
  name: string;
  erc8004TokenId: string | null;
  isActive: boolean;
  policies?: AgentConfig['policies'];
}

export function useAgent(agentId: string) {
  const shouldUseApi = hasApiUrl() && agentId.length > 0;

  const { data, error, isLoading } = useSWR<AgentResponse>(
    shouldUseApi ? buildApiUrl(`/v1/agents/${agentId}`) : null,
    fetcher,
  );

  if (!shouldUseApi) {
    return {
      agent: mockAgent,
      isLoading: false,
      error: undefined,
    };
  }

  const mapped: AgentConfig | undefined = data
    ? {
        agent_id: data.id,
        name: data.name,
        erc8004_token_id: data.erc8004TokenId ?? '0',
        status: data.isActive ? 'active' : 'inactive',
        policies: data.policies ?? mockAgent.policies,
      }
    : undefined;

  return {
    agent: mapped,
    isLoading,
    error,
  };
}
