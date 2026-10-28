ALTER TABLE "Tournament"
  ADD COLUMN IF NOT EXISTS "paymentBankName" TEXT DEFAULT 'Palmpay',
  ADD COLUMN IF NOT EXISTS "paymentAccountName" TEXT DEFAULT 'VJU TECH LIMITED.',
  ADD COLUMN IF NOT EXISTS "paymentAccountNumber" TEXT DEFAULT '8943931330',
  ADD COLUMN IF NOT EXISTS "paymentAccountType" TEXT DEFAULT 'CURRENT',
  ADD COLUMN IF NOT EXISTS "paymentInstructions" TEXT DEFAULT 'Please include your tournament code or registration name in the transfer narration for confirmation.';