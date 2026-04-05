import { encodePacked, keccak256 } from 'viem';
import { env } from '../../config/env.js';
import { logger } from '../logger.js';
import { VALIDATION_REGISTRY_ABI } from './abis.js';
import { publicClient, signerAccount, walletClient } from './client.js';
import { txQueue } from './txQueue.js';

const VALIDATION_REGISTRY = env.VALIDATION_REGISTRY_ADDRESS as `0x${string}` | undefined;

export interface PostValidationParams {
  agentId: bigint;
  evaluationId: string;
  result: boolean;
  eip712Signature: `0x${string}`;
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

function uuidToBytes32(uuid: string): `0x${string}` {
  const hex = uuid.replace(/-/g, '');
  return `0x${hex.padStart(64, '0')}` as `0x${string}`;
}

export async function postValidationRecord(
  params: PostValidationParams,
): Promise<PostValidationResult> {
  if (!VALIDATION_REGISTRY) {
    throw new Error('VALIDATION_REGISTRY_ADDRESS missing; validation emission is disabled');
  }

  const evaluationIdBytes32 = uuidToBytes32(params.evaluationId);
  const checkpointHash = buildCheckpointHash(params.checkpointData);

  logger.info(
    {
      contract: 'ValidationRegistry',
      agentId: params.agentId.toString(),
      evaluationId: params.evaluationId,
      result: params.result,
    },
    'Submitting postValidation',
  );

  const txHash = await txQueue.add(() =>
    walletClient.writeContract({
      address: VALIDATION_REGISTRY,
      abi: VALIDATION_REGISTRY_ABI,
      functionName: 'postValidation',
      args: [
        params.agentId,
        evaluationIdBytes32,
        params.result,
        checkpointHash,
        params.eip712Signature,
      ],
      account: signerAccount,
      gas: BigInt(200_000),
    }),
  );

  logger.info(
    { contract: 'ValidationRegistry', txHash, evaluationId: params.evaluationId },
    'postValidation submitted',
  );

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
    timeout: 60_000,
  });

  if (receipt.status !== 'success') {
    throw new Error(`ValidationRegistry.postValidation() reverted. tx: ${txHash}`);
  }

  logger.info(
    { contract: 'ValidationRegistry', txHash, blockNumber: receipt.blockNumber.toString() },
    'postValidation confirmed',
  );

  return {
    txHash,
    blockNumber: receipt.blockNumber,
    checkpointHash,
  };
}
