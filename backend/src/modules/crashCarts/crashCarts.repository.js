const prisma = require("../../config/prisma");

module.exports = {
  // -------- Catálogo estándar: posiciones --------
  positions: {
    findMany: (where) =>
      prisma.crashCartPosition.findMany({ where, orderBy: { name: "asc" }, include: { items: true } }),
    findById: (id) => prisma.crashCartPosition.findUnique({ where: { id } }),
    create: (data) => prisma.crashCartPosition.create({ data }),
    update: (id, data) => prisma.crashCartPosition.update({ where: { id }, data }),
  },

  // -------- Catálogo estándar: ítems (qué debe tener cada carro y en qué cantidad) --------
  items: {
    findMany: (where) =>
      prisma.crashCartItem.findMany({ where, orderBy: { name: "asc" }, include: { position: true } }),
    findById: (id) => prisma.crashCartItem.findUnique({ where: { id } }),
    // Ítems cuyo puesto está activo: es el estándar vigente al crear un carro nuevo.
    findFromActivePositions: () =>
      prisma.crashCartItem.findMany({ where: { position: { isActive: true } } }),
    create: (data) => prisma.crashCartItem.create({ data }),
    update: (id, data) => prisma.crashCartItem.update({ where: { id }, data }),
  },

  // -------- Instancias físicas de carro + stock real --------
  carts: {
    findMany: () => prisma.crashCart.findMany({ orderBy: { name: "asc" } }),
    findById: (id) => prisma.crashCart.findUnique({ where: { id } }),
    findDetail: (id) =>
      prisma.crashCart.findUnique({
        where: { id },
        include: {
          stocks: { include: { crashCartItem: { include: { position: true } } } },
          consumptions: {
            include: { crashCartItem: true, call: true },
            orderBy: { consumedAt: "desc" },
          },
          reactivatedBy: { select: { id: true, username: true } },
        },
      }),
    update: (id, data) => prisma.crashCart.update({ where: { id }, data }),
    consumptions: (id) =>
      prisma.crashCartConsumption.findMany({
        where: { crashCartId: id },
        include: { crashCartItem: true, call: true },
        orderBy: { consumedAt: "desc" },
      }),
    stockFor: (crashCartId, crashCartItemId) =>
      prisma.crashCartItemStock.findUnique({
        where: { crashCartId_crashCartItemId: { crashCartId, crashCartItemId } },
      }),

    // Crea el carro y siembra su stock con la cantidad estándar de cada ítem. Todo o nada.
    createWithStock: (name, stockRows) =>
      prisma.$transaction(async (tx) => {
        const cart = await tx.crashCart.create({ data: { name } });
        if (stockRows.length) {
          await tx.crashCartItemStock.createMany({
            data: stockRows.map((r) => ({
              crashCartId: cart.id,
              crashCartItemId: r.crashCartItemId,
              intactUnitsRemaining: r.intactUnitsRemaining,
            })),
          });
        }
        return cart;
      }, { timeout: 20000, maxWait: 10000 }),

    // Reactivación (solo Admin): asume reposición TOTAL. Resetea todo el stock a estándar,
    // pasa a IN_SERVICE y registra quién/cuándo. Sin payload de cantidades.
    reactivate: (id, userId) =>
      prisma.$transaction(async (tx) => {
        const stocks = await tx.crashCartItemStock.findMany({
          where: { crashCartId: id },
          include: { crashCartItem: true },
        });
        for (const st of stocks) {
          await tx.crashCartItemStock.update({
            where: { id: st.id },
            data: { intactUnitsRemaining: st.crashCartItem.standardQuantity },
          });
        }
        return tx.crashCart.update({
          where: { id },
          data: { status: "IN_SERVICE", reactivatedAt: new Date(), reactivatedByUserId: userId },
        });
      }, { timeout: 20000, maxWait: 10000 }),
  },
};
