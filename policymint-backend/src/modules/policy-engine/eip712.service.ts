import type { Hex } from 'viem';
import { keccak256, toBytes } from 'viem';
import { signTypedData } from 'viem/accounts';
import { env } from '../../config/env.js';
import type { EvaluateIntentInput } from './evaluate.schema.js';

const ALLOWED_CHAIN_IDS = [11155111];

const tradeIntentTypes = {
  TradeIntent: [
    { name: 'agent_id', type: 'string' },
    { name: 'action_type', type: 'string' },
    { name: 'venue', type: 'string' },
    { name: 'amount', type: 'string' },
    { name: 'token_in', type: 'string' },
    { name: 'token_out', type: 'string' },
    { name: 'params_hash', type: 'bytes32' },
    { name: 'result', type: 'string' },
    { name: 'timestamp', type: 'uint256' }
  ]
} as const;

export async function signEvaluatedIntent(input: {
  intent: EvaluateIntentInput;
  result: 'allow' | 'block';
}): Promise<string> {
  // SECURITY(post-hackathon): chainId and verifyingContract are currently caller-supplied.
  // Before production, chainId must stay allowlisted and verifyingContract must be sourced
  // from trusted environment configuration tied to the deployed registry.
  if (!ALLOWED_CHAIN_IDS.includes(input.intent.eip712_domain.chainId)) {
    throw new Error(`chainId ${input.intent.eip712_domain.chainId} is not permitted.`);
  }

  const timestamp = BigInt(Math.floor(Date.now() / 1000));
  const paramsHash = keccak256(toBytes(JSON.stringify(input.intent.params ?? {})));

  const signature = await signTypedData({
    privateKey: env.POLICY_SIGNER_PRIVATE_KEY as Hex,
    domain: {
      name: 'PolicyMint',
      version: '1',
      chainId: input.intent.eip712_domain.chainId,
      verifyingContract: input.intent.eip712_domain.verifyingContract as Hex
    },
    primaryType: 'TradeIntent',
    types: tradeIntentTypes,
    message: {
      agent_id: input.intent.agent_id,
      action_type: input.intent.action_type,
      venue: input.intent.venue,
      amount: input.intent.amount,
      token_in: input.intent.token_in,
      token_out: input.intent.token_out ?? '',
      params_hash: paramsHash,
      result: input.result,
      timestamp
    }
  });

  return signature;
}
