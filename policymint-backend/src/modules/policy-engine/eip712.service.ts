import type { Hex } from 'viem';
import { signTypedData } from 'viem/accounts';
import { env } from '../../config/env.js';
import type { RiskRouterTradeIntent } from './trade-intent.mapper.js';

const ALLOWED_CHAIN_ID = 11155111;
const RISK_ROUTER_DOMAIN_NAME = 'RiskRouter';
const RISK_ROUTER_DOMAIN_VERSION = '1';

const tradeIntentTypes = {
  TradeIntent: [
    { name: 'agentId', type: 'uint256' },
    { name: 'agentWallet', type: 'address' },
    { name: 'pair', type: 'string' },
    { name: 'action', type: 'string' },
    { name: 'amountUsdScaled', type: 'uint256' },
    { name: 'maxSlippageBps', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ]
} as const;

export async function signEvaluatedIntent(input: {
  intent: RiskRouterTradeIntent;
}): Promise<string> {
  const signature = await signTypedData({
    privateKey: env.AGENT_WALLET_PRIVATE_KEY as Hex,
    domain: {
      name: RISK_ROUTER_DOMAIN_NAME,
      version: RISK_ROUTER_DOMAIN_VERSION,
      chainId: ALLOWED_CHAIN_ID,
      verifyingContract: env.RISK_ROUTER_ADDRESS as Hex,
    },
    primaryType: 'TradeIntent',
    types: tradeIntentTypes,
    message: input.intent,
  });

  return signature;
}
