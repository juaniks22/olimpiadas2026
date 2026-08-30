// Reportes — EXCLUSIVO del Administrador (CP-6, 7, 8, 9, 14).
// El tiempo promedio de respuesta (CP-6) sale de la cronología: teamArrivalAt - callReceivedAt.
const { parseDate } = require("../../utils/validate");
const { toCsv } = require("../../utils/csv");
const { buildSimplePdf } = require("../../utils/pdf");
const repo = require("./reports.repository");

// El hospital opera en horario de Argentina (UTC-3). Los filtros de fecha que
// llegan del front son días "pelados" (YYYY-MM-DD) elegidos en calendario local.
// Si se los pasa tal cual a `new Date(...)`, JS los interpreta como medianoche
// UTC (no medianoche ART), y el fin de día se calculaba con setHours() usando
// la zona horaria del proceso Node (UTC en Railway). Eso desfasaba la ventana
// de filtrado ~3hs contra el día calendario real, colando/perdiendo llamados
// cercanos a la medianoche local. Se fija el offset explícitamente.
const ARGENTINA_OFFSET = "-03:00";

function parseFilterDate(val, field, isEndOfDay = false) {
  if (!val) return undefined;
  if (typeof val === "string" && val.length === 10) {
    // Fecha-solo (YYYY-MM-DD): se ancla al día calendario de Argentina, no al del servidor.
    const time = isEndOfDay ? "23:59:59.999" : "00:00:00.000";
    const parsed = new Date(`${val}T${time}${ARGENTINA_OFFSET}`);
    if (Number.isNaN(parsed.getTime())) {
      // Reutiliza el mensaje de error estándar del validador.
      return parseDate(val, field);
    }
    return parsed;
  }
  // Fecha con hora/timestamp explícito: se respeta tal cual la mandaron.
  return parseDate(val, field);
}

function parseFilters(query = {}) {
  return {
    areaId: query.areaId || undefined,
    origin: query.origin || undefined,
    type: query.type || undefined,
    search: query.search || undefined,
    sortOrder: query.sortOrder === "asc" ? "asc" : "desc",
    from: parseFilterDate(query.dateFrom || query.from, "dateFrom", false),
    to: parseFilterDate(query.dateTo || query.to, "dateTo", true),
  };
}

function averageResponseMinutes(calls) {
  const spans = [];
  for (const call of calls) {
    const ef = call.eventForm;
    if (ef && ef.callReceivedAt && ef.teamArrivalAt) {
      const minutes = (new Date(ef.teamArrivalAt) - new Date(ef.callReceivedAt)) / 60000;
      if (minutes >= 0) spans.push(minutes);
    }
  }
  if (!spans.length) return null;
  const avg = spans.reduce((a, b) => a + b, 0) / spans.length;
  return Math.round(avg * 10) / 10;
}

function flattenCalls(calls) {
  return calls.map((c) => {
    const ef = c.eventForm;
    let responseTime = null;
    if (ef && ef.callReceivedAt && ef.teamArrivalAt) {
      const mins = (new Date(ef.teamArrivalAt) - new Date(ef.callReceivedAt)) / 60000;
      if (mins >= 0) responseTime = Math.round(mins * 10) / 10;
    }

    let patientId = "NN";
    if (ef) {
      if (ef.patientDni) patientId = `DNI ${ef.patientDni}`;
      else if (ef.patientTemporaryId) patientId = `ID ${ef.patientTemporaryId}`;
      else if (ef.patientIdentificationType === "NN") patientId = "NN";
    }

    const hasRce = Boolean(ef && ef.returnOfSpontaneousCirculationAt);

    return {
      id: c.id,
      fecha: c.createdAt.toISOString(),
      tipo: c.type,
      origen: c.origin,
      area: c.area ? c.area.name : "",
      areaId: c.areaId,
      cargadoPor: c.createdBy ? c.createdBy.username : "",
      cargadoPorId: c.createdBy ? c.createdBy.id : "",
      pacienteId: patientId,
      pacienteTipo: ef?.patientIdentificationType || "",
      pacienteDni: ef?.patientDni || "",
      pacienteTemporaryId: ef?.patientTemporaryId || "",
      pacienteEdad: ef?.patientAge ?? null,
      pacienteSexo: ef?.patientSex || "",
      fechaIngreso: ef?.admissionDate ? ef.admissionDate.toISOString() : "",
      tiempoHallazgoMinutos: ef?.timeSinceDiscoveryMinutes ?? null,
      recepcion: ef?.callReceivedAt ? ef.callReceivedAt.toISOString() : "",
      llegadaEquipo: ef?.teamArrivalAt ? ef.teamArrivalAt.toISOString() : "",
      inicioRcp: ef?.cprStartedAt ? ef.cprStartedAt.toISOString() : "",
      rceHora: ef?.returnOfSpontaneousCirculationAt
        ? ef.returnOfSpontaneousCirculationAt.toISOString()
        : "",
      finEvento: ef?.eventEndedAt ? ef.eventEndedAt.toISOString() : "",
      tiempoRespuestaMinutos: responseTime,
      rce: hasRce ? "si" : "no",
      viaAerea: ef?.airwayManagement || "",
      accesosVenosos: ef?.venousAccess || "",
      estadoPostReanimacion: ef?.postResuscitationStatus || "",
      causaSuspension: ef?.suspensionCause || "",
      carroUtilizado: ef?.crashCart ? ef.crashCart.name : "",
      defibrillations: ef?.defibrillations || [],
      drugsAdministered: ef?.drugsAdministered || [],
      teamAssignments: ef?.teamAssignments || [],
    };
  });
}

