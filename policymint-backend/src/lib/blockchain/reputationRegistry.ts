import { env } from '../../config/env.js';
import { logger } from '../logger.js';
import { REPUTATION_REGISTRY_ABI } from './abis.js';
import { publicClient, signerAccount, walletClient } from './client.js';
import { txQueue } from './txQueue.js';

const REPUTATION_REGISTRY = env.REPUTATION_REGISTRY_ADDRESS as `0x${string}` | undefined;

export interface EmitSignalParams {
  agentId: bigint;
  positive: boolean;
  reason: string;
}

export function canEmitReputationSignalOnChain() {
  return Boolean(REPUTATION_REGISTRY);
}

export async function emitReputationSignal(params: EmitSignalParams): Promise<`0x${string}`> {
  if (!REPUTATION_REGISTRY) {
    throw new Error('REPUTATION_REGISTRY_ADDRESS missing; reputation emission is disabled');
  }

  logger.info(
    {
      contract: 'ReputationRegistry',
      agentId: params.agentId.toString(),
      positive: params.positive,
    },
    'Submitting emitSignal',
  );

  const txHash = await txQueue.add(() =>
    walletClient.writeContract({
      address: REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'emitSignal',
      args: [params.agentId, params.positive, params.reason.slice(0, 256)],
      account: signerAccount,
      gas: BigInt(150_000),
    }),
  );

  logger.info({ contract: 'ReputationRegistry', txHash }, 'emitSignal submitted');

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
    timeout: 60_000,
  });

  if (receipt.status !== 'success') {
    throw new Error(`ReputationRegistry.emitSignal() reverted. tx: ${txHash}`);
  }

  logger.info({ contract: 'ReputationRegistry', txHash }, 'emitSignal confirmed');

  return txHash;
}

export async function getReputationScore(agentId: bigint): Promise<number> {
  if (!REPUTATION_REGISTRY) {
    throw new Error('REPUTATION_REGISTRY_ADDRESS missing; reputation reads are disabled');
  }

  const score = await publicClient.readContract({
    address: REPUTATION_REGISTRY,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: 'getScore',
    args: [agentId],
  });

  return Number(score);
}
