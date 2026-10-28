const { prisma } = require('../config/database');

async function createUserWithVerification(userData, tokenData) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { ...userData, email: userData.email.trim().toLowerCase() }
    });
    await tx.emailVerificationToken.create({
      data: { ...tokenData, userId: user.id }
    });
    return user;
  });
}

async function updateUnverifiedUserCredentials(userId, passwordHash, tokenData) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: userId, emailVerifiedAt: null },
      data: { passwordHash }
    });
    if (updated.count !== 1) return false;
    await tx.emailVerificationToken.deleteMany({ where: { userId } });
    await tx.emailVerificationToken.create({ data: { ...tokenData, userId } });
    return true;
  });
}

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
  createUserWithVerification,
  updateUnverifiedUserCredentials,
  createEmailVerificationToken,
  findEmailVerificationToken,
  createPasswordResetToken,
  findPasswordResetToken
};
