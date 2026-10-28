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
const resendVerificationSchema = z.object({ email: z.string().email() });
const verificationCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/)
});
const resetPasswordSchema = z.object({
  password: z.string().min(8),
  passwordConfirmation: z.string().min(8)
}).refine((data) => data.password === data.passwordConfirmation, {
  message: 'Passwords must match',
  path: ['passwordConfirmation']
});
const resetPasswordWithCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(8),
  passwordConfirmation: z.string().min(8)
}).refine((data) => data.password === data.passwordConfirmation, {
  message: 'Passwords must match',
  path: ['passwordConfirmation']
});

module.exports = { loginSchema, registrationSchema, resendVerificationSchema, verificationCodeSchema, resetRequestSchema, resetPasswordSchema, resetPasswordWithCodeSchema };
