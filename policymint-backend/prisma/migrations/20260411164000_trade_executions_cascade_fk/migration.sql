ALTER TABLE "trade_executions"
  DROP CONSTRAINT IF EXISTS "trade_executions_agent_id_fkey";

ALTER TABLE "trade_executions"
  DROP CONSTRAINT IF EXISTS "trade_executions_evaluation_id_fkey";

ALTER TABLE "trade_executions"
  ADD CONSTRAINT "trade_executions_agent_id_fkey"
  FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "trade_executions"
  ADD CONSTRAINT "trade_executions_evaluation_id_fkey"
  FOREIGN KEY ("evaluation_id") REFERENCES "intent_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
