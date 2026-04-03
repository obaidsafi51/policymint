CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "StrategyType" AS ENUM ('MOMENTUM', 'REBALANCING', 'CUSTOM');
CREATE TYPE "PolicyType" AS ENUM ('VENUE_ALLOWLIST', 'SPEND_CAP_PER_TX', 'DAILY_LOSS_BUDGET');
CREATE TYPE "EvaluationResult" AS ENUM ('ALLOW', 'BLOCK');
CREATE TYPE "RegistryType" AS ENUM ('ERC8004', 'BASE_SEPOLIA');
CREATE TYPE "SignalType" AS ENUM ('POSITIVE', 'NEGATIVE');
CREATE TYPE "ActionType" AS ENUM ('SWAP', 'TRANSFER', 'BRIDGE', 'TRADE', 'CUSTOM');

CREATE TABLE "agents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "wallet_address" TEXT NOT NULL,
  "metadata_uri" TEXT,
  "chain_id" INTEGER NOT NULL DEFAULT 84532,
  "strategy_type" "StrategyType" NOT NULL DEFAULT 'MOMENTUM',
  "erc8004_token_id" TEXT,
  "api_key_hash" TEXT NOT NULL,
  "api_key_prefix" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "agent_id" UUID NOT NULL,
  "type" "PolicyType" NOT NULL,
  "params" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "intent_evaluations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "agent_id" UUID NOT NULL,
  "policy_id" UUID,
  "action_type" "ActionType" NOT NULL,
  "venue" TEXT NOT NULL,
  "amount_raw" TEXT NOT NULL,
  "token_in" TEXT NOT NULL,
  "token_out" TEXT,
  "intent_params" JSONB,
  "result" "EvaluationResult" NOT NULL,
  "block_reason" TEXT,
  "eip712_signed_intent" TEXT,
  "validation_tx_hash" TEXT,
  "emitted_at" TIMESTAMP(3),
  "cycle_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "intent_evaluations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "validation_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "evaluation_id" UUID NOT NULL,
  "registry_type" "RegistryType" NOT NULL,
  "tx_hash" TEXT NOT NULL,
  "block_number" BIGINT,
  "emitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "agent_token_id" TEXT,
  "strategy_checkpoint_hash" TEXT,

  CONSTRAINT "validation_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reputation_signals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "agent_id" UUID NOT NULL,
  "signal_type" "SignalType" NOT NULL,
  "cycle_id" TEXT,
  "tx_hash" TEXT,
  "emitted_at" TIMESTAMP(3),
  "score_snapshot" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "reputation_signals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "strategy_cycles" (
  "id" TEXT NOT NULL,
  "agent_id" UUID NOT NULL,
  "strategy_type" TEXT NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "open_price_usd" DECIMAL(20,8),
  "close_price_usd" DECIMAL(20,8),
  "pnl_usd" DECIMAL(20,8),
  "baseline_comparison" DECIMAL(20,8),
  "signal_data" JSONB,

  CONSTRAINT "strategy_cycles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "agents_wallet_address_idx" ON "agents"("wallet_address");
CREATE INDEX "agents_api_key_prefix_idx" ON "agents"("api_key_prefix");
CREATE INDEX "agents_erc8004_token_id_idx" ON "agents"("erc8004_token_id");

CREATE INDEX "policies_agent_id_is_active_idx" ON "policies"("agent_id", "is_active");
CREATE INDEX "policies_agent_id_type_idx" ON "policies"("agent_id", "type");

CREATE INDEX "intent_evaluations_agent_id_created_at_idx" ON "intent_evaluations"("agent_id", "created_at" DESC);
CREATE INDEX "intent_evaluations_agent_id_result_idx" ON "intent_evaluations"("agent_id", "result");
CREATE INDEX "intent_evaluations_cycle_id_idx" ON "intent_evaluations"("cycle_id");

CREATE INDEX "validation_records_evaluation_id_idx" ON "validation_records"("evaluation_id");
CREATE INDEX "validation_records_tx_hash_idx" ON "validation_records"("tx_hash");

CREATE INDEX "reputation_signals_agent_id_created_at_idx" ON "reputation_signals"("agent_id", "created_at" DESC);
CREATE INDEX "reputation_signals_agent_id_signal_type_idx" ON "reputation_signals"("agent_id", "signal_type");

CREATE INDEX "strategy_cycles_agent_id_started_at_idx" ON "strategy_cycles"("agent_id", "started_at" DESC);

ALTER TABLE "policies"
ADD CONSTRAINT "policies_agent_id_fkey"
FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "intent_evaluations"
ADD CONSTRAINT "intent_evaluations_agent_id_fkey"
FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "intent_evaluations"
ADD CONSTRAINT "intent_evaluations_policy_id_fkey"
FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "validation_records"
ADD CONSTRAINT "validation_records_evaluation_id_fkey"
FOREIGN KEY ("evaluation_id") REFERENCES "intent_evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reputation_signals"
ADD CONSTRAINT "reputation_signals_agent_id_fkey"
FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
