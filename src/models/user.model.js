const { prisma } = require('../config/database');

function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { gameProfiles: { include: { game: true } }, registrations: { include: { tournament: true, receipt: true, payment: true } }, rankings: { include: { tournament: true } }, teamMembers: { include: { team: true } } }
  });
}

function createUser(data) {
  return prisma.user.create({ data: { ...data, email: data.email.trim().toLowerCase() } });
}

function findUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    include: { gameProfiles: { include: { game: true } }, registrations: { include: { tournament: true, receipt: true, payment: true } }, rankings: { include: { tournament: true } }, teamMembers: { include: { team: true } } }
  });
}

async function updateProfile(id, data) {
  return prisma.user.update({ where: { id }, data });
}

module.exports = { findUserByEmail, findUserById, createUser, updateProfile };
