export interface Decision {
  id: string;
  timestamp: string;
  agentId: string;
  result: "ALLOW" | "BLOCK";
  actionType: string;
  contractAddress?: string;
  value?: string;
  txHash?: string;
  policyIdTriggered?: string;
  reason?: string;
  /** One-line trade summary for feed cards (e.g. Swap 10,000 USDC → 2.5 ETH) */
  summary?: string;
  /** Footer context: venue name or allow path */
  venue?: string;
}

export interface MetricData {
  label: string;
  value: string;
  subtitle: string;
  valueColor?: "success" | "danger" | "brand" | "primary" | "warning";
}

export interface Agent {
  id: string;
  name: string;
  status: "active" | "inactive";
  walletAddress: string;
  lastActive: string;
}

export interface Policy {
  id: string;
  agentId: string;
  type: "SPEND_CAP" | "VENUE_ALLOWLIST" | "DAILY_LOSS_BUDGET";
  status: "active" | "inactive";
  parameters: Record<string, unknown>;
}
