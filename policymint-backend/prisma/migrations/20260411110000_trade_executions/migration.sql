CREATE TABLE IF NOT EXISTS "trade_executions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "agent_id" UUID NOT NULL,
  "evaluation_id" UUID NOT NULL,
  "execution_path" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "pair" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "amount_usd_scaled" BIGINT NOT NULL,
  "fill_price" DECIMAL(20, 8),
  "fill_volume" DECIMAL(20, 8),
  "realized_pnl_usd" DECIMAL(20, 8),
  "order_id" TEXT,
  "raw_response" JSONB,
  "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trade_executions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "trade_executions_evaluation_id_key"
  ON "trade_executions"("evaluation_id");

CREATE INDEX IF NOT EXISTS "trade_executions_agent_id_created_at_idx"
  ON "trade_executions"("agent_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "trade_executions_agent_id_status_idx"
  ON "trade_executions"("agent_id", "status");

ALTER TABLE "trade_executions"
  ADD CONSTRAINT "trade_executions_agent_id_fkey"
  FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "trade_executions"
  ADD CONSTRAINT "trade_executions_evaluation_id_fkey"
  FOREIGN KEY ("evaluation_id") REFERENCES "intent_evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
