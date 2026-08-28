// Carga y validación de variables de entorno. Prisma no lee .env solo (ver prisma.config.ts),
// pero la API sí necesita dotenv acá.
require("dotenv/config");

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[env] Falta la variable de entorno obligatoria: ${name}`);
    process.exit(1);
  }
  return value;
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  // Sesión: expira a los 15 min de inactividad, sin refresh token (Documento de Visión CP-15).
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || null,
};
