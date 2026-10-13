-- Champion Lounge database rebuild script.
-- WARNING: this drops and recreates all application tables.
-- Run once against an existing PostgreSQL database with:
--   psql "postgresql://USER:PASSWORD@HOST:5432/DATABASE" -f database/rebuild.sql
--
-- If this script is used, do not also run `prisma migrate deploy` against
-- the same database. Use either this rebuild script or Prisma migrations.

BEGIN;

DROP TABLE IF EXISTS "PasswordResetToken", "EmailVerificationToken", "GameProfile",
  "Notification", "SelectionDecision", "ScoutingEvaluation", "TeamMembership",
  "MatchResult", "MatchParticipant", "AuditLog", "TeamMember", "Team", "Ranking", "Match", "Receipt",
  "ReceiptAdjustment", "ReceiptDeliveryAttempt", "PaymentAttempt", "Registration",
  "Payment", "Tournament", "Game", "User" CASCADE;

DROP TYPE IF EXISTS "ParticipationType", "AccountStatus", "UserRole",
  "TournamentStatus", "RegistrationStatus", "PaymentStatus" CASCADE;

CREATE TYPE "UserRole" AS ENUM (
  'PLAYER',
  'TOURNAMENT_OFFICIAL',
  'REFEREE',
  'TOURNAMENT_MANAGER',
  'SCOUT',
  'FINANCE_OFFICER',
  'SUPER_ADMIN'
);

CREATE TYPE "TournamentStatus" AS ENUM (
  'DRAFT',
  'PUBLISHED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "RegistrationStatus" AS ENUM (
  'PENDING',
  'WAITLISTED',
  'CONFIRMED',
  'REFUNDED',
  'CANCELLED',
  'REJECTED'
);

CREATE TYPE "PaymentStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'SUCCESSFUL',
  'VERIFIED',
  'FAILED',
  'ABANDONED',
  'REFUNDED'
);

CREATE TYPE "AccountStatus" AS ENUM (
  'ACTIVE',
  'SUSPENDED',
  'DISABLED'
);

