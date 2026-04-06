'use client';

import { IntentForm } from '@/components/simulate/IntentForm';
import { SimulateResultPanel } from '@/components/simulate/SimulateResultPanel';
import { useAgent } from '@/hooks/useAgent';
import { useSimulate } from '@/hooks/useSimulate';
import { DEFAULT_AGENT_ID } from '@/lib/constants';

export function SimulateView() {
  const { agent } = useAgent(DEFAULT_AGENT_ID);
  const { result, isLoading, error, simulateIntent } = useSimulate(
    agent?.agent_id ?? DEFAULT_AGENT_ID,
    agent?.erc8004_token_id ?? '1',
  );

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <IntentForm isLoading={isLoading} onSubmit={simulateIntent} />
      <SimulateResultPanel result={result} isLoading={isLoading} error={error} />
    </div>
  );
}
