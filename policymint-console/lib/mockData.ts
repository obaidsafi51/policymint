import { AgentConfig, PolicyDecision, PolicyChecklistItem } from '@/types';

const MOCK_BASE_TIMESTAMP = '2026-04-06T12:28:19.000Z';
const MOCK_PREVIOUS_TIMESTAMP = '2026-04-06T12:27:19.000Z';

export const mockAgent: AgentConfig = {
  agent_id: '00000000-0000-0000-0000-000000000001',
  name: 'Momentum Agent',
  erc8004_token_id: '1',
  status: 'active',
  policies: [
    {
      policy_id: 'policy_venue',
      type: 'venue_allowlist',
      params: { venues: ['kraken-spot', 'kraken-futures'] },
      active: true,
    },
    {
      policy_id: 'policy_cap',
      type: 'spend_cap_per_tx',
      params: { max_usd: 10000 },
      active: true,
    },
    {
      policy_id: 'policy_loss',
      type: 'daily_loss_budget',
      params: { max_daily_loss_usd: 25000 },
      active: true,
    },
  ],
};

export const mockDecisions: PolicyDecision[] = [
  {
    evaluation_id: 'eval_demo_1',
    result: 'allow',
    reason: null,
    policy_id: null,
    eip712_signed_intent: '0xabc123',
    validation_tx_hash: '0x8f3aa1a8b87d7ea95f4d5f713c5d8a366bdf8f7049df8fef269f7e6b38d4c41d',
    reputation_signal: 'positive',
    timestamp: MOCK_BASE_TIMESTAMP,
    agent_name: 'Momentum Agent',
    action_summary: 'swap ETH/USDC $4,500 on kraken-spot',
    latency_ms: 184,
  },
  {
    evaluation_id: 'eval_demo_2',
    result: 'block',
    reason: 'spend cap per tx exceeded',
    policy_id: 'policy_cap',
    eip712_signed_intent: '0xdef456',
    validation_tx_hash: null,
    reputation_signal: 'negative',
    timestamp: MOCK_PREVIOUS_TIMESTAMP,
    agent_name: 'Momentum Agent',
    action_summary: 'trade BTC/USDC $12,250 on kraken-spot',
    latency_ms: 212,
  },
];

export const mockPnl = Array.from({ length: 20 }).map((_, index) => ({
  ts: `${index}`,
  pnl: 12000 + index * 240 - (index % 4) * 90,
}));

export const mockDrawdown = Array.from({ length: 20 }).map((_, index) => ({
  ts: `${index}`,
  protected: 98000 + index * 220,
  baseline: 98000 + index * 190 - (index % 5) * 120,
}));

export const mockStats = {
  tradesToday: 14,
  blocksToday: 2,
};

export const defaultChecklist: PolicyChecklistItem[] = [
  {
    policyName: 'venue_allowlist',
    state: 'pass',
    detail: 'kraken-spot is in allowlist',
  },
  {
    policyName: 'spend_cap_per_tx',
    state: 'pass',
    detail: '$4,500 < $10,000 cap',
  },
  {
    policyName: 'daily_loss_budget',
    state: 'pass',
    detail: '$12,400 < $25,000 daily budget',
  },
];
