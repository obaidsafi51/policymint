import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { env } from '../../config/env.js';

const transport = http(env.ALCHEMY_RPC_URL, {
  retryCount: 3,
  retryDelay: 1_000,
  timeout: 30_000,
});

export const publicClient = createPublicClient({
  chain: sepolia,
  transport,
});

export const signerAccount = privateKeyToAccount(env.POLICY_SIGNER_PRIVATE_KEY as `0x${string}`);

export const walletClient = createWalletClient({
  account: signerAccount,
  chain: sepolia,
  transport,
});
