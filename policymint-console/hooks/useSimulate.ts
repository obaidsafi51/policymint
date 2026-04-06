'use client';

import { useState } from 'react';
import { publicClient } from '@/lib/viem';
import { RISK_ROUTER_ABI, RISK_ROUTER_ADDRESS } from '@/lib/contracts';
import { buildApiUrl, hasApiUrl } from '@/lib/api';
import { defaultChecklist, mockDecisions } from '@/lib/mockData';
import { PolicyChecklistItem, SimulateResult, TradeIntent } from '@/types';

interface EvaluateResponse {
  result: 'allow' | 'block';
  reason: string | null;
  policy_id: string | null;
  evaluation_id: string;
  eip712_signed_intent: string;
}

function buildChecklist(result: 'allow' | 'block', reason: string | null): PolicyChecklistItem[] {
  if (result === 'allow') {
    return defaultChecklist;
  }

  return [
    {
      policyName: 'venue_allowlist',
      state: reason?.toLowerCase().includes('venue') ? 'fail' : 'pass',
      detail: reason?.toLowerCase().includes('venue') ? reason : 'kraken-spot is in allowlist',
    },
    {
      policyName: 'spend_cap_per_tx',
      state: reason?.toLowerCase().includes('spend') ? 'fail' : 'skipped',
      detail: reason?.toLowerCase().includes('spend') ? reason : 'skipped (prior rule failed)',
    },
    {
      policyName: 'daily_loss_budget',
      state: 'skipped',
      detail: 'skipped (prior rule failed)',
    },
  ];
}

async function simulateOnChain(agentId: string, intent: TradeIntent) {
  const pair = `${intent.token_in.toUpperCase()}${(intent.token_out ?? 'USD').toUpperCase()}`;
  const action = intent.action_type === 'trade' || intent.action_type === 'swap' ? 'BUY' : 'SELL';
  const amountUsdScaled = BigInt(Math.floor(Number(intent.amount) * 1_000_000));

  const result = await publicClient.readContract({
    address: RISK_ROUTER_ADDRESS,
    abi: RISK_ROUTER_ABI,
    functionName: 'simulateIntent',
    args: [BigInt(agentId), pair, action, amountUsdScaled],
  });

  return {
    valid: Boolean(result.valid),
    reason: String(result.reason ?? ''),
  };
}

export function useSimulate(agentUuid: string, agentTokenId: string) {
  const [result, setResult] = useState<SimulateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function simulateIntent(intent: TradeIntent) {
    setIsLoading(true);
    setError(null);

    try {
      const start = performance.now();

      let onChain = { valid: true, reason: 'demo mode' };
      if (hasApiUrl()) {
        onChain = await simulateOnChain(agentTokenId || '0', intent);
      }

      if (!hasApiUrl()) {
        const demo = mockDecisions[0];
        setResult({
          onChain,
          policyEngine: demo,
          latency_ms: Math.round(performance.now() - start),
          checklist: buildChecklist(demo.result, demo.reason ?? null),
        });
        return;
      }

      const response = await fetch(buildApiUrl('/v1/evaluate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          agent_id: agentUuid,
          ...intent,
        }),
      });

      if (!response.ok) {
        throw new Error(`Evaluation failed: ${response.statusText}`);
      }

      const policyEngine = (await response.json()) as EvaluateResponse;

      setResult({
        onChain,
        policyEngine: {
          ...policyEngine,
          timestamp: new Date().toISOString(),
          agent_name: 'PolicyMint Agent',
          action_summary: `${intent.action_type} ${intent.token_in}/${intent.token_out ?? 'USD'} $${intent.amount}`,
        },
        latency_ms: Math.round(performance.now() - start),
        checklist: buildChecklist(policyEngine.result, policyEngine.reason),
      });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Simulation failed';
      setError(message);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    result,
    isLoading,
    error,
    simulateIntent,
  };
}
