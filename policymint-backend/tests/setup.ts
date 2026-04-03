const testEnvDefaults: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: '3001',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/policymint_test',
  DIRECT_URL: 'postgresql://postgres:postgres@localhost:5432/policymint_test',
  API_KEY_SALT_ROUNDS: '4',
  JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long',
  ALCHEMY_RPC_URL: 'https://base-sepolia.g.alchemy.com/v2/test',
  BASE_SEPOLIA_RPC_FALLBACK: 'https://sepolia.base.org',
  CHAIN_ID: '84532'
};

for (const [key, value] of Object.entries(testEnvDefaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}