async function summary(query) {
  const filters = parseFilters(query);
  const [calls, byType, byOrigin] = await Promise.all([
    repo.calls(filters),
    repo.countByType(filters),
    repo.countByOrigin(filters),
  ]);
  const total = calls.length;

  const rceCount = calls.filter((c) => c.eventForm && c.eventForm.returnOfSpontaneousCirculationAt).length;
  const survivalRate = total ? Math.round((rceCount / total) * 1000) / 10 : 0;

  const toPercent = (rows, key) =>
    Object.fromEntries(
      rows.map((r) => [
        r[key],
        total ? Math.round((r._count._all / total) * 1000) / 10 : 0,
      ])
    );

  return {
    totalCalls: total,
    averageResponseTimeMinutes: averageResponseMinutes(calls),
    survivalRatePercent: survivalRate,
    rceCount,
    callsByType: Object.fromEntries(byType.map((r) => [r.type, r._count._all])),
    callsByOrigin: Object.fromEntries(byOrigin.map((r) => [r.origin, r._count._all])),
    percentByType: toPercent(byType, "type"),
    percentByOrigin: toPercent(byOrigin, "origin"),
  };
}

async function calls(query) {
  let take;
  if (query.limit !== undefined) {
    const n = Number(query.limit);
    if (Number.isInteger(n) && n > 0) take = n;
  }
  return flattenCalls(await repo.calls(parseFilters(query), { take }));
}

async function exportCsv(query) {
  const flat = flattenCalls(await repo.calls(parseFilters(query)));
  const csvRows = flat.map((r) => ({
    "ID Llamado": r.id,
    "Fecha": r.fecha,
    "Tipo": r.tipo === "EMERGENCY" ? "Emergencia" : "Normal",
    "Origen": r.origen === "INTRA_HOSPITAL" ? "Intrahospitalario" : "Extrahospitalario",
    "Área": r.area,
    "Paciente": r.pacienteId,
    "Edad": r.pacienteEdad ?? "s/d",
    "Sexo": r.pacienteSexo || "s/d",
    "Recepción": r.recepcion || "s/d",
    "Llegada Equipo": r.llegadaEquipo || "s/d",
    "Inicio RCP": r.inicioRcp || "s/d",
    "Fin Evento": r.finEvento || "s/d",
    "T. Respuesta (min)": r.tiempoRespuestaMinutos ?? "s/d",
    "RCE": r.rce === "si" ? "Sí" : "No",
    "Vía Aérea": r.viaAerea || "s/d",
    "Accesos Venosos": r.accesosVenosos || "s/d",
    "Estado Post-Reanimación": r.estadoPostReanimacion || "s/d",
    "Causa Suspensión": r.causaSuspension || "s/d",
    "Carro Utilizado": r.carroUtilizado || "s/d",
    "Cargado Por": r.cargadoPor,
  }));
  return toCsv(csvRows);
}

async function exportPdf(query) {
  const s = await summary(query);
  const rows = flattenCalls(await repo.calls(parseFilters(query)));
  const lines = [
    `Total de llamados: ${s.totalCalls}`,
    `Tiempo promedio de respuesta: ${s.averageResponseTimeMinutes ?? "s/d"} min`,
    `Tasa de RCE (Supervivencia inicial): ${s.survivalRatePercent}%`,
    `Por tipo: Emergencia (${s.callsByType?.EMERGENCY || 0}), Normal (${s.callsByType?.NORMAL || 0})`,
    `Por origen: Intra (${s.callsByOrigin?.INTRA_HOSPITAL || 0}), Extra (${s.callsByOrigin?.EXTRA_HOSPITAL || 0})`,
    "",
    "Fecha | Tipo | Origen | Area | Paciente | T.Resp | RCE | Cargado por",
    ...rows.map(
      (r) =>
        `${r.fecha.slice(0, 16).replace("T", " ")} | ${r.tipo} | ${r.origen} | ${r.area} | ${r.pacienteId} | ${r.tiempoRespuestaMinutos ?? "-"}m | ${r.rce} | ${r.cargadoPor}`
    ),
  ];
  return buildSimplePdf("Blue Code - Reporte de Auditoría Utstein", lines);
}

async function crashCarts(query) {
  const filters = parseFilters(query);
  const [carts, consumptions] = await Promise.all([repo.crashCarts(), repo.consumptions(filters)]);
  return {
    carts: carts.map((c) => ({
      id: c.id,
      nombre: c.name,
      estado: c.status,
      area: c.area ? c.area.name : null,
      areaId: c.areaId,
      reactivadoEl: c.reactivatedAt,
      reactivadoPor: c.reactivatedBy ? c.reactivatedBy.username : null,
      // Composición estándar del carro (no hay stock remanente en vivo).
      composicionEstandar: c.items.map((it) => ({
        item: it.name,
        categoria: it.category,
        cantidadEstandar: it.standardQuantity,
        unidad: it.unit || null,
      })),
    })),
    consumptions: consumptions.map((k) => ({
      fecha: k.consumedAt,
      carroId: k.crashCartId,
      carro: k.crashCart ? k.crashCart.name : null,
      item: k.crashCartItem ? k.crashCartItem.name : null,
      cantidad: k.quantity,
      llamadoId: k.callId,
    })),
  };
}

module.exports = { summary, calls, exportCsv, exportPdf, crashCarts };