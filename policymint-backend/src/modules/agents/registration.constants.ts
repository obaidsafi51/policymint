export const CANONICAL_AGENT_NAME = 'PolicyMint';

export const CANONICAL_AGENT_DESCRIPTION =
  'Policy-protected autonomous trading agent with provable risk controls. Enforces spend caps, venue allowlists, and daily loss budgets via EIP-712 signed validation artifacts on every trade intent.';

export const CANONICAL_AGENT_CAPABILITIES = [
  'trading',
  'eip712-signing',
  'policy-enforcement',
] as const;

export const AGENT_METADATA_TYPE = 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1';

export function buildCanonicalAgentURI(frontendEndpoint: string): string {
  const payload = {
    type: AGENT_METADATA_TYPE,
    name: CANONICAL_AGENT_NAME,
    description: CANONICAL_AGENT_DESCRIPTION,
    services: [{ name: 'web', endpoint: frontendEndpoint }],
    active: true,
  };

  return `data:application/json;base64,${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')}`;
}
