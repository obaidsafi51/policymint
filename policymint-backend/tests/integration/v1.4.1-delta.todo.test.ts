import { describe, it } from 'vitest';

describe('v1.4.1 delta (deferred from v1.4 blockchain sprint)', () => {
  it.todo('POST /v1/agents rejects duplicate wallet with explicit 409 contract');
  it.todo('on-chain onboarding rejects duplicate wallet and skips second registration attempt');
  it.todo('Agent registration uses two-wallet architecture (operator + agent wallet)');
  it.todo('RiskRouter on-chain TradeIntent mapping from internal intent format is enforced');
  it.todo('ValidationRegistry attestation score policy (0-100) is applied');
  it.todo('Simulate screen includes RiskRouter simulateIntent pre-check path');
  it.todo('ReputationRegistry submitFeedback flow replaces legacy hook semantics');
});
