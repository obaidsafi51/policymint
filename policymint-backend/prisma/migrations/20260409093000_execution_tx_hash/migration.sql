ALTER TABLE "intent_evaluations"
ADD COLUMN IF NOT EXISTS "execution_tx_hash" TEXT;
