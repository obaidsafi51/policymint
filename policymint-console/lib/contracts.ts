export const REPUTATION_REGISTRY_ABI = [
  {
    name: 'getAverageScore',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const RISK_ROUTER_ABI = [
  {
    name: 'simulateIntent',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'pair', type: 'string' },
      { name: 'action', type: 'string' },
      { name: 'amountUsdScaled', type: 'uint256' },
    ],
    outputs: [
      {
        components: [
          { name: 'valid', type: 'bool' },
          { name: 'reason', type: 'string' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
  },
] as const;

export const REPUTATION_REGISTRY_ADDRESS =
  (process.env.NEXT_PUBLIC_REPUTATION_REGISTRY as `0x${string}` | undefined) ??
  '0x423a9904e39537a9997fbaF0f220d79D7d545763';

export const RISK_ROUTER_ADDRESS =
  (process.env.NEXT_PUBLIC_RISK_ROUTER as `0x${string}` | undefined) ??
  '0xd6A6952545FF6E6E6681c2d15C59f9EB8F40FdBC';
