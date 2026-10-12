ALTER TABLE "Receipt"
  ADD COLUMN "companyName" TEXT,
  ADD COLUMN "companyContact" TEXT,
  ADD COLUMN "playerName" TEXT,
  ADD COLUMN "tournamentName" TEXT,
  ADD COLUMN "tournamentNumber" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "amount" DECIMAL(12,2),
  ADD COLUMN "currency" VARCHAR(3),
  ADD COLUMN "paymentDate" TIMESTAMP(3),
  ADD COLUMN "paymentReference" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PAID';

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

ALTER TABLE "ReceiptDeliveryAttempt"
  ADD CONSTRAINT "ReceiptDeliveryAttempt_receiptId_fkey"
  FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReceiptAdjustment"
  ADD CONSTRAINT "ReceiptAdjustment_receiptId_fkey"
  FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
