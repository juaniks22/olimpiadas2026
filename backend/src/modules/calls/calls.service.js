// Llamado / Código Azul. El Jefe de Piso sube la planilla YA firmada en papel de un evento
// cerrado; el sistema guarda quién la subió (createdByUserId) y cuándo.
//
// Reglas clave:
//  - Inmutable: solo POST y GET. Sin PUT/PATCH/DELETE.
//  - Visibilidad GENERIC: filtro por AUTORÍA (createdByUserId), no por área. Se aplica acá.
//  - POST /calls es transaccional: Call + EventForm + defibrillations + drugs + teamAssignments
//    + crashCartConsumptions. Todo o nada.
//  - Cualquier consumo del carro lo deja OUT_OF_SERVICE (lo ejecuta el repository dentro de la tx).
const AppError = require("../../utils/AppError");
const { requireFields, ensure, isEnum, parseDate } = require("../../utils/validate");
const repo = require("./calls.repository");
const areasRepo = require("../areas/areas.repository");
const rtRepo = require("../responseTeam/responseTeam.repository");
const cartsRepo = require("../crashCarts/crashCarts.repository");

const CALL_TYPES = ["NORMAL", "EMERGENCY"];
const CALL_ORIGINS = ["INTRA_HOSPITAL", "EXTRA_HOSPITAL"];
const PATIENT_ID_TYPES = ["DNI", "TEMPORARY_ID", "NN"];

function buildEventForm(input) {
  requireFields(input, ["patientIdentificationType"]);
  ensure(
    isEnum(input.patientIdentificationType, PATIENT_ID_TYPES),
    `patientIdentificationType debe ser uno de: ${PATIENT_ID_TYPES.join(", ")}`
  );
  if (input.patientIdentificationType === "DNI") {
    ensure(!!input.patientDni, "patientDni es obligatorio cuando la identificación es DNI");
  }
  if (input.patientIdentificationType === "TEMPORARY_ID") {
    ensure(
      !!input.patientTemporaryId,
      "patientTemporaryId es obligatorio cuando la identificación es TEMPORARY_ID"
    );
  }

  return {
    patientIdentificationType: input.patientIdentificationType,
    patientDni: input.patientDni ?? null,
    patientTemporaryId: input.patientTemporaryId ?? null,
    patientSex: input.patientSex ?? null,
    patientAge: input.patientAge ?? null,
    admissionDate: parseDate(input.admissionDate, "admissionDate") ?? null,
    timeSinceDiscoveryMinutes: input.timeSinceDiscoveryMinutes ?? null,
    callReceivedAt: parseDate(input.callReceivedAt, "callReceivedAt") ?? null,
    teamArrivalAt: parseDate(input.teamArrivalAt, "teamArrivalAt") ?? null,
    cprStartedAt: parseDate(input.cprStartedAt, "cprStartedAt") ?? null,
    returnOfSpontaneousCirculationAt:
      parseDate(input.returnOfSpontaneousCirculationAt, "returnOfSpontaneousCirculationAt") ?? null,
    eventEndedAt: parseDate(input.eventEndedAt, "eventEndedAt") ?? null,
    airwayManagement: input.airwayManagement ?? null,
    venousAccess: input.venousAccess ?? null,
    postResuscitationStatus: input.postResuscitationStatus ?? null,
    suspensionCause: input.suspensionCause ?? null,
    crashCartId: input.crashCartId ?? null,
  };
}

function normalizeDefibrillations(list) {
  return list.map((d, i) => {
    ensure(Number.isInteger(d.sequenceNumber), `defibrillations[${i}].sequenceNumber debe ser entero`);
    const performedAt = parseDate(d.performedAt, `defibrillations[${i}].performedAt`);
    ensure(!!performedAt, `defibrillations[${i}].performedAt es obligatorio`);
    return {
      sequenceNumber: d.sequenceNumber,
      performedAt,
      energyDelivered: d.energyDelivered ?? null,
      rhythm: d.rhythm ?? null,
    };
  });
}

function normalizeDrugs(list) {
  return list.map((d, i) => {
    ensure(!!d.drugName, `drugsAdministered[${i}].drugName es obligatorio`);
    ensure(typeof d.dose === "number", `drugsAdministered[${i}].dose debe ser numérico`);
    ensure(!!d.unit, `drugsAdministered[${i}].unit es obligatorio`);
    const administeredAt = parseDate(d.administeredAt, `drugsAdministered[${i}].administeredAt`);
    ensure(!!administeredAt, `drugsAdministered[${i}].administeredAt es obligatorio`);
    return {
      drugName: d.drugName,
      dose: d.dose,
      unit: d.unit,
      route: d.route ?? null,
      administeredAt,
    };
  });
}

async function validateTeamAssignments(list) {
  if (!list.length) return list;
  list.forEach((a, i) => {
    ensure(!!a.positionId, `teamAssignments[${i}].positionId es obligatorio`);
    ensure(!!a.staffMemberId, `teamAssignments[${i}].staffMemberId es obligatorio`);
  });
  const positionIds = [...new Set(list.map((a) => a.positionId))];
  const staffIds = [...new Set(list.map((a) => a.staffMemberId))];

  const positions = await rtRepo.positions.findByIds(positionIds);
  if (positions.length !== positionIds.length) {
    throw new AppError(400, "Alguna posición del equipo de respuesta no existe");
  }
  const staff = await rtRepo.staff.findByIds(staffIds);
  if (staff.length !== staffIds.length) {
    throw new AppError(400, "Algún integrante del equipo de respuesta no existe");
  }
  return list.map((a) => ({ positionId: a.positionId, staffMemberId: a.staffMemberId }));
}

