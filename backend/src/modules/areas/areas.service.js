// Áreas: catálogo configurable simple (CP-1). Sin infraestructura fija, sin vínculo a User/Shift.
const AppError = require("../../utils/AppError");
const { requireFields, parseBool } = require("../../utils/validate");
const repo = require("./areas.repository");

async function list(query) {
  const where = {};
  const isActive = parseBool(query.isActive);
  if (isActive !== undefined) where.isActive = isActive;
  return repo.findMany(where);
}

async function getById(id) {
  const area = await repo.findById(id);
  if (!area) throw new AppError(404, "Área no encontrada");
  return area;
}

async function create(body) {
  requireFields(body, ["name"]);
  return repo.create({ name: body.name });
}

async function update(id, body) {
  await getById(id);
  const data = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (!Object.keys(data).length) throw new AppError(400, "Nada para actualizar");
  return repo.update(id, data);
}

async function deactivate(id) {
  await getById(id);
  return repo.update(id, { isActive: false });
}

module.exports = { list, getById, create, update, deactivate };
