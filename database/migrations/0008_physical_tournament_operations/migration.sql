ALTER TABLE "Match"
  ADD COLUMN "bracketPosition" INTEGER,
  ADD COLUMN "nextMatchId" TEXT,
  ADD COLUMN "nextMatchSlot" INTEGER,
  ADD COLUMN "isEliminator" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Match_nextMatchId_idx" ON "Match"("nextMatchId");

CREATE TABLE "TournamentRulebook" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TournamentRulebook_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TournamentRulebook_tournamentId_key" ON "TournamentRulebook"("tournamentId");

CREATE TABLE "TournamentTimetable" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "notes" TEXT,
  CONSTRAINT "TournamentTimetable_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TournamentTimetable_tournamentId_key" ON "TournamentTimetable"("tournamentId");

CREATE TABLE "TournamentStream" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OFFLINE',
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TournamentStream_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TournamentStream_tournamentId_key" ON "TournamentStream"("tournamentId");

ALTER TABLE "Match"
  ADD CONSTRAINT "Match_nextMatchId_fkey"
  FOREIGN KEY ("nextMatchId") REFERENCES "Match"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TournamentRulebook"
  ADD CONSTRAINT "TournamentRulebook_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentTimetable"
  ADD CONSTRAINT "TournamentTimetable_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentStream"
  ADD CONSTRAINT "TournamentStream_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
