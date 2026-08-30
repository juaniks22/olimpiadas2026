// Equipo de respuesta: posiciones configurables + catálogo reusable de personal (StaffMember).
// El personal NO tiene cuenta de login: son datos descriptivos del evento (Mitchell et al., 2019).
const AppError = require("../../utils/AppError");
const { requireFields, parseBool, ensure, ensureValidDni } = require("../../utils/validate");
const repo = require("./responseTeam.repository");

const STAFF_NAME_MAX_LENGTH = 30;
const POSITION_NAME_MAX_LENGTH = 30;

function ensureValidPositionName(name) {
  ensure(
    typeof name === "string" && name.trim().length > 0 && name.trim().length <= POSITION_NAME_MAX_LENGTH,
    `name debe tener entre 1 y ${POSITION_NAME_MAX_LENGTH} caracteres`
  );
}

// ---------- Posiciones ----------
async function listPositions(query) {
  const where = {};
  const isActive = parseBool(query.isActive);
  if (isActive !== undefined) where.isActive = isActive;
  return repo.positions.findMany(where);
}

async function createPosition(body) {
  requireFields(body, ["name"]);
  ensureValidPositionName(body.name);
  return repo.positions.create({ name: body.name });
}

async function updatePosition(id, body) {
  if (!(await repo.positions.findById(id))) throw new AppError(404, "Posición no encontrada");
  const data = {};
  if (body.name !== undefined) {
    ensureValidPositionName(body.name);
    data.name = body.name;
  }
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
  ensureValidDni(body.dni, "dni");
  ensure(body.name.trim().length > 0 && body.name.trim().length <= STAFF_NAME_MAX_LENGTH,
    `name debe tener entre 1 y ${STAFF_NAME_MAX_LENGTH} caracteres`);
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
  if (body.dni !== undefined) ensureValidDni(body.dni, "dni");
  if (body.name !== undefined) {
    ensure(body.name.trim().length > 0 && body.name.trim().length <= STAFF_NAME_MAX_LENGTH,
      `name debe tener entre 1 y ${STAFF_NAME_MAX_LENGTH} caracteres`);
  }
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
