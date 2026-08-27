const prisma = require("../../config/prisma");

module.exports = {
  positions: {
    findMany: (where) =>
      prisma.responseTeamPosition.findMany({ where, orderBy: { name: "asc" } }),
    findById: (id) => prisma.responseTeamPosition.findUnique({ where: { id } }),
    findByIds: (ids) => prisma.responseTeamPosition.findMany({ where: { id: { in: ids } } }),
    create: (data) => prisma.responseTeamPosition.create({ data }),
    update: (id, data) => prisma.responseTeamPosition.update({ where: { id }, data }),
  },
  staff: {
    findMany: (where) => prisma.staffMember.findMany({ where, orderBy: { name: "asc" } }),
    findById: (id) => prisma.staffMember.findUnique({ where: { id } }),
    findByIds: (ids) => prisma.staffMember.findMany({ where: { id: { in: ids } } }),
    findByDni: (dni) => prisma.staffMember.findUnique({ where: { dni } }),
    create: (data) => prisma.staffMember.create({ data }),
    update: (id, data) => prisma.staffMember.update({ where: { id }, data }),
  },
};
