ALTER TABLE "Team" ADD COLUMN "managerId" TEXT;
ALTER TABLE "Match" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';

CREATE TABLE "MatchParticipant" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "seed" INTEGER,
  CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MatchParticipant_matchId_userId_key" ON "MatchParticipant"("matchId", "userId");
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE;

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
CREATE INDEX "MatchResult_matchId_status_idx" ON "MatchResult"("matchId", "status");
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON UPDATE CASCADE;

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
CREATE INDEX "TeamMembership_teamId_status_idx" ON "TeamMembership"("teamId", "status");
CREATE INDEX "TeamMembership_userId_joinedAt_idx" ON "TeamMembership"("userId", "joinedAt");
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON UPDATE CASCADE;
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE;

CREATE TABLE "ScoutingEvaluation" (
  "id" TEXT NOT NULL, "playerId" TEXT NOT NULL, "scoutId" TEXT NOT NULL, "gameId" TEXT, "tournamentId" TEXT,
  "rating" INTEGER NOT NULL, "strengths" TEXT, "concerns" TEXT, "notes" TEXT, "visibility" TEXT NOT NULL DEFAULT 'INTERNAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScoutingEvaluation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ScoutingEvaluation_playerId_createdAt_idx" ON "ScoutingEvaluation"("playerId", "createdAt");
ALTER TABLE "ScoutingEvaluation" ADD CONSTRAINT "ScoutingEvaluation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "ScoutingEvaluation" ADD CONSTRAINT "ScoutingEvaluation_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "ScoutingEvaluation" ADD CONSTRAINT "ScoutingEvaluation_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON UPDATE CASCADE;
ALTER TABLE "ScoutingEvaluation" ADD CONSTRAINT "ScoutingEvaluation_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON UPDATE CASCADE;

CREATE TABLE "SelectionDecision" (
  "id" TEXT NOT NULL, "playerId" TEXT NOT NULL, "decisionById" TEXT NOT NULL, "cycle" TEXT NOT NULL,
  "status" TEXT NOT NULL, "criteria" TEXT NOT NULL, "notes" TEXT, "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tournamentId" TEXT, CONSTRAINT "SelectionDecision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SelectionDecision_playerId_decidedAt_idx" ON "SelectionDecision"("playerId", "decidedAt");
ALTER TABLE "SelectionDecision" ADD CONSTRAINT "SelectionDecision_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "SelectionDecision" ADD CONSTRAINT "SelectionDecision_decisionById_fkey" FOREIGN KEY ("decisionById") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "SelectionDecision" ADD CONSTRAINT "SelectionDecision_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON UPDATE CASCADE;

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" TEXT NOT NULL, "channel" TEXT NOT NULL DEFAULT 'EMAIL',
  "status" TEXT NOT NULL DEFAULT 'QUEUED', "subject" TEXT NOT NULL, "body" TEXT NOT NULL, "providerId" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0, "lastError" TEXT, "deliveredAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tournamentId" TEXT, CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_status_createdAt_idx" ON "Notification"("status", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON UPDATE CASCADE;
