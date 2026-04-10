export type ConsoleApiMeta = {
  agent_id: string;
  generated_at: string;
};

export type ConsoleApiErrorCode =
  | 'AGENT_NOT_FOUND'
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'INVALID_WINDOW'
  | 'INVALID_CURSOR'
  | 'COMPETITION_WINDOW_NOT_CONFIGURED'
  | 'INTERNAL_ERROR';

export type ConsoleApiErrorEnvelope = {
  success: false;
  error: {
    code: ConsoleApiErrorCode;
    message: string;
  };
};

export type ConsoleApiSuccessEnvelope<T> = {
  success: true;
  data: T;
  meta: ConsoleApiMeta;
};

export type AgentEventItem = {
  evaluation_id: string;
  result: 'allow' | 'block';
  reason: string | null;
  policy_id: string | null;
  action_type: string;
  venue: string;
  amount_usd: number;
  validation_tx_hash: string | null;
  etherscan_url: string | null;
  timestamp: string;
};

export type AgentEventsResponse = ConsoleApiSuccessEnvelope<{
  events: AgentEventItem[];
  next_cursor: string | null;
}>;

export type AgentPnlSeriesPoint = {
  timestamp: string;
  cumulative_pnl_usd: number;
  trade_count: number;
};

export type AgentPnlResponse = ConsoleApiSuccessEnvelope<{
  window: 'competition' | '24h' | '7d';
  start_at: string;
  end_at: string;
  baseline_allocation_usd: number;
  current_pnl_usd: number;
  pnl_pct: number;
  trade_count: number;
  series: AgentPnlSeriesPoint[];
}>;

export type AgentDrawdownResponse = ConsoleApiSuccessEnvelope<{
  protected_series: Array<{ timestamp: string; cumulative_pnl_usd: number }>;
  baseline_series: Array<{ timestamp: string; cumulative_pnl_usd: number }>;
  prevention_value_usd: number;
  prevention_value_pct: number;
  blocked_trade_count: number;
  simulation_disclaimer: string;
}>;

export type AgentStatsResponse = ConsoleApiSuccessEnvelope<{
  total_evaluations: number;
  allow_count: number;
  block_count: number;
  block_rate_pct: number;
  execution_success_rate: number;
  emission_success_rate: number;
  reputation_score: number;
  score_trend: 'up' | 'down' | 'stable';
  sharpe_ratio: number | null;
  sharpe_data_quality: 'ok' | 'insufficient_data';
  current_drawdown_pct: number;
  policy_breach: boolean;
  breach_reason: string | null;
  competition_window_start: string | null;
}>;
