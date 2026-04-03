import { z } from 'zod';

const emptyToUndefined = (value: unknown): unknown => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  return value;
};

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  API_KEY_SALT_ROUNDS: z.coerce.number().default(12),
  JWT_SECRET: z.string().min(32),
  POLICY_SIGNER_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  ALCHEMY_RPC_URL: z.string().url(),
  BASE_SEPOLIA_RPC_FALLBACK: z.string().url().default('https://sepolia.base.org'),
  CHAIN_ID: z.coerce.number().default(84532),
  IDENTITY_REGISTRY_ADDRESS: z.preprocess(emptyToUndefined, z.string().startsWith('0x').optional()),
  VALIDATION_REGISTRY_ADDRESS: z.preprocess(emptyToUndefined, z.string().startsWith('0x').optional()),
  REPUTATION_REGISTRY_ADDRESS: z.preprocess(emptyToUndefined, z.string().startsWith('0x').optional()),
  SENTRY_DSN: z.preprocess(emptyToUndefined, z.string().url().optional()),
  KRAKEN_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  KRAKEN_API_SECRET: z.preprocess(emptyToUndefined, z.string().optional())
});

export type Env = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
