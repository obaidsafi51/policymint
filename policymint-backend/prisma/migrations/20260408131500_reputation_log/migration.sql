CREATE TABLE IF NOT EXISTS "reputation_log" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "agent_id" UUID NOT NULL,
  "evaluation_id" UUID NOT NULL,
  "attempt" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "tx_hash" TEXT,
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reputation_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "reputation_log_evaluation_id_created_at_idx"
  ON "reputation_log"("evaluation_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "reputation_log_agent_id_created_at_idx"
  ON "reputation_log"("agent_id", "created_at" DESC);