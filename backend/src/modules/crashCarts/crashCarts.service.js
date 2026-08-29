// Carro de paro (rev. 28 ago):
//  - Cada CrashCart pertenece a un Area (areaId obligatorio).
//  - CrashCartPosition: catálogo GLOBAL de slots (ej. "Medicación").
//  - CrashCartItem: composición estándar POR CARRO (crashCartId + positionId + standardQuantity + category).
//  - NO hay stock remanente en vivo. Solo composición estándar fija + historial de consumos.
//  - Cualquier consumo deja el carro entero OUT_OF_SERVICE (regla aplicada en calls.service).
//  - Reactivar es exclusivo del Admin, sin cantidades.
const AppError = require("../../utils/AppError");
const { requireFields, parseBool } = require("../../utils/validate");
const repo = require("./crashCarts.repository");
const areasRepo = require("../areas/areas.repository");
const {
  DEFAULT_MEDICATIONS,
  DEFAULT_MEDICATION_POSITION,
  DEFAULT_STANDARD_QUANTITY,
  MEDICATION_CATEGORIES,
} = require("./defaultComposition");

function assertNonNegativeInt(value, field) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new AppError(400, `${field} debe ser un entero >= 0`);
  return n;
}

// ---------- Catálogo global: posiciones ----------
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

// Composición estándar por defecto (28 medicamentos) — para preview en el frontend.
function getDefaultComposition() {
  return {
    position: DEFAULT_MEDICATION_POSITION,
    standardQuantity: DEFAULT_STANDARD_QUANTITY,
    categories: MEDICATION_CATEGORIES,
    items: DEFAULT_MEDICATIONS,
  };
}

// ---------- Composición estándar por carro: ítems ----------
async function listItems(query) {
  const where = {};
  if (query.crashCartId) where.crashCartId = query.crashCartId;
  if (query.positionId) where.positionId = query.positionId;
  if (query.category) where.category = query.category;
  return repo.items.findMany(where);
}

// Resuelve la posición: acepta positionId, o positionName (upsert), o cae en "Medicación".
async function resolvePositionId(body) {
  if (body.positionId) {
    if (!(await repo.positions.findById(body.positionId))) {
      throw new AppError(404, "La posición indicada no existe");
    }
    return body.positionId;
  }
  const name = body.positionName || DEFAULT_MEDICATION_POSITION;
  const position = await repo.positions.upsertByName(name);
  return position.id;
}

async function createItem(body) {
  requireFields(body, ["crashCartId", "name", "standardQuantity"]);
  if (!(await repo.carts.findById(body.crashCartId))) {
    throw new AppError(404, "El carro indicado no existe");
  }
  const positionId = await resolvePositionId(body);
  return repo.items.create({
    crashCartId: body.crashCartId,
    positionId,
    name: body.name,
    standardQuantity: assertNonNegativeInt(body.standardQuantity, "standardQuantity"),
    unit: body.unit ?? null,
    // `category` sigue existiendo en el modelo (lo usan el seed y los reportes),
    // pero ya no se gestiona desde la UI del stock: si no viene, cae en "Otros".
    category: body.category || "Otros",
  });
}

async function removeItem(id) {
  if (!(await repo.items.findById(id))) throw new AppError(404, "Ítem no encontrado");
  const used = await repo.items.countConsumptions(id);
  if (used > 0) {
    throw new AppError(409, "No se puede eliminar el ítem: tiene consumos registrados", { consumos: used });
  }
  await repo.items.remove(id);
  return { ok: true };
}

async function updateItem(id, body) {
  if (!(await repo.items.findById(id))) throw new AppError(404, "Ítem no encontrado");
  const data = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.unit !== undefined) data.unit = body.unit;
  if (body.category !== undefined) data.category = body.category;
  if (body.positionId !== undefined) {
    if (!(await repo.positions.findById(body.positionId))) {
      throw new AppError(404, "La posición indicada no existe");
    }
    data.positionId = body.positionId;
  }
  if (body.standardQuantity !== undefined) {
    data.standardQuantity = assertNonNegativeInt(body.standardQuantity, "standardQuantity");
  }
  if (!Object.keys(data).length) throw new AppError(400, "Nada para actualizar");
  return repo.items.update(id, data);
}

