import { encodePacked, keccak256 } from 'viem';
import { env } from '../../config/env.js';
import { logger } from '../logger.js';
import { VALIDATION_REGISTRY_ABI } from './abis.js';
import { operatorAccount, operatorWalletClient, publicClient } from './client.js';
import { txQueue } from './txQueue.js';

const VALIDATION_REGISTRY = env.VALIDATION_REGISTRY_ADDRESS as `0x${string}` | undefined;
const MAX_ATTESTATION_SCORE = 100;
const MAX_NOTES_LENGTH = 128;

export interface PostValidationParams {
  agentId: bigint;
  evaluationId: string;
  score: number;
  notes: string;
  checkpointData: {
    action_type: string;
    venue: string;
    amount: string;
    timestamp: number;
  };
}

export interface PostValidationResult {
  txHash: `0x${string}`;
  blockNumber: bigint;
  checkpointHash: `0x${string}`;
}

export function canPostValidationOnChain() {
  return Boolean(VALIDATION_REGISTRY);
}

function buildCheckpointHash(data: PostValidationParams['checkpointData']): `0x${string}` {
  return keccak256(
    encodePacked(
      ['string', 'string', 'string', 'uint256'],
      [data.action_type, data.venue, data.amount, BigInt(data.timestamp)],
    ),
  );
}

export async function postValidationRecord(
  params: PostValidationParams,
): Promise<PostValidationResult> {
  if (!VALIDATION_REGISTRY) {
    throw new Error('VALIDATION_REGISTRY_ADDRESS missing; validation emission is disabled');
  }

  if (!Number.isInteger(params.score) || params.score < 0 || params.score > MAX_ATTESTATION_SCORE) {
    throw new Error(`Invalid attestation score: ${params.score}`);
  }

  const sanitizedNotes = params.notes.slice(0, MAX_NOTES_LENGTH);

  const checkpointHash = buildCheckpointHash(params.checkpointData);

  logger.info(
    {
      contract: 'ValidationRegistry',
      agentId: params.agentId.toString(),
      evaluationId: params.evaluationId,
      score: params.score,
    },
    'Submitting postEIP712Attestation',
  );

  const txHash = await txQueue.add(() =>
    operatorWalletClient.writeContract({
      address: VALIDATION_REGISTRY,
      abi: VALIDATION_REGISTRY_ABI,
      functionName: 'postEIP712Attestation',
      args: [params.agentId, checkpointHash, params.score, sanitizedNotes],
      account: operatorAccount,
      gas: BigInt(200_000),
    }),
  );

  logger.info(
    { contract: 'ValidationRegistry', txHash, evaluationId: params.evaluationId },
    'postEIP712Attestation submitted',
  );

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
    timeout: 60_000,
  });

  if (receipt.status !== 'success') {
    throw new Error(`ValidationRegistry.postEIP712Attestation() reverted. tx: ${txHash}`);
  }

  logger.info(
    {
      contract: 'ValidationRegistry',
      txHash,
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
    },
    'postEIP712Attestation confirmed',
  );

  return {
    txHash,
    blockNumber: receipt.blockNumber,
    checkpointHash,
  };
}
