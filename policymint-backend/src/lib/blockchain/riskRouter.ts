import { parseUnits } from 'viem';
import { env } from '../../config/env.js';
import { logger } from '../logger.js';
import { RISK_ROUTER_ABI } from './abis.js';
import { publicClient, signerAccount, walletClient } from './client.js';
import { txQueue } from './txQueue.js';

const RISK_ROUTER = env.RISK_ROUTER_ADDRESS as `0x${string}`;
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as `0x${string}`;

export interface SwapParams {
  agentId: bigint;
  tokenIn: `0x${string}` | 'ETH';
  tokenOut: `0x${string}` | 'ETH';
  amountIn: string;
  amountInDecimals?: number;
  minAmountOut: bigint;
  eip712Authorization: `0x${string}`;
}

export interface SwapResult {
  amountOut: bigint;
  txHash: `0x${string}`;
}

export async function routeSwap(params: SwapParams): Promise<SwapResult> {
  const tokenInAddress = params.tokenIn === 'ETH' ? ETH_ADDRESS : params.tokenIn;
  const tokenOutAddress = params.tokenOut === 'ETH' ? ETH_ADDRESS : params.tokenOut;
  const amountInWei = parseUnits(params.amountIn, params.amountInDecimals ?? 18);

  logger.info(
    {
      contract: 'RiskRouter',
      agentId: params.agentId.toString(),
      amountIn: params.amountIn,
    },
    'Submitting executeSwap',
  );

  const txHash = await txQueue.add(() =>
    walletClient.writeContract({
      address: RISK_ROUTER,
      abi: RISK_ROUTER_ABI,
      functionName: 'executeSwap',
      args: [
        params.agentId,
        tokenInAddress,
        tokenOutAddress,
        amountInWei,
        params.minAmountOut,
        params.eip712Authorization,
      ],
      account: signerAccount,
      value: params.tokenIn === 'ETH' ? amountInWei : BigInt(0),
      gas: BigInt(350_000),
    }),
  );

  logger.info({ contract: 'RiskRouter', txHash }, 'executeSwap submitted');

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
    timeout: 90_000,
  });

  if (receipt.status !== 'success') {
    throw new Error(`RiskRouter.executeSwap() reverted. tx: ${txHash}`);
  }

  logger.info({ contract: 'RiskRouter', txHash }, 'executeSwap confirmed');

  const amountOut = BigInt(receipt.logs[receipt.logs.length - 1]?.data ?? '0x0');
  return { amountOut, txHash };
}
