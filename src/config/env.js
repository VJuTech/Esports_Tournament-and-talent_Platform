const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must contain at least 32 characters'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  COMPANY_NAME: z.string().default('Champion Lounge'),
  COMPANY_CONTACT: z.string().default('support@championlounge.com'),
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  DATABASE_CONNECT_RETRIES: z.coerce.number().int().min(1).max(10).default(5),
  DATABASE_CONNECT_RETRY_DELAY_MS: z.coerce.number().int().min(250).max(30000).default(2000),
  PAYMENT_PROVIDER_URL: z.string().url().optional().or(z.literal('')),
  PAYMENT_PROVIDER_SECRET: z.string().optional().or(z.literal('')),
  EMAIL_PROVIDER_URL: z.string().url().optional().or(z.literal('')),
  EMAIL_PROVIDER_SECRET: z.string().optional().or(z.literal(''))
});

const result = schema.safeParse(process.env);
if (!result.success) {
  const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

function configureDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  const isLocalDatabase = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);

  if (!isLocalDatabase && !url.searchParams.has('sslmode')) {
    url.searchParams.set('sslmode', 'require');
  }

  return url.toString();
}

const env = { ...result.data, DATABASE_URL: configureDatabaseUrl(result.data.DATABASE_URL) };
process.env.DATABASE_URL = env.DATABASE_URL;

module.exports = env;
