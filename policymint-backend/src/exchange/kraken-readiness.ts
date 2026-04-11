export interface KrakenCliReadinessState {
  ready: boolean;
  checkedAt: string;
  reason: string | null;
}

let state: KrakenCliReadinessState = {
  ready: true,
  checkedAt: new Date(0).toISOString(),
  reason: null,
};

export function setKrakenCliReadiness(input: { ready: boolean; reason?: string | null }): KrakenCliReadinessState {
  state = {
    ready: input.ready,
    checkedAt: new Date().toISOString(),
    reason: input.reason ?? null,
  };

  return state;
}

export function getKrakenCliReadiness(): KrakenCliReadinessState {
  return state;
}
