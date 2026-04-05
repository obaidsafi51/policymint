export const AGENT_REGISTRY_ABI = [
  {
    name: 'register',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentWallet', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'capabilities', type: 'string[]' },
      { name: 'agentURI', type: 'string' },
    ],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    name: 'isRegistered',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getAgent',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [
      { name: 'operatorWallet', type: 'address' },
      { name: 'agentWallet', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'capabilities', type: 'string[]' },
      { name: 'registeredAt', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    name: 'getSigningNonce',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
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
    name: 'postEIP712Attestation',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'checkpointHash', type: 'bytes32' },
      { name: 'score', type: 'uint8' },
      { name: 'notes', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'getAverageValidationScore',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const REPUTATION_REGISTRY_ABI = [
  {
    name: 'submitFeedback',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'score', type: 'uint8' },
      { name: 'outcomeRef', type: 'bytes32' },
      { name: 'comment', type: 'string' },
      { name: 'feedbackType', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'getAverageScore',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: 'score', type: 'uint256' }],
  },
] as const;

export const RISK_ROUTER_ABI = [
  {
    name: 'submitTradeIntent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'intent',
        type: 'tuple',
        components: [
          { name: 'agentId', type: 'uint256' },
          { name: 'agentWallet', type: 'address' },
          { name: 'pair', type: 'string' },
          { name: 'action', type: 'string' },
          { name: 'amountUsdScaled', type: 'uint256' },
          { name: 'maxSlippageBps', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'simulateIntent',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      {
        name: 'intent',
        type: 'tuple',
        components: [
          { name: 'agentId', type: 'uint256' },
          { name: 'agentWallet', type: 'address' },
          { name: 'pair', type: 'string' },
          { name: 'action', type: 'string' },
          { name: 'amountUsdScaled', type: 'uint256' },
          { name: 'maxSlippageBps', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
    ],
    outputs: [
      { name: 'valid', type: 'bool' },
      { name: 'reason', type: 'string' },
    ],
  },
  {
    name: 'getIntentNonce',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
