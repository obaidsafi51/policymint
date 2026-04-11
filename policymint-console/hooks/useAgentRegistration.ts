'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildApiUrl, hasApiUrl } from '@/lib/api';
import type { AgentRegistrationFormValues } from '@/components/agents/AgentRegistrationForm';
import type { RegistrationStepItem, RegistrationStepStatus } from '@/components/agents/RegistrationStep';

type RegistrationPhase = 'IDLE' | 'REGISTERING' | 'SUCCESS' | 'ERROR';

interface RegisterPayload extends AgentRegistrationFormValues {
  walletAddress: string;
  chainId: number;
}

interface RegistrationEvent {
  stepNumber: number;
  stepLabel?: string;
  status: RegistrationStepStatus;
  message?: string;
  txHash?: string;
  registrationId?: string;
  done?: boolean;
  result?: {
    agent?: {
      id?: string;
      erc8004TokenId?: string | null;
      registrationTxHash?: string | null;
    };
    agent_id?: string;
    erc8004_token_id?: string | null;
    vault_claim_tx_hash?: string | null;
    vault_claim_status?: 'claimed' | 'pending_retry' | 'skipped';
    vault_claim_error?: string | null;
    apiKey?: string;
  };
}

interface RegistrationResult {
  registrationId?: string;
  agentUuid: string;
  erc8004TokenId: string | null;
  registrationTxHash: string | null;
  vaultClaimTxHash: string | null;
  vaultClaimStatus: 'claimed' | 'pending_retry' | 'skipped';
  vaultClaimError: string | null;
  apiKey: string;
  txHashes: string[];
}

interface RegisterErrorState {
  failedStep?: string;
  errorMessage: string;
  alreadyRegistered?: {
    id?: string;
    name?: string;
    walletAddress?: string;
    erc8004TokenId?: string | null;
  };
}

const STEP_DEFS: Array<Pick<RegistrationStepItem, 'stepNumber' | 'stepLabel'>> = [
  { stepNumber: 1, stepLabel: 'Saving agent to database' },
  { stepNumber: 2, stepLabel: 'Registering on-chain identity' },
  { stepNumber: 3, stepLabel: 'Claiming sandbox capital' },
  { stepNumber: 4, stepLabel: 'Storing on-chain agent ID' },
  { stepNumber: 5, stepLabel: 'Generating API key' },
];

function initialSteps(): RegistrationStepItem[] {
  return STEP_DEFS.map((step) => ({ ...step, status: 'pending' }));
}

