// Quita el sufijo " (seed)" del área y del carro de referencia sembrados por prisma/seed.js.
// Idempotente: si ya no existen las filas con "(seed)", no hace nada.
//   node scripts/renameSeedRefs.js
const prisma = require("../src/config/prisma");

const RENAMES = [
  { model: "area", from: "Área de referencia (seed)", to: "Área de referencia" },
  { model: "crashCart", from: "Carro de referencia (seed)", to: "Carro de referencia" },
];

async function main() {
  for (const { model, from, to } of RENAMES) {
    const row = await prisma[model].findUnique({ where: { name: from } }).catch(() => null);
    if (!row) {
      console.log(`- "${from}": no existe, nada que renombrar.`);
      continue;
    }
    const clash = await prisma[model].findUnique({ where: { name: to } }).catch(() => null);
    if (clash) {
      console.log(`! "${to}" ya existe: se deja "${from}" como está para no romper la unicidad.`);
      continue;
    }
    await prisma[model].update({ where: { id: row.id }, data: { name: to } });
    console.log(`✓ "${from}"  ->  "${to}"`);
  }
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
