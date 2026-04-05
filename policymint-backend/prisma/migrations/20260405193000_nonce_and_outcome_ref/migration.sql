ALTER TABLE "agents"
ADD COLUMN "last_nonce" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "validation_records"
ADD COLUMN "outcome_ref" TEXT;
