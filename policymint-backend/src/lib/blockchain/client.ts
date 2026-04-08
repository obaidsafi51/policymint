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

export const operatorAccount = privateKeyToAccount(env.OPERATOR_WALLET_PRIVATE_KEY as `0x${string}`);
export const agentAccount = privateKeyToAccount(env.AGENT_WALLET_PRIVATE_KEY as `0x${string}`);

if (operatorAccount.address.toLowerCase() === agentAccount.address.toLowerCase()) {
  throw new Error('OPERATOR_WALLET_PRIVATE_KEY and AGENT_WALLET_PRIVATE_KEY must resolve to different addresses');
}

export const operatorWalletClient = createWalletClient({
  account: operatorAccount,
  chain: sepolia,
  transport,
});

export const agentWalletClient = createWalletClient({
  account: agentAccount,
  chain: sepolia,
  transport,
});

export const signerAccount = operatorAccount;
export const walletClient = operatorWalletClient;
export const operatorWallet = operatorWalletClient;
export const agentWallet = agentWalletClient;
