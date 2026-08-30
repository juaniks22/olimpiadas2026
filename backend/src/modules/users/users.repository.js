const prisma = require("../../config/prisma");

// Proyección sin passwordHash, para todo lo que sale hacia el cliente.
const publicSelect = {
  id: true,
  username: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

// Objeto de mapeo de funciones Prisma para aislar el acceso a la DB.
module.exports = {
  publicSelect,
  // Obtiene múltiples usuarios filtrados y ordenados por fecha de creación descendente.
  findMany: (where) =>
    prisma.user.findMany({ where, select: publicSelect, orderBy: { createdAt: "desc" } }),
  // Obtiene el registro completo de un usuario por ID (incluye el hash de contraseña, usado internamente).
  findById: (id) => prisma.user.findUnique({ where: { id } }),
  // Obtiene el perfil público de un usuario por ID (excluye datos sensibles).
  findByIdPublic: (id) => prisma.user.findUnique({ where: { id }, select: publicSelect }),
  // Busca por nombre de usuario (usado para validación de unicidad y login).
  findByUsername: (username) => prisma.user.findUnique({ where: { username } }),
  // Encuentra el primer usuario que coincide con un rol dado (usado para verificar si hay Admin).
  findFirstByRole: (role) => prisma.user.findFirst({ where: { role } }),
  // Crea un usuario en base de datos.
  create: (data) => prisma.user.create({ data, select: publicSelect }),
  // Actualiza los datos de un usuario existente.
  update: (id, data) => prisma.user.update({ where: { id }, data, select: publicSelect }),
  // Elimina una cuenta. (calls.createdByUserId es ON DELETE RESTRICT: el Service valida antes).
  remove: (id) => prisma.user.delete({ where: { id } }),
  // Cantidad de llamados cargados por esta cuenta (bloquea el borrado si hay).
  countCalls: (userId) => prisma.call.count({ where: { createdByUserId: userId } }),
};
