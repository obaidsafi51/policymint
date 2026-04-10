import { env } from '../../config/env.js';
import { logger } from '../logger.js';
import { HACKATHON_VAULT_ABI } from './abis.js';
import { publicClient, signerAccount, walletClient } from './client.js';
import { txQueue } from './txQueue.js';

const HACKATHON_VAULT = env.HACKATHON_VAULT_ADDRESS as `0x${string}`;

export async function claimHackathonAllocation(agentId: bigint): Promise<`0x${string}`> {
  logger.info({ contract: 'HackathonVault', agentId: agentId.toString() }, 'Submitting claimAllocation');

  const txHash = await txQueue.add(() =>
    walletClient.writeContract({
      address: HACKATHON_VAULT,
      abi: HACKATHON_VAULT_ABI,
      functionName: 'claimAllocation',
      args: [agentId],
      account: signerAccount,
    }),
  );

  logger.info(
    { contract: 'HackathonVault', txHash, agentId: agentId.toString(), outcome: 'submitted' },
    'claimAllocation submitted',
  );

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
    timeout: 60_000,
  });

  if (receipt.status !== 'success') {
    throw new Error(`HackathonVault.claimAllocation() reverted for agentId=${agentId}. tx: ${txHash}`);
  }

  logger.info(
    {
      contract: 'HackathonVault',
      txHash,
      agentId: agentId.toString(),
      blockNumber: receipt.blockNumber?.toString() ?? 'unknown',
      gasUsed: receipt.gasUsed?.toString() ?? 'unknown',
      outcome: 'confirmed',
    },
    'claimAllocation confirmed',
  );

  return txHash;
}

export async function getHackathonAllocation(agentId: bigint): Promise<bigint> {
  return publicClient.readContract({
    address: HACKATHON_VAULT,
    abi: HACKATHON_VAULT_ABI,
    functionName: 'getAllocation',
    args: [agentId],
  });
}