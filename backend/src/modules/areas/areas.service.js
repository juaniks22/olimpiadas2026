// Áreas: catálogo configurable simple (CP-1). Sin infraestructura fija, sin vínculo a User/Shift.
// Regla: toda área nace con su carro de paro estándar (28 medicamentos). No hay área sin carro.
const AppError = require("../../utils/AppError");
const { requireFields, parseBool } = require("../../utils/validate");
const repo = require("./areas.repository");
const crashCartsService = require("../crashCarts/crashCarts.service");

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
  const area = await repo.create({ name: body.name });
  try {
    // Toda área se crea con su carro de paro estándar.
    await crashCartsService.createStandardCartForArea(area);
  } catch (err) {
    // Compensación: si falla el carro, no dejar el área a medias.
    await repo.removeWithCart(area.id).catch(() => {});
    throw err;
  }
  return area;
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

// Borrado real. Como toda área tiene su carro estándar, el borrado se lleva también ese carro
// (ítems + carro). Se bloquea (409) si hay historial que no se puede perder:
//  - llamados (Call) del área
//  - consumos registrados en el carro de paro del área
async function remove(id) {
  await getById(id);
  const [calls, consumos] = await Promise.all([
    repo.countCalls(id),
    repo.countCartConsumptions(id),
  ]);
  if (calls > 0) {
    throw new AppError(409, "No se puede eliminar el área: tiene llamados asociados", { calls });
  }
  if (consumos > 0) {
    throw new AppError(409, "No se puede eliminar el área: su carro de paro tiene consumos registrados", {
      consumos,
    });
  }
  await repo.removeWithCart(id);
  return { ok: true };
}

module.exports = { list, getById, create, update, deactivate, remove };