async function validateConsumptions(list, crashCartId) {
  if (!list.length) return list;
  ensure(!!crashCartId, "Si hay consumos, eventForm.crashCartId es obligatorio");

  const cart = await cartsRepo.carts.findById(crashCartId);
  if (!cart) throw new AppError(404, "El carro de paro indicado no existe");
  if (cart.status !== "IN_SERVICE") {
    throw new AppError(409, "El carro de paro está Fuera de servicio y no puede seleccionarse");
  }

  // Validar que cada ítem exista y pertenezca a ESTE carro (composición estándar por carro).
  const itemIds = [...new Set(list.map((c) => c.crashCartItemId).filter(Boolean))];
  const items = await cartsRepo.items.findByIds(itemIds);
  const itemsById = new Map(items.map((it) => [it.id, it]));

  const normalized = [];
  for (const [i, cons] of list.entries()) {
    ensure(!!cons.crashCartItemId, `crashCartConsumptions[${i}].crashCartItemId es obligatorio`);
    ensure(
      Number.isInteger(cons.quantity) && cons.quantity > 0,
      `crashCartConsumptions[${i}].quantity debe ser un entero > 0`
    );
    const item = itemsById.get(cons.crashCartItemId);
    if (!item || item.crashCartId !== crashCartId) {
      throw new AppError(400, `El ítem ${cons.crashCartItemId} no pertenece al carro indicado`);
    }
    normalized.push({ crashCartItemId: cons.crashCartItemId, quantity: cons.quantity });
  }
  return normalized;
}

async function create(user, body) {
  requireFields(body, ["type", "origin", "areaId", "eventForm"]);
  ensure(isEnum(body.type, CALL_TYPES), `type debe ser uno de: ${CALL_TYPES.join(", ")}`);
  ensure(isEnum(body.origin, CALL_ORIGINS), `origin debe ser uno de: ${CALL_ORIGINS.join(", ")}`);

  const area = await areasRepo.findById(body.areaId);
  if (!area) throw new AppError(404, "El área indicada no existe");
  if (!area.isActive) throw new AppError(400, "El área indicada está desactivada");

  const eventForm = buildEventForm(body.eventForm || {});

  const defibrillations = normalizeDefibrillations(
    Array.isArray(body.defibrillations) ? body.defibrillations : []
  );
  const drugsAdministered = normalizeDrugs(
    Array.isArray(body.drugsAdministered) ? body.drugsAdministered : []
  );
  const teamAssignments = await validateTeamAssignments(
    Array.isArray(body.teamAssignments) ? body.teamAssignments : []
  );
  const crashCartConsumptions = await validateConsumptions(
    Array.isArray(body.crashCartConsumptions) ? body.crashCartConsumptions : [],
    eventForm.crashCartId
  );

  // Se referencia un carro sin consumos: al menos verificar que exista.
  if (eventForm.crashCartId && !crashCartConsumptions.length) {
    if (!(await cartsRepo.carts.findById(eventForm.crashCartId))) {
      throw new AppError(404, "El carro de paro indicado no existe");
    }
  }

  return repo.createGraph({
    type: body.type,
    origin: body.origin,
    areaId: body.areaId,
    createdByUserId: user.id,
    eventForm,
    defibrillations,
    drugsAdministered,
    teamAssignments,
    crashCartConsumptions,
  });
}

async function list(user, query) {
  const where = {};

  if (user.role === "GENERIC") {
    // Filtro por AUTORÍA, no por área. Dos Jefes de Piso de la misma área no se ven entre sí.
    where.createdByUserId = user.id;
  } else {
    if (query.areaId) where.areaId = query.areaId;
    if (query.type) {
      ensure(isEnum(query.type, CALL_TYPES), `type inválido`);
      where.type = query.type;
    }
    if (query.origin) {
      ensure(isEnum(query.origin, CALL_ORIGINS), `origin inválido`);
      where.origin = query.origin;
    }
    const from = parseDate(query.dateFrom, "dateFrom");
    const to = parseDate(query.dateTo, "dateTo");
    if (from || to) {
      where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    }
  }

  // limit opcional (ej. GenericDashboard pide los últimos 5). Sin límite -> comportamiento previo.
  let take;
  if (query.limit !== undefined) {
    const n = Number(query.limit);
    if (Number.isInteger(n) && n > 0) take = n;
  }

  return repo.findMany(where, { take });
}

async function getById(user, id) {
  const call = await repo.findById(id);
  if (!call) throw new AppError(404, "Llamado no encontrado");
  if (user.role === "GENERIC" && call.createdByUserId !== user.id) {
    // No revelar que existe un llamado de otra cuenta.
    throw new AppError(404, "Llamado no encontrado");
  }
  return call;
}

module.exports = { create, list, getById };