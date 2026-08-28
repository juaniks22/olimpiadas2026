const prisma = require("../../config/prisma");

// Proyección sin passwordHash, para todo lo que sale hacia el cliente.
const publicSelect = {
  id: true,
  username: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

module.exports = {
  publicSelect,
  findMany: (where) =>
    prisma.user.findMany({ where, select: publicSelect, orderBy: { createdAt: "desc" } }),
  findById: (id) => prisma.user.findUnique({ where: { id } }),
  findByIdPublic: (id) => prisma.user.findUnique({ where: { id }, select: publicSelect }),
  findByUsername: (username) => prisma.user.findUnique({ where: { username } }),
  findFirstByRole: (role) => prisma.user.findFirst({ where: { role } }),
  create: (data) => prisma.user.create({ data, select: publicSelect }),
  update: (id, data) => prisma.user.update({ where: { id }, data, select: publicSelect }),
};
