export const AGENT_REGISTRY_ABI = [
  {
    name: 'registerAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'metadataURI', type: 'string' },
      { name: 'targetChainId', type: 'uint256' },
      { name: 'strategyType', type: 'string' },
    ],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    name: 'getAgent',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'metadataURI', type: 'string' },
      { name: 'active', type: 'bool' },
    ],
  },
] as const;

export const HACKATHON_VAULT_ABI = [
  {
    name: 'claimAllocation',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getAllocation',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: 'amount', type: 'uint256' }],
  },
] as const;

export const VALIDATION_REGISTRY_ABI = [
  {
    name: 'postValidation',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'evaluationId', type: 'bytes32' },
      { name: 'result', type: 'bool' },
      { name: 'checkpointHash', type: 'bytes32' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

export const REPUTATION_REGISTRY_ABI = [
  {
    name: 'emitSignal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'positive', type: 'bool' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'getScore',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: 'score', type: 'int256' }],
  },
] as const;

export const RISK_ROUTER_ABI = [
  {
    name: 'executeSwap',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'minAmountOut', type: 'uint256' },
      { name: 'authorization', type: 'bytes' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const;
