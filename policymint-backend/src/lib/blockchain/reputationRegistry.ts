import { env } from '../../config/env.js';
import { logger } from '../logger.js';
import { REPUTATION_REGISTRY_ABI } from './abis.js';
import { operatorAccount, operatorWalletClient, publicClient } from './client.js';
import { txQueue } from './txQueue.js';
import type { Address } from 'viem';

const REPUTATION_REGISTRY = env.REPUTATION_REGISTRY_ADDRESS as `0x${string}` | undefined;

export const FeedbackType = {
  TRADE_EXECUTION: 0,
  RISK_MANAGEMENT: 1,
  STRATEGY_QUALITY: 2,
  GENERAL: 3,
} as const;

export type FeedbackTypeValue = (typeof FeedbackType)[keyof typeof FeedbackType];

export class AlreadyRatedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlreadyRatedError';
  }
}

export interface EmitSignalParams {
  agentId: bigint;
  score: number;
  outcomeRef: `0x${string}`;
  comment: string;
  feedbackType: FeedbackTypeValue;
}

export function canEmitReputationSignalOnChain() {
  return Boolean(REPUTATION_REGISTRY);
}

export async function hasRated(agentId: bigint, raterAddress: Address): Promise<boolean> {
  if (!REPUTATION_REGISTRY) {
    throw new Error('REPUTATION_REGISTRY_ADDRESS missing; reputation reads are disabled');
  }

  return publicClient.readContract({
    address: REPUTATION_REGISTRY,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: 'hasRated',
    args: [agentId, raterAddress],
  });
}

export async function emitReputationSignal(params: EmitSignalParams): Promise<`0x${string}`> {
  if (!REPUTATION_REGISTRY) {
    throw new Error('REPUTATION_REGISTRY_ADDRESS missing; reputation emission is disabled');
  }

  if (params.score < 1 || params.score > 100) {
    throw new Error(`ReputationRegistry.submitFeedback() score must be between 1 and 100. Received ${params.score}`);
  }

  if (!Object.values(FeedbackType).includes(params.feedbackType)) {
    throw new Error(
      `ReputationRegistry.submitFeedback() feedbackType must be one of 0,1,2,3. Received ${params.feedbackType}`,
    );
  }

  logger.info(
    {
      contract: 'ReputationRegistry',
      agentId: params.agentId.toString(),
      score: params.score,
      feedbackType: params.feedbackType,
    },
    'Submitting submitFeedback',
  );

  const alreadyRated = await hasRated(params.agentId, operatorAccount.address);
  if (alreadyRated) {
    throw new AlreadyRatedError(
      `ReputationRegistry.submitFeedback() skipped: operator ${operatorAccount.address} already rated agent ${params.agentId.toString()}`,
    );
  }

  const txHash = await txQueue.add(() =>
    operatorWalletClient.writeContract({
      address: REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'submitFeedback',
      args: [params.agentId, params.score, params.outcomeRef, params.comment.slice(0, 256), params.feedbackType],
      account: operatorAccount,
      gas: BigInt(150_000),
    }),
  );

  logger.info({ contract: 'ReputationRegistry', txHash, outcome: 'submitted' }, 'submitFeedback submitted');

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
    timeout: 60_000,
  });

  if (receipt.status !== 'success') {
    throw new Error(`ReputationRegistry.submitFeedback() reverted. tx: ${txHash}`);
  }

  logger.info(
    {
      contract: 'ReputationRegistry',
      txHash,
      blockNumber: receipt.blockNumber?.toString() ?? 'unknown',
      gasUsed: receipt.gasUsed?.toString() ?? 'unknown',
      outcome: 'confirmed',
    },
    'submitFeedback confirmed',
  );

  return txHash;
}

export async function getReputationScore(agentId: bigint): Promise<number> {
  if (!REPUTATION_REGISTRY) {
    throw new Error('REPUTATION_REGISTRY_ADDRESS missing; reputation reads are disabled');
  }

  const score = await publicClient.readContract({
    address: REPUTATION_REGISTRY,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: 'getAverageScore',
    args: [agentId],
  });

  return Number(score);
}