// ---------- Instancias físicas ----------
async function listCarts(query) {
  const where = {};
  if (query.areaId) where.areaId = query.areaId;
  return repo.carts.findMany(where);
}

async function getCart(id) {
  const cart = await repo.carts.findDetail(id);
  if (!cart) throw new AppError(404, "Carro no encontrado");
  return cart;
}

// Agrega los 28 medicamentos estándar a un carro.
async function addDefaultItems(crashCartId) {
  const position = await repo.positions.upsertByName(DEFAULT_MEDICATION_POSITION);
  await repo.items.createMany(
    DEFAULT_MEDICATIONS.map((m) => ({
      crashCartId,
      positionId: position.id,
      name: m.name,
      standardQuantity: DEFAULT_STANDARD_QUANTITY,
      unit: null,
      category: m.category,
    }))
  );
}

// Crea el carro de paro de un área CON su composición estándar. No existe "carro vacío":
// todo carro nace con los 28 medicamentos. Un solo carro por área.
async function createCart(body) {
  requireFields(body, ["name", "areaId"]);
  const area = await areasRepo.findById(body.areaId);
  if (!area) throw new AppError(404, "El área indicada no existe");
  if (!area.isActive) throw new AppError(400, "El área indicada está desactivada");
  if (await repo.carts.countByArea(body.areaId)) {
    throw new AppError(409, "El área ya tiene un carro de paro. Solo puede haber uno por área.");
  }

  const cart = await repo.carts.create({ name: body.name, areaId: body.areaId });
  await addDefaultItems(cart.id);
  return repo.carts.findDetail(cart.id);
}

// Usado por areas.service al crear un área: le arma su carro estándar de una.
async function createStandardCartForArea(area) {
  const cart = await repo.carts.create({ name: `Carro - ${area.name}`, areaId: area.id });
  await addDefaultItems(cart.id);
  return repo.carts.findDetail(cart.id);
}

// Repone la composición estándar en un carro EXISTENTE que quedó vacío (se borraron los ítems).
async function loadDefaultComposition(id) {
  const cart = await repo.carts.findById(id);
  if (!cart) throw new AppError(404, "Carro no encontrado");
  const current = await repo.items.findMany({ crashCartId: id });
  if (current.length > 0) {
    throw new AppError(409, "El carro ya tiene una composición cargada; quitá los ítems primero");
  }
  await addDefaultItems(id);
  return repo.carts.findDetail(id);
}

async function updateCart(id, body) {
  if (!(await repo.carts.findById(id))) throw new AppError(404, "Carro no encontrado");
  const data = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.areaId !== undefined) {
    const area = await areasRepo.findById(body.areaId);
    if (!area) throw new AppError(404, "El área indicada no existe");
    if (!area.isActive) throw new AppError(400, "El área indicada está desactivada");
    // Un solo carro por área: si el destino ya tiene uno (que no sea este), rechazar.
    const existing = await repo.carts.findMany({ areaId: body.areaId });
    if (existing.some((c) => c.id !== id)) {
      throw new AppError(409, "El área de destino ya tiene un carro de paro.");
    }
    data.areaId = body.areaId;
  }
  // El estado no se toca acá: baja por consumo (calls), alta por /reactivate.
  if (!Object.keys(data).length) throw new AppError(400, "Nada para actualizar");
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

async function deleteCart(id) {
  const cart = await repo.carts.findById(id);
  if (!cart) throw new AppError(404, "Carro no encontrado");
  const [consumos, eventos] = await Promise.all([
    repo.carts.countConsumptions(id),
    repo.carts.countEventForms(id),
  ]);
  if (consumos > 0) {
    throw new AppError(409, "No se puede eliminar el carro: tiene consumos registrados", { consumos });
  }
  if (eventos > 0) {
    throw new AppError(409, "No se puede eliminar el carro: está referenciado en eventos", { eventos });
  }
  await repo.carts.remove(id);
  return { ok: true };
}

module.exports = {
  listPositions,
  createPosition,
  updatePosition,
  getDefaultComposition,
  listItems,
  createItem,
  updateItem,
  removeItem,
  listCarts,
  getCart,
  createCart,
  createStandardCartForArea,
  loadDefaultComposition,
  updateCart,
  reactivate,
  listConsumptions,
  deleteCart,
};
