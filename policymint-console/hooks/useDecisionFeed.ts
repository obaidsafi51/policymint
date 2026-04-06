'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { buildApiUrl, hasApiUrl } from '@/lib/api';
import { fetcher } from '@/lib/fetcher';
import { mockDecisions } from '@/lib/mockData';
import { PolicyDecision } from '@/types';

export function useDecisionFeed(agentId: string) {
  const [decisions, setDecisions] = useState<PolicyDecision[]>([]);
  const [sseFailed, setSseFailed] = useState(false);
  const shouldUseApi = hasApiUrl() && agentId.length > 0;

  const polling = useSWR<PolicyDecision[]>(
    shouldUseApi && sseFailed ? buildApiUrl(`/v1/agents/${agentId}/events`) : null,
    fetcher,
    { refreshInterval: 10_000 },
  );

  useEffect(() => {
    if (!shouldUseApi) {
      setDecisions(mockDecisions);
      return;
    }

    const streamUrl = buildApiUrl(`/v1/agents/${agentId}/events`);
    const eventSource = new EventSource(streamUrl, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const incoming = JSON.parse(event.data) as PolicyDecision;
        setDecisions((prev) => [incoming, ...prev].slice(0, 50));
      } catch {
        setSseFailed(true);
      }
    };

    eventSource.onerror = () => {
      setSseFailed(true);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [agentId, shouldUseApi]);

  useEffect(() => {
    if (polling.data && polling.data.length > 0) {
      setDecisions(polling.data.slice(0, 50));
    }
  }, [polling.data]);

  return {
    decisions: decisions.length > 0 ? decisions : mockDecisions,
    isLoading: false,
    error: polling.error,
  };
}
