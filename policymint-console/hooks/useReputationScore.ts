'use client';

import useSWR from 'swr';
import { publicClient } from '@/lib/viem';
import { REPUTATION_REGISTRY_ABI, REPUTATION_REGISTRY_ADDRESS } from '@/lib/contracts';
import { hasApiUrl } from '@/lib/api';

async function readReputation(agentTokenId: string): Promise<number> {
  const value = await publicClient.readContract({
    address: REPUTATION_REGISTRY_ADDRESS,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: 'getAverageScore',
    args: [BigInt(agentTokenId || '0')],
  });

  return Number(value);
}

export function useReputationScore(agentTokenId: string) {
  const canReadOnChain = hasApiUrl() && agentTokenId.length > 0;

  const { data, error, isLoading } = useSWR<number>(
    canReadOnChain ? ['reputation-score', agentTokenId] : null,
    () => readReputation(agentTokenId),
    { refreshInterval: 30_000 },
  );

  return {
    score: canReadOnChain ? (data ?? 0) : 780,
    isLoading,
    error,
  };
}
