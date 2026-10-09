ALTER TYPE "RegistrationStatus" ADD VALUE IF NOT EXISTS 'WAITLISTED';
ALTER TYPE "RegistrationStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'SUCCESSFUL';

ALTER TABLE "Tournament"
  ADD COLUMN "nextTournamentNumber" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Registration"
  ALTER COLUMN "tournamentNumber" DROP NOT NULL,
  ADD COLUMN "teamId" TEXT,
  ADD COLUMN "feeAmount" DECIMAL(12,2),
  ADD COLUMN "feeCurrency" VARCHAR(3),
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancellationReason" TEXT;

UPDATE "Registration" r
SET "feeAmount" = t."entryFee", "feeCurrency" = t."currency"
FROM "Tournament" t
WHERE r."tournamentId" = t."id" AND (r."feeAmount" IS NULL OR r."feeCurrency" IS NULL);

ALTER TABLE "Registration"
  ALTER COLUMN "feeAmount" SET NOT NULL,
  ALTER COLUMN "feeCurrency" SET NOT NULL;

CREATE INDEX "Registration_tournamentId_status_idx"
  ON "Registration"("tournamentId", "status");

ALTER TABLE "Registration"
  ADD CONSTRAINT "Registration_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
