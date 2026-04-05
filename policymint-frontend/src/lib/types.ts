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
