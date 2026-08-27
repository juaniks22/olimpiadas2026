const prisma = require("../../config/prisma");

function callWhere(f) {
  const where = {};
  if (f.areaId) where.areaId = f.areaId;
  if (f.origin) where.origin = f.origin;
  if (f.type) where.type = f.type;
  if (f.from || f.to) {
    where.createdAt = { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) };
  }
  return where;
}

module.exports = {
  callWhere,
  calls: (f) =>
    prisma.call.findMany({
      where: callWhere(f),
      orderBy: { createdAt: "desc" },
      include: {
        area: true,
        createdBy: { select: { username: true } },
        eventForm: true,
      },
    }),
  countByType: (f) =>
    prisma.call.groupBy({ by: ["type"], where: callWhere(f), _count: { _all: true } }),
  countByOrigin: (f) =>
    prisma.call.groupBy({ by: ["origin"], where: callWhere(f), _count: { _all: true } }),
  crashCarts: () =>
    prisma.crashCart.findMany({
      orderBy: { name: "asc" },
      include: {
        stocks: { include: { crashCartItem: true } },
        reactivatedBy: { select: { username: true } },
      },
    }),
  consumptions: (f) =>
    prisma.crashCartConsumption.findMany({
      where:
        f.from || f.to
          ? { consumedAt: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) } }
          : {},
      include: { crashCartItem: true, crashCart: true, call: true },
      orderBy: { consumedAt: "desc" },
    }),
};
