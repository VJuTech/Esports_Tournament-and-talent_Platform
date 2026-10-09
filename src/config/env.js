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
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
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

module.exports = result.data;