function mapStrategyType(strategyType: AgentRegistrationFormValues['strategyType']) {
  return strategyType;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function useAgentRegistration() {
  const [phase, setPhase] = useState<RegistrationPhase>('IDLE');
  const [steps, setSteps] = useState<RegistrationStepItem[]>(() => initialSteps());
  const [registrationId, setRegistrationId] = useState<string | undefined>();
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [errorState, setErrorState] = useState<RegisterErrorState | null>(null);
  const [lastPayload, setLastPayload] = useState<RegisterPayload | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const txHashesRef = useRef<string[]>([]);

  const isRegistering = phase === 'REGISTERING';

  const txHashes = useMemo(() => {
    const hashes = steps.map((step) => step.txHash).filter((value): value is string => Boolean(value));
    return Array.from(new Set(hashes));
  }, [steps]);

  useEffect(() => {
    txHashesRef.current = txHashes;
  }, [txHashes]);

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      closeEventSource();
    };
  }, [closeEventSource]);

  const updateStep = useCallback((event: RegistrationEvent) => {
    setSteps((prev) => {
      const next = [...prev];
      const index = next.findIndex((step) => step.stepNumber === event.stepNumber);

      if (index === -1) {
        return prev;
      }

      next[index] = {
        ...next[index],
        status: event.status,
        stepLabel: event.stepLabel ?? next[index].stepLabel,
        message: event.message,
        txHash: event.txHash ?? next[index].txHash,
      };

      return next;
    });
  }, []);

  const failRegistration = useCallback((failedStep: string | undefined, message: string, alreadyRegistered?: RegisterErrorState['alreadyRegistered']) => {
    closeEventSource();
    setPhase('ERROR');
    setErrorState({
      failedStep,
      errorMessage: message,
      alreadyRegistered,
    });
  }, [closeEventSource]);

  const completeRegistration = useCallback((payload: RegistrationResult) => {
    closeEventSource();
    setResult(payload);
    setPhase('SUCCESS');
  }, [closeEventSource]);

  const runMockProgress = useCallback(async () => {
    setRegistrationId('mock-registration');

    for (const step of STEP_DEFS) {
      updateStep({ stepNumber: step.stepNumber, status: 'active', message: 'Processing…' });
      await wait(400);

      const txHash = step.stepNumber === 2 || step.stepNumber === 3
        ? '0x9a5e4b38179f56d478f6d805fbe580d46f42c9db690ed2f8dcb152dd75edbd9a'
        : undefined;

      updateStep({ stepNumber: step.stepNumber, status: 'done', message: 'Completed', txHash });
    }

    completeRegistration({
      registrationId: 'mock-registration',
      agentUuid: '00000000-0000-7000-8000-000000000001',
      erc8004TokenId: '42',
      registrationTxHash: '0x9a5e4b38179f56d478f6d805fbe580d46f42c9db690ed2f8dcb152dd75edbd9a',
      vaultClaimTxHash: '0x9a5e4b38179f56d478f6d805fbe580d46f42c9db690ed2f8dcb152dd75edbd9a',
      vaultClaimStatus: 'claimed',
      vaultClaimError: null,
      apiKey: 'pm_live_mock_registration_token_0001',
      txHashes: [
        '0x9a5e4b38179f56d478f6d805fbe580d46f42c9db690ed2f8dcb152dd75edbd9a',
      ],
    });
  }, [completeRegistration, updateStep]);

  const completeFromLegacyResponse = useCallback(async (legacyData: unknown) => {
    const data = legacyData as {
      agent?: {
        id?: string;
        erc8004TokenId?: string | null;
        registrationTxHash?: string | null;
      };
      apiKey?: string;
    };

    for (const step of STEP_DEFS) {
      updateStep({ stepNumber: step.stepNumber, status: 'active', message: 'Processing…' });
      await wait(180);
      updateStep({ stepNumber: step.stepNumber, status: 'done', message: 'Completed' });
    }

    const txHash = data.agent?.registrationTxHash ?? undefined;

    if (txHash) {
      updateStep({ stepNumber: 2, status: 'done', txHash });
      updateStep({ stepNumber: 3, status: 'done', txHash });
    }

    completeRegistration({
      registrationId: undefined,
      agentUuid: data.agent?.id ?? 'unknown-agent',
      erc8004TokenId: data.agent?.erc8004TokenId ?? null,
      registrationTxHash: data.agent?.registrationTxHash ?? null,
      vaultClaimTxHash: null,
      vaultClaimStatus: data.agent?.erc8004TokenId ? 'pending_retry' : 'skipped',
      vaultClaimError: null,
      apiKey: data.apiKey ?? '',
      txHashes: txHash ? [txHash] : [],
    });
  }, [completeRegistration, updateStep]);

  const subscribeToProgress = useCallback((id: string) => {
    const source = new EventSource(buildApiUrl(`/v1/agents/register/${id}/progress`), { withCredentials: true });
    eventSourceRef.current = source;

    source.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data) as RegistrationEvent;

        if (parsed.txHash && !txHashesRef.current.includes(parsed.txHash)) {
          txHashesRef.current = [...txHashesRef.current, parsed.txHash];
        }

        if (parsed.registrationId) {
          setRegistrationId(parsed.registrationId);
        }

        updateStep(parsed);

        if (parsed.status === 'failed') {
          failRegistration(parsed.stepLabel, parsed.message ?? 'Registration failed');
          return;
        }

        if (parsed.done) {
          const agentUuid = parsed.result?.agent_id || parsed.result?.agent?.id || 'unknown-agent';
          completeRegistration({
            registrationId: id,
            agentUuid,
            erc8004TokenId: parsed.result?.erc8004_token_id ?? parsed.result?.agent?.erc8004TokenId ?? null,
            registrationTxHash: parsed.result?.agent?.registrationTxHash ?? null,
            vaultClaimTxHash: parsed.result?.vault_claim_tx_hash ?? null,
            vaultClaimStatus: parsed.result?.vault_claim_status ?? 'skipped',
            vaultClaimError: parsed.result?.vault_claim_error ?? null,
            apiKey: parsed.result?.apiKey ?? '',
            txHashes: txHashesRef.current,
          });
        }
      } catch {
        failRegistration(undefined, 'Malformed progress event payload from backend');
      }
    };

    source.onerror = () => {
      failRegistration(undefined, 'Progress stream disconnected before completion');
    };
  }, [completeRegistration, failRegistration, updateStep]);

  const register = useCallback(async (payload: RegisterPayload) => {
    closeEventSource();
    txHashesRef.current = [];
    setLastPayload(payload);
    setPhase('REGISTERING');
    setErrorState(null);
    setResult(null);
    setRegistrationId(undefined);
    setSteps(initialSteps());

    if (!hasApiUrl()) {
      await runMockProgress();
      return;
    }

    const body = {
      name: payload.name,
      description: payload.description,
      walletAddress: payload.walletAddress,
      strategyType: mapStrategyType(payload.strategyType),
      metadataUri: payload.description?.trim()
        ? `data:text/plain,${encodeURIComponent(payload.description)}`
        : undefined,
      chainId: payload.chainId,
    };

    try {
      const registerResponse = await fetch(buildApiUrl('/v1/agents/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (registerResponse.status === 409) {
        const duplicate = (await registerResponse.json()) as {
          message?: string;
          existingAgent?: RegisterErrorState['alreadyRegistered'];
        };
        failRegistration('Agent already registered', duplicate.message ?? 'Agent already exists for this wallet.', duplicate.existingAgent);
        return;
      }

      if (registerResponse.ok) {
        const data = (await registerResponse.json()) as { registrationId?: string; agent?: unknown; apiKey?: string };
        if (data.registrationId) {
          setRegistrationId(data.registrationId);
          subscribeToProgress(data.registrationId);
          return;
        }

        await completeFromLegacyResponse(data);
        return;
      }

      if (registerResponse.status !== 404) {
        const text = await registerResponse.text();
        failRegistration(undefined, text || 'Registration request failed');
        return;
      }

      const legacyResponse = await fetch(buildApiUrl('/v1/agents'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: payload.name,
          description: payload.description,
          walletAddress: payload.walletAddress,
          strategyType: mapStrategyType(payload.strategyType),
          chainId: payload.chainId,
          metadataUri: payload.description?.trim()
            ? `data:text/plain,${encodeURIComponent(payload.description)}`
            : undefined,
        }),
      });

      if (!legacyResponse.ok) {
        const text = await legacyResponse.text();
        failRegistration(undefined, text || 'Legacy registration endpoint failed');
        return;
      }

      const legacyData = await legacyResponse.json();
      await completeFromLegacyResponse(legacyData);
    } catch (error) {
      failRegistration(undefined, error instanceof Error ? error.message : 'Unknown registration error');
    }
  }, [closeEventSource, completeFromLegacyResponse, failRegistration, runMockProgress, subscribeToProgress]);

  const retry = useCallback(async () => {
    if (!lastPayload) {
      return;
    }

    await register(lastPayload);
  }, [lastPayload, register]);

  const retryVaultClaim = useCallback(async () => {
    if (!result?.agentUuid) {
      return;
    }

    const response = await fetch(buildApiUrl(`/v1/agents/${result.agentUuid}/retry-vault-claim`), {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Vault claim retry failed');
    }

    const data = (await response.json()) as {
      vault_claim_tx_hash?: string | null;
      status?: 'claimed' | 'already_claimed';
    };

    const nextTxHashes = data.vault_claim_tx_hash
      ? Array.from(new Set([...txHashesRef.current, data.vault_claim_tx_hash]))
      : txHashesRef.current;

    setResult((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        vaultClaimTxHash: data.vault_claim_tx_hash ?? prev.vaultClaimTxHash,
        vaultClaimStatus: 'claimed',
        vaultClaimError: null,
        txHashes: nextTxHashes,
      };
    });

    txHashesRef.current = nextTxHashes;
  }, [result?.agentUuid]);

  return {
    phase,
    steps,
    registrationId,
    result,
    errorState,
    isRegistering,
    register,
    retry,
    retryVaultClaim,
  };
}
