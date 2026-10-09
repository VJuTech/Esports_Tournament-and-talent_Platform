const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const registrationSchema = loginSchema.extend({
  displayName: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80)
});

const resetRequestSchema = z.object({ email: z.string().email() });
const resetPasswordSchema = z.object({
  password: z.string().min(8),
  passwordConfirmation: z.string().min(8)
}).refine((data) => data.password === data.passwordConfirmation, {
  message: 'Passwords must match',
  path: ['passwordConfirmation']
});

module.exports = { loginSchema, registrationSchema, resetRequestSchema, resetPasswordSchema };
