/**
 * callMappers.js
 *
 * Convierte el JSON anidado que devuelve GET /api/calls/:id (Prisma nativo)
 * al formato aplanado que espera ReportDetailModal.jsx (generado por
 * reports.service.js → flattenCalls).
 *
 * Así evitamos duplicar componentes de visualización: el mismo modal
 * sirve tanto para admin (vía /api/reports/calls) como para genérico
 * (vía /api/calls).
 */

export function mapCallToReportFormat(call) {
  const ef = call.eventForm;

  let responseTime = null;
  if (ef?.callReceivedAt && ef?.teamArrivalAt) {
    const mins =
      (new Date(ef.teamArrivalAt) - new Date(ef.callReceivedAt)) / 60000;
    if (mins >= 0) responseTime = Math.round(mins * 10) / 10;
  }

  let patientId = 'NN';
  if (ef) {
    if (ef.patientDni) patientId = `DNI ${ef.patientDni}`;
    else if (ef.patientTemporaryId) patientId = `ID ${ef.patientTemporaryId}`;
    else if (ef.patientIdentificationType === 'NN') patientId = 'NN';
  }

  const hasRce = Boolean(ef?.returnOfSpontaneousCirculationAt);

  return {
    id: call.id,
    fecha: call.createdAt,
    tipo: call.type,
    origen: call.origin,
    area: call.area?.name || '',
    areaId: call.areaId,
    cargadoPor: call.createdBy?.username || '',
    pacienteId: patientId,
    pacienteTipo: ef?.patientIdentificationType || '',
    pacienteDni: ef?.patientDni || '',
    pacienteTemporaryId: ef?.patientTemporaryId || '',
    pacienteEdad: ef?.patientAge ?? null,
    pacienteSexo: ef?.patientSex || '',
    fechaIngreso: ef?.admissionDate || '',
    tiempoHallazgoMinutos: ef?.timeSinceDiscoveryMinutes ?? null,
    recepcion: ef?.callReceivedAt || '',
    llegadaEquipo: ef?.teamArrivalAt || '',
    inicioRcp: ef?.cprStartedAt || '',
    rceHora: ef?.returnOfSpontaneousCirculationAt || '',
    finEvento: ef?.eventEndedAt || '',
    tiempoRespuestaMinutos: responseTime,
    rce: hasRce ? 'si' : 'no',
    viaAerea: ef?.airwayManagement || '',
    accesosVenosos: ef?.venousAccess || '',
    estadoPostReanimacion: ef?.postResuscitationStatus || '',
    causaSuspension: ef?.suspensionCause || '',
    carroUtilizado: ef?.crashCart?.name || '',
    defibrillations: ef?.defibrillations || [],
    drugsAdministered: ef?.drugsAdministered || [],
    teamAssignments: ef?.teamAssignments || [],
  };
}
