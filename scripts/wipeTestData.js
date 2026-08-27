// Borra TODOS los datos de dominio de la base (áreas, llamados, carros, personal, etc.)
// y las cuentas GENERIC. Conserva la cuenta ADMIN sembrada.
// Sirve para dejar la base limpia después de pruebas.
//   node scripts/wipeTestData.js
const prisma = require("../src/config/prisma");

async function main() {
  // Orden: primero las tablas que referencian a otras (FKs).
  await prisma.crashCartConsumption.deleteMany();
  await prisma.crashCartItemStock.deleteMany();
  await prisma.responseTeamAssignment.deleteMany();
  await prisma.defibrillationRecord.deleteMany();
  await prisma.drugAdministered.deleteMany();
  await prisma.eventForm.deleteMany();
  await prisma.call.deleteMany();
  await prisma.crashCartItem.deleteMany();
  await prisma.crashCartPosition.deleteMany();
  await prisma.crashCart.deleteMany();
  await prisma.staffMember.deleteMany();
  await prisma.responseTeamPosition.deleteMany();
  await prisma.area.deleteMany();
  const removed = await prisma.user.deleteMany({ where: { role: "GENERIC" } });
  const admins = await prisma.user.count({ where: { role: "ADMIN" } });

  console.log(`Base limpia. Cuentas GENERIC borradas: ${removed.count}. Cuentas ADMIN conservadas: ${admins}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
