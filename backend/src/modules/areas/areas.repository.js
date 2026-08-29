const prisma = require("../../config/prisma");

module.exports = {
  findMany: (where) => prisma.area.findMany({ where, orderBy: { name: "asc" } }),
  findById: (id) => prisma.area.findUnique({ where: { id } }),
  create: (data) => prisma.area.create({ data }),
  update: (id, data) => prisma.area.update({ where: { id }, data }),
  countCalls: (areaId) => prisma.call.count({ where: { areaId } }),
  countCrashCarts: (areaId) => prisma.crashCart.count({ where: { areaId } }),
  // Consumos registrados en el carro de paro del área (historial que no se puede perder).
  countCartConsumptions: (areaId) =>
    prisma.crashCartConsumption.count({ where: { crashCart: { areaId } } }),

  // Borra el área junto con su carro de paro estándar (ítems + carro). En transacción.
  // El caller ya validó que no haya Calls ni consumos.
  removeWithCart: (areaId) =>
    prisma.$transaction(async (tx) => {
      const carts = await tx.crashCart.findMany({ where: { areaId }, select: { id: true } });
      const cartIds = carts.map((c) => c.id);
      if (cartIds.length) {
        await tx.crashCartItem.deleteMany({ where: { crashCartId: { in: cartIds } } });
        await tx.crashCart.deleteMany({ where: { id: { in: cartIds } } });
      }
      await tx.area.delete({ where: { id: areaId } });
    }),
};
