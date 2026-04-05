import { Decision, Agent, Policy, MetricData } from "./types";

export const mockMetrics: Record<string, MetricData> = {
  "cumulativePnL": { label: "Cumulative PnL", value: "+$42,500.00", subtitle: "All active agents", valueColor: "success" },
  "reputationScore": { label: "Reputation Score", value: "98.5", subtitle: "Excellent standing", valueColor: "success" },
  "maxDrawdown": { label: "Max Drawdown", value: "-2.4%", subtitle: "Protected by bounds", valueColor: "danger" },
  "decisionsToday": { label: "Decisions Today", value: "1,248", subtitle: "48 prevented", valueColor: "brand" },
};

export const mockDecisions: Decision[] = [
  { id: "eval_0x1a2b", timestamp: new Date().toISOString(), agentId: "agent_alpha", result: "ALLOW", actionType: "SWAP", contractAddress: "0x111111111117dC0aa78b770fA6A738034120C302", value: "4.5 ETH", txHash: "0xabc12334948" },
  { id: "eval_0x3c4d", timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), agentId: "agent_beta", result: "BLOCK", actionType: "TRANSFER", contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7", value: "50,000 USDT", policyIdTriggered: "pol_spend_cap" },
];

export const mockAgents: Agent[] = [
  { id: "agent_alpha", name: "Alpha Arbitrage", status: "active", walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", lastActive: new Date().toISOString() },
  { id: "agent_beta", name: "Beta Balancer", status: "inactive", walletAddress: "0x8f3a35Cc6634C0532925a3b844Bc4c41d", lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
];

export const mockPolicies: Policy[] = [
  { id: "pol_spend_cap", agentId: "agent_beta", type: "SPEND_CAP", status: "active", parameters: { limit: "10000 USD" } },
  { id: "pol_venue", agentId: "agent_alpha", type: "VENUE_ALLOWLIST", status: "active", parameters: { venues: ["Uniswap V3", "Curve"] } },
];
