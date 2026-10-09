const { prisma } = require('../config/database');

function createEmailVerificationToken(data) {
  return prisma.emailVerificationToken.create({ data });
}

function findEmailVerificationToken(tokenHash) {
  return prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
}

function createPasswordResetToken(data) {
  return prisma.passwordResetToken.create({ data });
}

function findPasswordResetToken(tokenHash) {
  return prisma.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: true } });
}

module.exports = {
  createEmailVerificationToken,
  findEmailVerificationToken,
  createPasswordResetToken,
  findPasswordResetToken
};
