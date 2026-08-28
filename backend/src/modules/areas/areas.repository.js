const prisma = require("../../config/prisma");

module.exports = {
  findMany: (where) => prisma.area.findMany({ where, orderBy: { name: "asc" } }),
  findById: (id) => prisma.area.findUnique({ where: { id } }),
  create: (data) => prisma.area.create({ data }),
  update: (id, data) => prisma.area.update({ where: { id }, data }),
};
