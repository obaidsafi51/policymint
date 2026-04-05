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
  RISK_ROUTER_ADDRESS: '0xd6A6952545FF6E6E6681c2d15C59f9EB8F40FdBC',
  HACKATHON_VAULT_ADDRESS: '0x0E7CD8ef9743FEcf94f9103033a044caBD45fC90',
    INTERNAL_SERVICE_KEY: 'test-internal-service-key-at-least-32-characters',
    KRAKEN_CLI_PATH: 'kraken',
    STRATEGY_TRADE_AMOUNT_USD: '100',
    AGENT_ID: '018f5f93-1ecf-7cc0-bf2f-0d72f12a9c1b',
};

export function applyTestEnvDefaults(): void {
  for (const [key, value] of Object.entries(testEnvDefaults)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
