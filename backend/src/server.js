const app = require("./app");
const env = require("./config/env");
const prisma = require("./config/prisma");

const server = app.listen(env.port, () => {
  console.log(`[blue-code] API escuchando en http://localhost:${env.port}`);
});

// Manejador de apagado elegante (graceful shutdown).
// Cierra el servidor HTTP de Express y desconecta limpiamente el cliente de Prisma de la base de datos
// al recibir señales del SO (SIGINT/SIGTERM), como por ejemplo al hacer Ctrl+C o cuando Railway reinicia el contenedor.
function shutdown(signal) {
  console.log(`\n[blue-code] ${signal} recibido, cerrando...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

["SIGINT", "SIGTERM"].forEach((signal) => process.on(signal, () => shutdown(signal)));
