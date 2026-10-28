ALTER TABLE "Tournament"
  ALTER COLUMN "paymentBankName" SET DEFAULT 'Palmpay',
  ALTER COLUMN "paymentAccountName" SET DEFAULT 'VJU TECH LIMITED.',
  ALTER COLUMN "paymentAccountNumber" SET DEFAULT '8943931330',
  ALTER COLUMN "paymentAccountType" SET DEFAULT 'CURRENT',
  ALTER COLUMN "paymentInstructions" SET DEFAULT 'Please include your tournament code or registration name in the transfer narration for confirmation.';

UPDATE "Tournament"
SET
  "paymentBankName" = COALESCE("paymentBankName", 'Palmpay'),
  "paymentAccountName" = COALESCE("paymentAccountName", 'VJU TECH LIMITED.'),
  "paymentAccountNumber" = COALESCE("paymentAccountNumber", '8943931330'),
  "paymentAccountType" = COALESCE("paymentAccountType", 'CURRENT'),
  "paymentInstructions" = COALESCE("paymentInstructions", 'Please include your tournament code or registration name in the transfer narration for confirmation.')
WHERE "paymentBankName" IS NULL
   OR "paymentAccountName" IS NULL
   OR "paymentAccountNumber" IS NULL
   OR "paymentAccountType" IS NULL
   OR "paymentInstructions" IS NULL;