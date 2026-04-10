const testEnvDefaults: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: '3001',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/policymint_test',
  DIRECT_URL: 'postgresql://postgres:postgres@localhost:5432/policymint_test',
  API_KEY_SALT_ROUNDS: '4',
  JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long',
  OPERATOR_WALLET_PRIVATE_KEY: '0x1111111111111111111111111111111111111111111111111111111111111111',
  AGENT_WALLET_PRIVATE_KEY: '0x2222222222222222222222222222222222222222222222222222222222222222',
  POLICY_SIGNER_PRIVATE_KEY: '0x1111111111111111111111111111111111111111111111111111111111111111',
  ALCHEMY_RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/test',
  SEPOLIA_RPC_FALLBACK: 'https://ethereum-sepolia-rpc.publicnode.com/',
  CHAIN_ID: '11155111',
  IDENTITY_REGISTRY_ADDRESS: '0x97b07dDc405B0c28B17559aFFE63BdB3632d0ca3',
  VALIDATION_REGISTRY_ADDRESS: '0x92bF63E5C7Ac6980f237a7164Ab413BE226187F1',
  REPUTATION_REGISTRY_ADDRESS: '0x423a9904e39537a9997fbaF0f220d79D7d545763',
  RISK_ROUTER_ADDRESS: '0xd6A6952545FF6E6E6681c2d15C59f9EB8F40FdBC',
  HACKATHON_VAULT_ADDRESS: '0x0E7CD8ef9743FEcf94f9103033a044caBD45fC90',
  PRISM_API_KEY: 'prism_sk_test_key',
  PRISM_BASE_URL: 'https://api.prismapi.ai',
  INTERNAL_SERVICE_KEY: 'test-internal-service-key-at-least-32-characters',
  KRAKEN_CLI_PATH: 'kraken',
  STRATEGY_TRADE_AMOUNT_USD: '100',
  STRATEGY_TICK_INTERVAL_MS: '450000',
  AGENT_ID: '018f5f93-1ecf-7cc0-bf2f-0d72f12a9c1b',
};

export function applyTestEnvDefaults(): void {
  for (const [key, value] of Object.entries(testEnvDefaults)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}