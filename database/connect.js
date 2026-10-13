const { PrismaClient } = require('@prisma/client');
const { setTimeout: delay } = require('node:timers/promises');

const prisma = new PrismaClient();

async function connectDatabase() {
  const maxAttempts = Number(process.env.DATABASE_CONNECT_RETRIES || 5);
  const retryDelayMs = Number(process.env.DATABASE_CONNECT_RETRY_DELAY_MS || 2000);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await prisma.$connect();
      return;
    } catch (error) {
      if (error?.code !== 'P1001' || attempt === maxAttempts) throw error;
      const waitMs = retryDelayMs * attempt;
      console.warn(`Database is unavailable (attempt ${attempt}/${maxAttempts}); retrying in ${waitMs}ms.`);
      await delay(waitMs);
    }
  }
}

async function disconnectDatabase() {
  await prisma.$disconnect();
}

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase
};
