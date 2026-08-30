// Backfill: completa la columna `unit` de los CrashCartItem existentes que quedaron en NULL,
// tomando la unidad/presentación de la lista canónica de medicamentos por defecto.
// Solo toca filas con unit vacío y nombre que coincide con un medicamento estándar.
//   node scripts/backfillItemUnits.js
const prisma = require("../src/config/prisma");
const { DEFAULT_MEDICATIONS } = require("../src/modules/crashCarts/defaultComposition");

async function main() {
  let updated = 0;
  for (const med of DEFAULT_MEDICATIONS) {
    if (!med.unit) continue;
    const res = await prisma.crashCartItem.updateMany({
      where: { name: med.name, OR: [{ unit: null }, { unit: "" }] },
      data: { unit: med.unit },
    });
    if (res.count) {
      console.log(`  ${med.name}: ${res.count} ítem(s) -> "${med.unit}"`);
      updated += res.count;
    }
  }
  console.log(`\nListo. ${updated} ítem(s) actualizado(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
