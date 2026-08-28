const prisma = require("../../config/prisma");

function callWhere(f = {}) {
  const where = {};
  if (f.areaId) where.areaId = f.areaId;
  if (f.origin) where.origin = f.origin;
  if (f.type) where.type = f.type;
  if (f.from || f.to) {
    where.createdAt = {
      ...(f.from ? { gte: f.from } : {}),
      ...(f.to ? { lte: f.to } : {}),
    };
  }
  if (f.search && typeof f.search === "string" && f.search.trim()) {
    const s = f.search.trim();
    where.OR = [
      { area: { name: { contains: s, mode: "insensitive" } } },
      { createdBy: { username: { contains: s, mode: "insensitive" } } },
      { eventForm: { patientDni: { contains: s, mode: "insensitive" } } },
      { eventForm: { patientTemporaryId: { contains: s, mode: "insensitive" } } },
    ];
  }
  return where;
}

module.exports = {
  callWhere,
  calls: (f = {}) =>
    prisma.call.findMany({
      where: callWhere(f),
      orderBy: { createdAt: f.sortOrder === "asc" ? "asc" : "desc" },
      include: {
        area: true,
        createdBy: { select: { id: true, username: true } },
        eventForm: {
          include: {
            defibrillations: { orderBy: { sequenceNumber: "asc" } },
            drugsAdministered: { orderBy: { administeredAt: "asc" } },
            teamAssignments: { include: { position: true } },
            crashCart: { select: { id: true, name: true, status: true } },
          },
        },
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
  consumptions: (f = {}) =>
    prisma.crashCartConsumption.findMany({
      where:
        f.from || f.to
          ? { consumedAt: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) } }
          : {},
      include: { crashCartItem: true, crashCart: true, call: true },
      orderBy: { consumedAt: "desc" },
    }),
};

