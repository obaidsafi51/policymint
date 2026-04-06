import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(rpcUrl),
});
