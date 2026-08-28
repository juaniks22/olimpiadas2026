// Carro de paro (v2.3). Dos capas:
//  - Catálogo ESTÁNDAR global (posiciones + ítems con standardQuantity): qué debe tener un carro.
//  - Instancias físicas (lista libre, nombre en texto libre): carros reales, con stock propio.
// Estado (IN_SERVICE / OUT_OF_SERVICE) es del carro entero. Cualquier consumo lo deja
// OUT_OF_SERVICE (regla aplicada en calls.service). Solo el Admin reactiva.
const AppError = require("../../utils/AppError");
const { requireFields, parseBool } = require("../../utils/validate");
const repo = require("./crashCarts.repository");

function assertNonNegativeInt(value, field) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new AppError(400, `${field} debe ser un entero >= 0`);
  return n;
}

// ---------- Catálogo estándar: posiciones ----------
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

// ---------- Catálogo estándar: ítems ----------
async function listItems(query) {
  const where = {};
  if (query.positionId) where.positionId = query.positionId;
  return repo.items.findMany(where);
}

async function createItem(body) {
  requireFields(body, ["positionId", "name", "standardQuantity"]);
  if (!(await repo.positions.findById(body.positionId))) {
    throw new AppError(404, "La posición indicada no existe");
  }
  return repo.items.create({
    positionId: body.positionId,
    name: body.name,
    standardQuantity: assertNonNegativeInt(body.standardQuantity, "standardQuantity"),
    unit: body.unit ?? null,
  });
}

async function updateItem(id, body) {
  if (!(await repo.items.findById(id))) throw new AppError(404, "Ítem no encontrado");
  const data = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.unit !== undefined) data.unit = body.unit;
  if (body.standardQuantity !== undefined) {
    data.standardQuantity = assertNonNegativeInt(body.standardQuantity, "standardQuantity");
  }
  if (!Object.keys(data).length) throw new AppError(400, "Nada para actualizar");
  return repo.items.update(id, data);
}

// ---------- Instancias físicas ----------
async function listCarts() {
  return repo.carts.findMany();
}

async function getCart(id) {
  const cart = await repo.carts.findDetail(id);
  if (!cart) throw new AppError(404, "Carro no encontrado");
  return cart;
}

async function createCart(body) {
  requireFields(body, ["name"]);
  // Se siembra con el estándar vigente (ítems de posiciones activas).
  const items = await repo.items.findFromActivePositions();
  const stockRows = items.map((it) => ({
    crashCartItemId: it.id,
    intactUnitsRemaining: it.standardQuantity,
  }));
  return repo.carts.createWithStock(body.name, stockRows);
}

async function updateCart(id, body) {
  if (!(await repo.carts.findById(id))) throw new AppError(404, "Carro no encontrado");
  const data = {};
  if (body.name !== undefined) data.name = body.name;
  // El estado no se toca acá: baja por consumo (calls), alta por /reactivate.
  if (!Object.keys(data).length) throw new AppError(400, "Solo se puede editar el nombre del carro");
  return repo.carts.update(id, data);
}

async function reactivate(id, userId) {
  const cart = await repo.carts.findById(id);
  if (!cart) throw new AppError(404, "Carro no encontrado");
  if (cart.status === "IN_SERVICE") throw new AppError(409, "El carro ya está En operación");
  return repo.carts.reactivate(id, userId);
}

async function listConsumptions(id) {
  if (!(await repo.carts.findById(id))) throw new AppError(404, "Carro no encontrado");
  return repo.carts.consumptions(id);
}

module.exports = {
  listPositions,
  createPosition,
  updatePosition,
  listItems,
  createItem,
  updateItem,
  listCarts,
  getCart,
  createCart,
  updateCart,
  reactivate,
  listConsumptions,
};
