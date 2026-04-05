ALTER TABLE "agents"
ADD COLUMN "registration_tx_hash" TEXT,
ADD COLUMN "vault_claimed_at" TIMESTAMP(3);

ALTER TABLE "validation_records"
ADD COLUMN "confirmed_at" TIMESTAMP(3);