CREATE TYPE "ParticipationType" AS ENUM (
  'INDIVIDUAL',
  'TEAM'
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
  "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
  "profileImage" TEXT,
  "country" TEXT,
  "eligibilityInfo" JSONB,
  "scoutStatus" TEXT,
  "awards" JSONB,
  "emailVerifiedAt" TIMESTAMP(3),
  "sessionVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Game" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "supportedMode" TEXT,
  "imageUrl" TEXT,
  "rulesUrl" TEXT,
  "formats" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Game_name_key" ON "Game"("name");
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");

CREATE TABLE "Tournament" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "format" TEXT NOT NULL,
  "participationType" "ParticipationType" NOT NULL DEFAULT 'INDIVIDUAL',
  "entryFee" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "registrationOpensAt" TIMESTAMP(3) NOT NULL,
  "registrationDeadline" TIMESTAMP(3) NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER NOT NULL,
  "eligibilityMinimumAge" INTEGER,
  "eligibilityRequirements" TEXT,
  "scoringRules" TEXT,
  "matchDurationMinutes" INTEGER,
  "schedulingRules" TEXT,
  "reportingRules" TEXT,
  "prizeInformation" TEXT,
  "refundPolicy" TEXT,
  "terms" TEXT,
  "disputeDeadline" TIMESTAMP(3),
  "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
  "gameId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "nextTournamentNumber" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tournament_code_key" ON "Tournament"("code");
CREATE INDEX "Tournament_status_registrationDeadline_idx"
  ON "Tournament"("status", "registrationDeadline");
CREATE INDEX "Tournament_gameId_status_idx"
  ON "Tournament"("gameId", "status");

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "providerReference" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_providerReference_key"
  ON "Payment"("providerReference");

CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "providerReference" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "provider" TEXT NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "checkoutUrl" TEXT,
  "providerPayload" JSONB,
  "failureReason" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentAttempt_providerReference_key"
  ON "PaymentAttempt"("providerReference");
CREATE INDEX "PaymentAttempt_registrationId_status_idx"
  ON "PaymentAttempt"("registrationId", "status");

CREATE TABLE "Registration" (
  "id" TEXT NOT NULL,
  "tournamentNumber" TEXT,
  "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
  "userId" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "paymentId" TEXT,
  "teamId" TEXT,
  "feeAmount" DECIMAL(12,2) NOT NULL,
  "feeCurrency" VARCHAR(3) NOT NULL,
  "confirmedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Registration_tournamentNumber_key"
  ON "Registration"("tournamentNumber");
CREATE UNIQUE INDEX "Registration_paymentId_key"
  ON "Registration"("paymentId");
CREATE UNIQUE INDEX "Registration_tournamentId_userId_key"
  ON "Registration"("tournamentId", "userId");
CREATE INDEX "Registration_tournamentId_status_idx"
  ON "Registration"("tournamentId", "status");

CREATE TABLE "Receipt" (
  "id" TEXT NOT NULL,
  "receiptNumber" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "registrationId" TEXT NOT NULL,
  "companyName" TEXT,
  "companyContact" TEXT,
  "playerName" TEXT,
  "tournamentName" TEXT,
  "tournamentNumber" TEXT,
  "description" TEXT,
  "amount" DECIMAL(12,2),
  "currency" VARCHAR(3),
  "paymentDate" TIMESTAMP(3),
  "paymentReference" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PAID',
  CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Receipt_receiptNumber_key" ON "Receipt"("receiptNumber");
CREATE UNIQUE INDEX "Receipt_registrationId_key" ON "Receipt"("registrationId");

CREATE TABLE "ReceiptDeliveryAttempt" (
  "id" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReceiptDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReceiptDeliveryAttempt_receiptId_createdAt_idx"
  ON "ReceiptDeliveryAttempt"("receiptId", "createdAt");

CREATE TABLE "ReceiptAdjustment" (
  "id" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "amount" DECIMAL(12,2),
  "currency" VARCHAR(3),
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReceiptAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Match" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "round" INTEGER NOT NULL,
  "scheduledAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "result" JSONB,
  CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Match_tournamentId_round_idx" ON "Match"("tournamentId", "round");

CREATE TABLE "MatchParticipant" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "seed" INTEGER,
  CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchParticipant_matchId_userId_key"
  ON "MatchParticipant"("matchId", "userId");

CREATE TABLE "MatchResult" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "submittedById" TEXT NOT NULL,
  "approvedById" TEXT,
  "scores" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "evidenceUrl" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MatchResult_matchId_status_idx"
  ON "MatchResult"("matchId", "status");

CREATE TABLE "Ranking" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "score" DECIMAL(12,2) NOT NULL,
  CONSTRAINT "Ranking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Ranking_tournamentId_userId_key"
  ON "Ranking"("tournamentId", "userId");
CREATE UNIQUE INDEX "Ranking_tournamentId_position_key"
  ON "Ranking"("tournamentId", "position");

CREATE TABLE "Team" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "managerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

CREATE TABLE "TeamMembership" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "departedAt" TIMESTAMP(3),
  "notes" TEXT,
  CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeamMembership_teamId_status_idx"
  ON "TeamMembership"("teamId", "status");
CREATE INDEX "TeamMembership_userId_joinedAt_idx"
  ON "TeamMembership"("userId", "joinedAt");

CREATE TABLE "TeamMember" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamMember_teamId_userId_key"
  ON "TeamMember"("teamId", "userId");

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_entity_entityId_idx"
  ON "AuditLog"("entity", "entityId");

CREATE TABLE "ScoutingEvaluation" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "scoutId" TEXT NOT NULL,
  "gameId" TEXT,
  "tournamentId" TEXT,
  "rating" INTEGER NOT NULL,
  "strengths" TEXT,
  "concerns" TEXT,
  "notes" TEXT,
  "visibility" TEXT NOT NULL DEFAULT 'INTERNAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScoutingEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScoutingEvaluation_playerId_createdAt_idx"
  ON "ScoutingEvaluation"("playerId", "createdAt");

CREATE TABLE "SelectionDecision" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "decisionById" TEXT NOT NULL,
  "cycle" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "criteria" TEXT NOT NULL,
  "notes" TEXT,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tournamentId" TEXT,
  CONSTRAINT "SelectionDecision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SelectionDecision_playerId_decidedAt_idx"
  ON "SelectionDecision"("playerId", "decidedAt");

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'EMAIL',
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "providerId" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tournamentId" TEXT,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_createdAt_idx"
  ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_status_createdAt_idx"
  ON "Notification"("status", "createdAt");

CREATE TABLE "GameProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "inGameId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameProfile_userId_gameId_key"
  ON "GameProfile"("userId", "gameId");

CREATE TABLE "EmailVerificationToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key"
  ON "EmailVerificationToken"("tokenHash");
CREATE INDEX "EmailVerificationToken_userId_expiresAt_idx"
  ON "EmailVerificationToken"("userId", "expiresAt");

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key"
  ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx"
  ON "PasswordResetToken"("userId", "expiresAt");

ALTER TABLE "Tournament"
  ADD CONSTRAINT "Tournament_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "Game"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Tournament_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Registration"
  ADD CONSTRAINT "Registration_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Registration_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Registration_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Registration_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentAttempt"
  ADD CONSTRAINT "PaymentAttempt_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "Registration"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Receipt"
  ADD CONSTRAINT "Receipt_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "Registration"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReceiptDeliveryAttempt"
  ADD CONSTRAINT "ReceiptDeliveryAttempt_receiptId_fkey"
  FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReceiptAdjustment"
  ADD CONSTRAINT "ReceiptAdjustment_receiptId_fkey"
  FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Match"
  ADD CONSTRAINT "Match_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MatchParticipant"
  ADD CONSTRAINT "MatchParticipant_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "MatchParticipant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MatchResult"
  ADD CONSTRAINT "MatchResult_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "MatchResult_submittedById_fkey"
  FOREIGN KEY ("submittedById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MatchResult_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Ranking"
  ADD CONSTRAINT "Ranking_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Ranking_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Team"
  ADD CONSTRAINT "Team_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "Game"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Team_managerId_fkey"
  FOREIGN KEY ("managerId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TeamMember"
  ADD CONSTRAINT "TeamMember_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "TeamMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TeamMembership"
  ADD CONSTRAINT "TeamMembership_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "TeamMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScoutingEvaluation"
  ADD CONSTRAINT "ScoutingEvaluation_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ScoutingEvaluation_scoutId_fkey"
  FOREIGN KEY ("scoutId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ScoutingEvaluation_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "Game"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ScoutingEvaluation_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SelectionDecision"
  ADD CONSTRAINT "SelectionDecision_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SelectionDecision_decisionById_fkey"
  FOREIGN KEY ("decisionById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SelectionDecision_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Notification_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GameProfile"
  ADD CONSTRAINT "GameProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "GameProfile_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "Game"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EmailVerificationToken"
  ADD CONSTRAINT "EmailVerificationToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- TEST-ONLY ADMIN ACCOUNT.
-- Remove this seed before using rebuild.sql for production data.
INSERT INTO "User" (
  "id",
  "email",
  "passwordHash",
  "displayName",
  "role",
  "accountStatus",
  "emailVerifiedAt"
) VALUES (
  '00000000-0000-4000-8000-000000000001',
  'admin@championlounge.com',
  '$2b$12$ekNbeWjBYp4sEHmjy8c28eskvyAz6talw2IxxuBFT3ExTUkQQkcqu',
  'Test Administrator',
  'SUPER_ADMIN',
  'ACTIVE',
  CURRENT_TIMESTAMP
);

COMMIT;
