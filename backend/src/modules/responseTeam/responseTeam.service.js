// Equipo de respuesta: posiciones configurables + catálogo reusable de personal (StaffMember).
// El personal NO tiene cuenta de login: son datos descriptivos del evento (Mitchell et al., 2019).
const AppError = require("../../utils/AppError");
const { requireFields, parseBool } = require("../../utils/validate");
const repo = require("./responseTeam.repository");

// ---------- Posiciones ----------
async function listPositions(query) {
  const where = {};
  const isActive = parseBool(query.isActive);
  if (isActive !== undefined) where.isActive = isActive;
  return repo.positions.findMany(where);
}

async function createPosition(body) {
  requireFields(body, ["name"]);
  return repo.positions.create({ name: body.name });
}

async function updatePosition(id, body) {
  if (!(await repo.positions.findById(id))) throw new AppError(404, "Posición no encontrada");
  const data = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (!Object.keys(data).length) throw new AppError(400, "Nada para actualizar");
  return repo.positions.update(id, data);
}

// ---------- Personal (StaffMember) ----------
async function listStaff(query) {
  const where = {};
  const isActive = parseBool(query.isActive);
  if (isActive !== undefined) where.isActive = isActive;
  return repo.staff.findMany(where);
}

async function getStaff(id) {
  const staff = await repo.staff.findById(id);
  if (!staff) throw new AppError(404, "Integrante no encontrado");
  return staff;
}

async function createStaff(body) {
  requireFields(body, ["dni", "name"]);
  if (await repo.staff.findByDni(body.dni)) {
    throw new AppError(409, "Ya existe un integrante con ese DNI");
  }
  return repo.staff.create({
    dni: body.dni,
    name: body.name,
    role: body.role ?? null,
    certifications: body.certifications ?? null,
  });
}

async function updateStaff(id, body) {
  await getStaff(id);
  const data = {};
  for (const field of ["dni", "name", "role", "certifications"]) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (!Object.keys(data).length) throw new AppError(400, "Nada para actualizar");
  return repo.staff.update(id, data);
}

module.exports = {
  listPositions,
  createPosition,
  updatePosition,
  listStaff,
  getStaff,
  createStaff,
  updateStaff,
};
