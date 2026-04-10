import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const validateStartupConfigurationMock = vi.hoisted(() => vi.fn());
const buildAppMock = vi.hoisted(() => vi.fn());
const prismaDisconnectMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const strategyStartMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const strategyStopMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const envState = vi.hoisted(() => ({ PORT: 4010, AGENT_ID: undefined as string | undefined }));
const agentFindUniqueMock = vi.hoisted(() => vi.fn());
const agentUpdateMock = vi.hoisted(() => vi.fn());
const registerAgentOnChainMock = vi.hoisted(() => vi.fn());
const claimHackathonAllocationMock = vi.hoisted(() => vi.fn());
const getRiskRouterIntentNonceMock = vi.hoisted(() => vi.fn());
const captureErrorToSentryMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('./app.js', () => ({
  buildApp: buildAppMock,
}));

vi.mock('./config/startup.js', () => ({
  validateStartupConfiguration: validateStartupConfigurationMock,
}));

vi.mock('./db/client.js', () => ({
  prisma: {
    $disconnect: prismaDisconnectMock,
    agent: {
      findUnique: agentFindUniqueMock,
      update: agentUpdateMock,
    },
  },
}));

vi.mock('./config/env.js', () => ({
  env: envState,
}));

vi.mock('./agent/loop.js', () => ({
  StrategyLoop: vi.fn().mockImplementation(() => ({
    start: strategyStartMock,
    stop: strategyStopMock,
  })),
}));

vi.mock('./lib/blockchain/agentRegistry.js', () => ({
  registerAgentOnChain: registerAgentOnChainMock,
}));

vi.mock('./lib/blockchain/hackathonVault.js', () => ({
  claimHackathonAllocation: claimHackathonAllocationMock,
}));

vi.mock('./lib/blockchain/riskRouter.js', () => ({
  getRiskRouterIntentNonce: getRiskRouterIntentNonceMock,
}));

vi.mock('./modules/agents/registration.constants.js', () => ({
  buildCanonicalAgentURI: vi.fn(() => 'data:application/json;base64,eyJhY3RpdmUiOnRydWV9'),
  CANONICAL_AGENT_CAPABILITIES: ['trading'],
  CANONICAL_AGENT_DESCRIPTION: 'PolicyMint',
  CANONICAL_AGENT_NAME: 'PolicyMint',
}));

vi.mock('./lib/telemetry.js', () => ({
  captureErrorToSentry: captureErrorToSentryMock,
}));

function createAppMock() {
  return {
    listen: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
}

describe('index main bootstrap', () => {
  let onSpy: { mockRestore: () => void } | undefined;
  let exitSpy: { mockRestore: () => void } | undefined;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    envState.PORT = 4010;
    envState.AGENT_ID = undefined;
    agentFindUniqueMock.mockResolvedValue({
      id: 'agent-1',
      erc8004TokenId: '42',
      vaultClaimedAt: new Date(),
      registrationTxHash: '0xabc',
      lastNonce: 1n,
    });
    agentUpdateMock.mockResolvedValue(undefined);
    getRiskRouterIntentNonceMock.mockResolvedValue(1n);
  });

  afterEach(() => {
    onSpy?.mockRestore();
    exitSpy?.mockRestore();
  });

  it('starts app and warns when AGENT_ID is missing', async () => {
    const app = createAppMock();
    buildAppMock.mockResolvedValue(app);

    await import('./index.js');
    await new Promise((resolve) => setImmediate(resolve));

    expect(validateStartupConfigurationMock).toHaveBeenCalledTimes(1);
    expect(app.listen).toHaveBeenCalledWith({ port: 4010, host: '0.0.0.0' });
    expect(strategyStartMock).not.toHaveBeenCalled();
    expect(app.log.warn).toHaveBeenCalledWith('AGENT_ID not set; strategy loop disabled');
  });

  it('starts strategy loop when AGENT_ID is configured', async () => {
    envState.AGENT_ID = 'agent-1';
    const app = createAppMock();
    buildAppMock.mockResolvedValue(app);

    await import('./index.js');
    await new Promise((resolve) => setImmediate(resolve));

    expect(strategyStartMock).toHaveBeenCalledTimes(1);
    expect(app.log.warn).not.toHaveBeenCalled();
  });

  it('handles SIGINT with graceful shutdown steps', async () => {
    const handlers: Record<string, () => void> = {};
    onSpy = vi.spyOn(process, 'on').mockImplementation(((event: string, handler: () => void) => {
      handlers[event] = handler;
      return process;
    }) as any);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
    const app = createAppMock();
    buildAppMock.mockResolvedValue(app);

    await import('./index.js');
    await new Promise((resolve) => setImmediate(resolve));

    handlers.SIGINT?.();
    await new Promise((resolve) => setImmediate(resolve));

    expect(strategyStopMock).toHaveBeenCalled();
    expect(app.close).toHaveBeenCalled();
    expect(prismaDisconnectMock).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('handles SIGTERM with graceful shutdown steps', async () => {
    const handlers: Record<string, () => void> = {};
    onSpy = vi.spyOn(process, 'on').mockImplementation(((event: string, handler: () => void) => {
      handlers[event] = handler;
      return process;
    }) as any);
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
    const app = createAppMock();
    buildAppMock.mockResolvedValue(app);

    await import('./index.js');
    await new Promise((resolve) => setImmediate(resolve));

    handlers.SIGTERM?.();
    await new Promise((resolve) => setImmediate(resolve));

    expect(strategyStopMock).toHaveBeenCalled();
    expect(app.close).toHaveBeenCalled();
    expect(prismaDisconnectMock).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('stops strategy and exits with code 1 when listen fails', async () => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
    const app = createAppMock();
    const listenError = new Error('listen failed');
    app.listen.mockRejectedValue(listenError);
    buildAppMock.mockResolvedValue(app);

    await import('./index.js');
    await new Promise((resolve) => setImmediate(resolve));

    expect(app.log.error).toHaveBeenCalledWith(listenError);
    expect(strategyStopMock).toHaveBeenCalled();
    expect(prismaDisconnectMock).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
