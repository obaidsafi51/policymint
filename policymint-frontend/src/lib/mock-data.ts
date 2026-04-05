import { Decision, Agent, Policy, MetricData } from "./types";

export const mockMetrics: Record<string, MetricData> = {
  cumulativePnL: {
    label: "Cumulative PnL",
    value: "+$12,480.20",
    subtitle: "+12.4% from start",
    valueColor: "success",
  },
  reputationScore: {
    label: "Reputation Score",
    value: "+64.5",
    subtitle: "target: +50",
    valueColor: "success",
  },
  maxDrawdown: {
    label: "Max Drawdown",
    value: "-2.4%",
    subtitle: "budget: 5%",
    valueColor: "warning",
  },
  decisionsToday: {
    label: "Decisions Today",
    value: "1,284",
    subtitle: "12 blocked (0.9%)",
    valueColor: "brand",
  },
};

export const mockDecisions: Decision[] = [
  {
    id: "eval_sentinel_01",
    timestamp: new Date().toISOString(),
    agentId: "Sentinel-V2",
    result: "ALLOW",
    actionType: "SWAP",
    summary: "Swap 10,000 USDC → 2.5 ETH",
    venue: "Uniswap Protocol",
    contractAddress: "0x111111111117dC0aa78b770fA6A738034120C302",
    txHash: "0xabc12334948",
  },
  {
    id: "eval_guardian_02",
    timestamp: new Date(Date.now() - 1000 * 45).toISOString(),
    agentId: "Guardian-Alpha",
    result: "BLOCK",
    actionType: "SWAP",
    summary: "Swap 2 ETH → 6,000 USDC",
    reason: "Venue not in allowlist",
    contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    policyIdTriggered: "pol_venue",
  },
  {
    id: "eval_sentinel_03",
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    agentId: "Sentinel-V2",
    result: "BLOCK",
    actionType: "TRANSFER",
    summary: "Transfer 12,000 USDC",
    reason: "Exceeds spend cap ($5k)",
    policyIdTriggered: "pol_spend_cap",
  },
  {
    id: "eval_guardian_04",
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    agentId: "Guardian-Alpha",
    result: "ALLOW",
    actionType: "SWAP",
    summary: "Swap 500 USDC → 0.15 ETH",
    venue: "Curve Finance",
    contractAddress: "0x111111111117dC0aa78b770fA6A738034120C302",
  },
];

export const mockAgents: Agent[] = [
  { id: "agent_alpha", name: "Alpha Arbitrage", status: "active", walletAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", lastActive: new Date().toISOString() },
  { id: "agent_beta", name: "Beta Balancer", status: "inactive", walletAddress: "0x8f3a35Cc6634C0532925a3b844Bc4c41d", lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
];

export const mockPolicies: Policy[] = [
  { id: "pol_spend_cap", agentId: "agent_beta", type: "SPEND_CAP", status: "active", parameters: { limit: "10000 USD" } },
  { id: "pol_venue", agentId: "agent_alpha", type: "VENUE_ALLOWLIST", status: "active", parameters: { venues: ["Uniswap V3", "Curve"] } },
];
