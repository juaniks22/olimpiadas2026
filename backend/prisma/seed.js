// Seed de medicamentos de referencia para el carro de paro.
//
// Nota de modelo: con la rev. del 28 ago, CrashCartItem es POR CARRO (lleva crashCartId +
// positionId obligatorios). Por eso el seed necesita un contenedor: crea un Area, un CrashCart
// y una posición global "Medicación" de referencia, todos idempotentes (upsert por nombre),
// y carga los 28 medicamentos como composición estándar de ese carro.
//
// La lista canónica de 28 medicamentos vive en src/modules/crashCarts/defaultComposition.js
// (misma fuente que usa POST /crash-carts?loadDefaultComposition).
//
//   npm run seed:meds     (o: npx prisma db seed)
const prisma = require("../src/config/prisma");
const {
  DEFAULT_MEDICATIONS,
  DEFAULT_MEDICATION_POSITION,
  DEFAULT_STANDARD_QUANTITY,
} = require("../src/modules/crashCarts/defaultComposition");

const AREA_NAME = "Área de referencia (seed)";
const CART_NAME = "Carro de referencia (seed)";

async function main() {
  const area = await prisma.area.upsert({
    where: { name: AREA_NAME },
    update: {},
    create: { name: AREA_NAME },
  });

  const position = await prisma.crashCartPosition.upsert({
    where: { name: DEFAULT_MEDICATION_POSITION },
    update: {},
    create: { name: DEFAULT_MEDICATION_POSITION },
  });

  const cart = await prisma.crashCart.upsert({
    where: { name: CART_NAME },
    update: { areaId: area.id },
    create: { name: CART_NAME, areaId: area.id },
  });

  const inUse = await prisma.crashCartConsumption.count({ where: { crashCartId: cart.id } });
  if (inUse > 0) {
    console.log(
      `El carro "${CART_NAME}" ya tiene ${inUse} consumo(s) registrado(s): no se reescribe su composición.`
    );
    return;
  }
  await prisma.crashCartItem.deleteMany({ where: { crashCartId: cart.id } });
  await prisma.crashCartItem.createMany({
    data: DEFAULT_MEDICATIONS.map((m) => ({
      crashCartId: cart.id,
      positionId: position.id,
      name: m.name,
      standardQuantity: DEFAULT_STANDARD_QUANTITY,
      unit: null,
      category: m.category,
    })),
  });

  const byCategory = DEFAULT_MEDICATIONS.reduce((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1;
    return acc;
  }, {});

  console.log(`Seed OK: ${DEFAULT_MEDICATIONS.length} medicamentos cargados en "${CART_NAME}" (área "${AREA_NAME}", posición "${DEFAULT_MEDICATION_POSITION}").`);
  console.log("Por categoría:", JSON.stringify(byCategory));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
