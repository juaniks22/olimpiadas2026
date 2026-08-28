// Reportes — EXCLUSIVO del Administrador (CP-6, 7, 8, 9, 14).
// El tiempo promedio de respuesta (CP-6) sale de la cronología: teamArrivalAt - callReceivedAt.
const { parseDate } = require("../../utils/validate");
const { toCsv } = require("../../utils/csv");
const { buildSimplePdf } = require("../../utils/pdf");
const repo = require("./reports.repository");

function parseFilters(query) {
  return {
    areaId: query.areaId || undefined,
    origin: query.origin || undefined,
    type: query.type || undefined,
    from: parseDate(query.dateFrom, "dateFrom"),
    to: parseDate(query.dateTo, "dateTo"),
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
  return calls.map((c) => ({
    id: c.id,
    fecha: c.createdAt.toISOString(),
    tipo: c.type,
    origen: c.origin,
    area: c.area ? c.area.name : "",
    cargadoPor: c.createdBy ? c.createdBy.username : "",
    pacienteId:
      (c.eventForm && (c.eventForm.patientDni || c.eventForm.patientTemporaryId)) || "NN",
    recepcion: c.eventForm && c.eventForm.callReceivedAt
      ? c.eventForm.callReceivedAt.toISOString()
      : "",
    llegadaEquipo: c.eventForm && c.eventForm.teamArrivalAt
      ? c.eventForm.teamArrivalAt.toISOString()
      : "",
    finEvento: c.eventForm && c.eventForm.eventEndedAt
      ? c.eventForm.eventEndedAt.toISOString()
      : "",
    rce: c.eventForm && c.eventForm.returnOfSpontaneousCirculationAt ? "si" : "no",
  }));
}

async function summary(query) {
  const filters = parseFilters(query);
  const [calls, byType, byOrigin] = await Promise.all([
    repo.calls(filters),
    repo.countByType(filters),
    repo.countByOrigin(filters),
  ]);
  const total = calls.length;

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
    callsByType: Object.fromEntries(byType.map((r) => [r.type, r._count._all])),
    callsByOrigin: Object.fromEntries(byOrigin.map((r) => [r.origin, r._count._all])),
    percentByType: toPercent(byType, "type"),
    percentByOrigin: toPercent(byOrigin, "origin"),
  };
}

async function calls(query) {
  return flattenCalls(await repo.calls(parseFilters(query)));
}

async function exportCsv(query) {
  return toCsv(flattenCalls(await repo.calls(parseFilters(query))));
}

async function exportPdf(query) {
  const s = await summary(query);
  const rows = flattenCalls(await repo.calls(parseFilters(query)));
  const lines = [
    `Total de llamados: ${s.totalCalls}`,
    `Tiempo promedio de respuesta: ${s.averageResponseTimeMinutes ?? "s/d"} min`,
    `Por tipo: ${JSON.stringify(s.callsByType)}`,
    `Por origen: ${JSON.stringify(s.callsByOrigin)}`,
    "",
    "Fecha | Tipo | Origen | Area | Cargado por",
    ...rows.map((r) => `${r.fecha} | ${r.tipo} | ${r.origen} | ${r.area} | ${r.cargadoPor}`),
  ];
  return buildSimplePdf("Blue Code - Reporte de llamados", lines);
}

async function crashCarts(query) {
  const filters = parseFilters(query);
  const [carts, consumptions] = await Promise.all([repo.crashCarts(), repo.consumptions(filters)]);
  return {
    carts: carts.map((c) => ({
      id: c.id,
      nombre: c.name,
      estado: c.status,
      reactivadoEl: c.reactivatedAt,
      reactivadoPor: c.reactivatedBy ? c.reactivatedBy.username : null,
      stock: c.stocks.map((st) => ({
        item: st.crashCartItem.name,
        intactasRestantes: st.intactUnitsRemaining,
        estandar: st.crashCartItem.standardQuantity,
      })),
    })),
    consumptions: consumptions.map((k) => ({
      fecha: k.consumedAt,
      carro: k.crashCart ? k.crashCart.name : null,
      item: k.crashCartItem ? k.crashCartItem.name : null,
      cantidad: k.quantity,
      llamadoId: k.callId,
    })),
  };
}

module.exports = { summary, calls, exportCsv, exportPdf, crashCarts };
