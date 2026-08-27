// Crea la cuenta Administradora única. No hay endpoint para esto: el Admin siembra al resto.
//   npm run seed:admin
// Usa ADMIN_USERNAME / ADMIN_PASSWORD del .env. Si no hay ADMIN_PASSWORD, autogenera una.
require("dotenv/config");
const prisma = require("../src/config/prisma");
const password = require("../src/utils/password");
const env = require("../src/config/env");

async function main() {
  const existing = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existing) {
    console.log(`Ya existe una cuenta ADMIN ("${existing.username}"). Nada que hacer.`);
    return;
  }

  const username = env.adminUsername;
  const plain = env.adminPassword || password.generate();
  password.assertPolicy(plain);

  const admin = await prisma.user.create({
    data: { username, passwordHash: await password.hash(plain), role: "ADMIN" },
  });

  console.log("Cuenta ADMIN creada:");
  console.log(`  usuario:     ${admin.username}`);
  console.log(`  contraseña:  ${plain}`);
  console.log("Guardala ahora: no se vuelve a mostrar.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
