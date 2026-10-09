CREATE TYPE "ParticipationType" AS ENUM ('INDIVIDUAL', 'TEAM');

ALTER TABLE "Game"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "supportedMode" TEXT,
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "rulesUrl" TEXT,
  ADD COLUMN "formats" JSONB,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Tournament"
  ADD COLUMN "participationType" "ParticipationType" NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  ADD COLUMN "registrationOpensAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "endsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "eligibilityMinimumAge" INTEGER,
  ADD COLUMN "eligibilityRequirements" TEXT,
  ADD COLUMN "scoringRules" TEXT,
  ADD COLUMN "matchDurationMinutes" INTEGER,
  ADD COLUMN "schedulingRules" TEXT,
  ADD COLUMN "reportingRules" TEXT,
  ADD COLUMN "prizeInformation" TEXT,
  ADD COLUMN "refundPolicy" TEXT,
  ADD COLUMN "terms" TEXT,
  ADD COLUMN "disputeDeadline" TIMESTAMP(3),
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3);

UPDATE "Tournament"
SET "createdById" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "createdById" IS NULL;

ALTER TABLE "Tournament"
  ALTER COLUMN "createdById" SET NOT NULL;

ALTER TABLE "Tournament"
  ADD CONSTRAINT "Tournament_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Tournament_gameId_status_idx" ON "Tournament"("gameId", "status");
