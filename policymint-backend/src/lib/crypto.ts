import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

const PREFIX = 'pm_live_';

export interface GeneratedApiKey {
  raw: string;
  hash: string;
  prefix: string;
}

export async function generateApiKey(): Promise<GeneratedApiKey> {
  const secret = randomBytes(32).toString('hex');
  const raw = `${PREFIX}${secret}`;
  const prefix = raw.slice(0, PREFIX.length + 8);
  const hash = await bcrypt.hash(raw, env.API_KEY_SALT_ROUNDS);

  return { raw, hash, prefix };
}

export async function verifyApiKey(raw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(raw, hash);
}
