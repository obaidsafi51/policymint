"use client";

import useSWR from "swr";
import { useEffect, useState } from "react";
import { mockAgents, mockDecisions, mockMetrics, mockPolicies } from "./mock-data";
import { Decision } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
// If it's literally localhost:3001/api/v1 and we don't have a backend, fallback is true.
// For Next.js, we assume if it's the default, we might still fallback if it fails.
const NO_API = !process.env.NEXT_PUBLIC_API_URL; 

async function fetcher(url: string) {
  if (NO_API) throw new Error("Mock fallback enabled.");
  const res = await fetch(`${API_URL}${url}`);
  if (!res.ok) throw new Error("An error occurred while fetching the data.");
  return res.json();
}

export function useAgents() {
  const { data, error, isLoading } = useSWR("/agents", fetcher, { 
    errorRetryCount: 3,
    fallbackData: mockAgents 
  });
  return { agents: data || mockAgents, isLoading, isError: error };
}

export function useDecisions() {
  const { data, error, isLoading } = useSWR("/decisions", fetcher, { 
    fallbackData: mockDecisions 
  });
  return { decisions: data || mockDecisions, isLoading, isError: error };
}

export function useMetrics(agentId: string = "global") {
  const { data, error, isLoading } = useSWR(`/metrics/${agentId}`, fetcher, { 
    refreshInterval: 30000, 
    fallbackData: mockMetrics 
  });
  return { metrics: data || mockMetrics, isLoading, isError: error };
}

export function usePolicies(agentId: string) {
  const { data, error, isLoading, mutate } = useSWR(`/agents/${agentId}/policies`, fetcher, { 
    fallbackData: mockPolicies.filter(p => p.agentId === agentId) 
  });
  return { policies: data || mockPolicies.filter(p => p.agentId === agentId), isLoading, isError: error, mutate };
}

export function useDecisionStream() {
  const [decisions, setDecisions] = useState<Decision[]>(mockDecisions);
  
  useEffect(() => {
    if (NO_API) return;
    try {
      const evtSource = new EventSource(`${API_URL}/decisions/stream`);
      evtSource.onmessage = (event) => {
        const newDecision = JSON.parse(event.data);
        setDecisions(prev => [newDecision, ...prev]);
      };
      
      // Fallback pooling setup handled implicitly by connection failure
      evtSource.onerror = () => {
         console.warn("SSE failed, falling back to polling would happen here in robust impl.");
         evtSource.close();
      }
      return () => evtSource.close();
    } catch {
      // Ignored
    }
  }, []);

  return { decisions };
}
