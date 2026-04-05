import { env } from '../../config/env.js';
import { logger } from '../logger.js';
import { RISK_ROUTER_ABI } from './abis.js';
import { operatorAccount, operatorWalletClient, publicClient } from './client.js';
import { txQueue } from './txQueue.js';

const RISK_ROUTER = env.RISK_ROUTER_ADDRESS as `0x${string}`;

export interface TradeIntent {
  agentId: bigint;
  agentWallet: `0x${string}`;
  pair: string;
  action: string;
  amountUsdScaled: bigint;
  maxSlippageBps: bigint;
  nonce: bigint;
  deadline: bigint;
}

export interface SubmitTradeIntentParams {
  intent: TradeIntent;
  signature: `0x${string}`;
}

export interface SubmitTradeIntentResult {
  txHash: `0x${string}`;
}

export async function submitTradeIntent(
  params: SubmitTradeIntentParams,
): Promise<SubmitTradeIntentResult> {

  logger.info(
    {
      contract: 'RiskRouter',
      agentId: params.intent.agentId.toString(),
      pair: params.intent.pair,
      action: params.intent.action,
    },
    'Submitting submitTradeIntent',
  );

  const txHash = await txQueue.add(() =>
    operatorWalletClient.writeContract({
      address: RISK_ROUTER,
      abi: RISK_ROUTER_ABI,
      functionName: 'submitTradeIntent',
      args: [params.intent, params.signature],
      account: operatorAccount,
      gas: BigInt(350_000),
    }),
  );

  logger.info({ contract: 'RiskRouter', txHash }, 'submitTradeIntent submitted');

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
    timeout: 90_000,
  });

  if (receipt.status !== 'success') {
    throw new Error(`RiskRouter.submitTradeIntent() reverted. tx: ${txHash}`);
  }

  logger.info({ contract: 'RiskRouter', txHash }, 'submitTradeIntent confirmed');

  return { txHash };
}
