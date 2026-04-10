'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { publicClient } from '@/lib/viem';
import { RISK_ROUTER_ABI, RISK_ROUTER_ADDRESS } from '@/lib/contracts';
import { buildApiUrl, hasApiUrl } from '@/lib/api';
import { defaultChecklist, mockDecisions } from '@/lib/mockData';
import { formatAction, formatPair, resolveDirection } from '@/lib/riskRouterFormatting';
import { PolicyChecklistItem, SimulateResult, TradeIntent } from '@/types';

interface EvaluateResponse {
  result: 'allow' | 'block';
  reason: string | null;
  policy_id: string | null;
  evaluation_id: string;
  eip712_signed_intent: string;
}

type SimulateIntentResult =
  | { status: 'ok'; valid: boolean; reason: string }
  | { status: 'unavailable'; reason: string };

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

async function simulateOnChain(agentId: string, intent: TradeIntent): Promise<SimulateIntentResult> {
  const direction = resolveDirection({
    actionType: intent.action_type,
    params: intent.params,
  });
  const pair = formatPair(intent.token_in, intent.token_out);
  const action = formatAction(direction);
  const amount = Number(intent.amount);
  const amountUsdScaled = BigInt(Math.floor(amount * 1_000_000));

  const result = await publicClient.readContract({
    address: RISK_ROUTER_ADDRESS,
    abi: RISK_ROUTER_ABI,
    functionName: 'simulateIntent',
    args: [BigInt(agentId), pair, action, amountUsdScaled],
  });

  if (Array.isArray(result)) {
    return {
      status: 'ok',
      valid: Boolean(result[0]),
      reason: String(result[1] ?? ''),
    };
  }

  return {
    status: 'ok',
    valid: Boolean(result.valid),
    reason: String(result.reason ?? ''),
  };
}

export function useSimulate(agentUuid: string, agentTokenId: string) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<SimulateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function simulateIntent(intent: TradeIntent) {
    setIsLoading(true);
    setError(null);

    try {
      const start = performance.now();

      let onChain: SimulateIntentResult = { status: 'unavailable', reason: 'demo mode' };
      try {
        onChain = await simulateOnChain(agentTokenId || '0', intent);
      } catch {
        onChain = { status: 'unavailable', reason: 'on-chain simulation unavailable' };
      }

      if (!hasApiUrl()) {
        const demo = mockDecisions[0];
        setResult({
          onChain,
          policyEngine: demo,
          latency_ms: Math.round(performance.now() - start),
          checklist: buildChecklist(demo.result, demo.reason ?? null),
        });
        await queryClient.invalidateQueries({ queryKey: ['agent', agentUuid] });
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
      await queryClient.invalidateQueries({ queryKey: ['agent', agentUuid] });
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
