const prisma = require("../../config/prisma");

module.exports = {
  // -------- Catálogo GLOBAL de posiciones (slots reutilizables) --------
  positions: {
    findMany: (where) =>
      prisma.crashCartPosition.findMany({ where, orderBy: { name: "asc" } }),
    findById: (id) => prisma.crashCartPosition.findUnique({ where: { id } }),
    findByName: (name) => prisma.crashCartPosition.findUnique({ where: { name } }),
    create: (data) => prisma.crashCartPosition.create({ data }),
    update: (id, data) => prisma.crashCartPosition.update({ where: { id }, data }),
    upsertByName: (name) =>
      prisma.crashCartPosition.upsert({ where: { name }, update: {}, create: { name } }),
  },

  // -------- Composición estándar POR CARRO (ítems) --------
  items: {
    findMany: (where) =>
      prisma.crashCartItem.findMany({
        where,
        orderBy: [{ category: "asc" }, { name: "asc" }],
        include: { position: true },
      }),
    findById: (id) => prisma.crashCartItem.findUnique({ where: { id } }),
    findByIds: (ids) => prisma.crashCartItem.findMany({ where: { id: { in: ids } } }),
    create: (data) => prisma.crashCartItem.create({ data, include: { position: true } }),
    createMany: (rows) => prisma.crashCartItem.createMany({ data: rows }),
    update: (id, data) =>
      prisma.crashCartItem.update({ where: { id }, data, include: { position: true } }),
    remove: (id) => prisma.crashCartItem.delete({ where: { id } }),
    countConsumptions: (id) => prisma.crashCartConsumption.count({ where: { crashCartItemId: id } }),
  },

  // -------- Instancias físicas de carro (atadas a un Area) --------
  carts: {
    findMany: (where) => prisma.crashCart.findMany({ where, orderBy: { name: "asc" }, include: { area: true } }),
    findById: (id) => prisma.crashCart.findUnique({ where: { id } }),
    // El carro más antiguo del área (su "carro estándar"), con sus ítems. Sirve de plantilla
    // para los carros nuevos que se asignan a esa área.
    templateForArea: (areaId, excludeCartId) =>
      prisma.crashCart.findFirst({
        where: { areaId, ...(excludeCartId ? { id: { not: excludeCartId } } : {}) },
        orderBy: { createdAt: "asc" },
        include: { items: true },
      }),
    findDetail: (id) =>
      prisma.crashCart.findUnique({
        where: { id },
        include: {
          area: true,
          items: { orderBy: [{ category: "asc" }, { name: "asc" }], include: { position: true } },
          consumptions: {
            include: { crashCartItem: true, call: true },
            orderBy: { consumedAt: "desc" },
          },
          reactivatedBy: { select: { id: true, username: true } },
        },
      }),
    create: (data) => prisma.crashCart.create({ data, include: { area: true } }),
    update: (id, data) => prisma.crashCart.update({ where: { id }, data, include: { area: true } }),
    consumptions: (id) =>
      prisma.crashCartConsumption.findMany({
        where: { crashCartId: id },
        include: { crashCartItem: true, call: true },
        orderBy: { consumedAt: "desc" },
      }),

    // Reactivación (solo Admin): sin cantidades, solo confirma reposición total y vuelve a IN_SERVICE.
    // Ya no hay stock que resetear (el modelo no trackea remanente).
    reactivate: (id, userId) =>
      prisma.crashCart.update({
        where: { id },
        data: { status: "IN_SERVICE", reactivatedAt: new Date(), reactivatedByUserId: userId },
        include: { area: true },
      }),

    // Contadores de dependencias (para validar antes de borrar).
    countConsumptions: (id) => prisma.crashCartConsumption.count({ where: { crashCartId: id } }),
    countEventForms: (id) => prisma.eventForm.count({ where: { crashCartId: id } }),

    // Borrado real: elimina ítems y luego el carro, en transacción.
    remove: (id) =>
      prisma.$transaction(async (tx) => {
        await tx.crashCartItem.deleteMany({ where: { crashCartId: id } });
        await tx.crashCart.delete({ where: { id } });
      }),
  },
};
