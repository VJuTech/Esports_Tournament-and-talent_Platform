ALTER TABLE "Tournament"
  ADD COLUMN "paymentBankName" TEXT DEFAULT 'Palmpay',
  ADD COLUMN "paymentAccountName" TEXT DEFAULT 'VJU TECH LIMITED.',
  ADD COLUMN "paymentAccountNumber" TEXT DEFAULT '8943931330',
  ADD COLUMN "paymentAccountType" TEXT DEFAULT 'CURRENT',
  ADD COLUMN "paymentInstructions" TEXT DEFAULT 'Please include your tournament code or registration name in the transfer narration for confirmation.';