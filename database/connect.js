const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { setTimeout: delay } = require('node:timers/promises');
const env = require('../src/config/env');

const databaseUrl = new URL(env.DATABASE_URL);
const isLocalDatabase = ['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname);
databaseUrl.searchParams.delete('sslmode');
const pool = new Pool({
  connectionString: databaseUrl.toString(),
  ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  keepAlive: true
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

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
  await pool.end();
}

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase
};
