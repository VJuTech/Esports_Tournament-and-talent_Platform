ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'ABANDONED';

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

CREATE UNIQUE INDEX "PaymentAttempt_providerReference_key" ON "PaymentAttempt"("providerReference");
CREATE INDEX "PaymentAttempt_registrationId_status_idx" ON "PaymentAttempt"("registrationId", "status");

ALTER TABLE "PaymentAttempt"
  ADD CONSTRAINT "PaymentAttempt_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "Registration"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
