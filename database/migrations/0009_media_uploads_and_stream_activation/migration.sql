ALTER TABLE "TournamentStream"
  ADD COLUMN "ingestUrl" TEXT,
  ADD COLUMN "isEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ImageAsset" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "bytes" BYTEA NOT NULL,
  "size" INTEGER NOT NULL,
  "uploadedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImageAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ImageAsset_uploadedById_createdAt_idx" ON "ImageAsset"("uploadedById", "createdAt");
ALTER TABLE "ImageAsset"
  ADD CONSTRAINT "ImageAsset_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
