// Cliente Prisma único para toda la app (patrón singleton).
// Solo los Repositories lo importan; los Services nunca tocan Prisma directamente.
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;
