export interface TradeIntent {
  action_type: 'swap' | 'transfer' | 'bridge' | 'trade' | 'custom'
  venue: string
  amount: string
  token_in: string
  token_out?: string
  params?: Record<string, unknown>
}

export interface PolicyDecision {
  evaluation_id: string
  result: 'allow' | 'block'
  reason?: string | null
  policy_id: string | null
  eip712_signed_intent: string
  latency_ms?: number
  validation_tx_hash?: string | null
  reputation_signal?: 'positive' | 'negative' | 'neutral'
  timestamp: string
  agent_name: string
  action_summary: string
}

export interface Policy {
  policy_id: string
  type: 'venue_allowlist' | 'spend_cap_per_tx' | 'daily_loss_budget'
  params: Record<string, unknown>
  active: boolean
}

export interface AgentConfig {
  agent_id: string
  name: string
  erc8004_token_id: string
  status: 'active' | 'inactive'
  policies: Policy[]
}

export interface SimulateResult {
  onChain:
    | { status: 'ok'; valid: boolean; reason: string }
    | { status: 'unavailable'; reason: string }
  policyEngine: PolicyDecision | null
  latency_ms: number
  checklist: PolicyChecklistItem[]
}

export interface PolicyChecklistItem {
  policyName: string
  state: 'pass' | 'fail' | 'skipped'
  detail: string
}

export * from './console-api'
