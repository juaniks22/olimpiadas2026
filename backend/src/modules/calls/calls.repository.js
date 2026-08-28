const prisma = require("../../config/prisma");

// Include completo: un llamado con todo lo anidado (para GET /calls/:id y la respuesta de POST).
const fullInclude = {
  area: true,
  createdBy: { select: { id: true, username: true, role: true } },
  eventForm: {
    include: {
      defibrillations: { orderBy: { sequenceNumber: "asc" } },
      drugsAdministered: { orderBy: { administeredAt: "asc" } },
      teamAssignments: { include: { position: true, staffMember: true } },
      crashCart: true,
    },
  },
  consumptions: { include: { crashCartItem: true } },
};

module.exports = {
  fullInclude,
  findMany: (where) =>
    prisma.call.findMany({ where, include: fullInclude, orderBy: { createdAt: "desc" } }),
  findById: (id) => prisma.call.findUnique({ where: { id }, include: fullInclude }),

  // Crea Call + EventForm + hijos + consumos del carro en UNA transacción (todo o nada).
  // La validación previa ya vive en el Service; acá solo se escribe.
  // timeout amplio: la DB está en Railway y la tx hace varios round-trips.
  createGraph: async (payload) => {
    const callId = await prisma.$transaction(async (tx) => {
      const ef = payload.eventForm;

      const call = await tx.call.create({
        data: {
          type: payload.type,
          origin: payload.origin,
          areaId: payload.areaId,
          createdByUserId: payload.createdByUserId,
        },
      });

      const eventForm = await tx.eventForm.create({
        data: {
          callId: call.id,
          patientIdentificationType: ef.patientIdentificationType,
          patientDni: ef.patientDni,
          patientTemporaryId: ef.patientTemporaryId,
          patientSex: ef.patientSex,
          patientAge: ef.patientAge,
          admissionDate: ef.admissionDate,
          timeSinceDiscoveryMinutes: ef.timeSinceDiscoveryMinutes,
          callReceivedAt: ef.callReceivedAt,
          teamArrivalAt: ef.teamArrivalAt,
          cprStartedAt: ef.cprStartedAt,
          returnOfSpontaneousCirculationAt: ef.returnOfSpontaneousCirculationAt,
          eventEndedAt: ef.eventEndedAt,
          airwayManagement: ef.airwayManagement,
          venousAccess: ef.venousAccess,
          postResuscitationStatus: ef.postResuscitationStatus,
          suspensionCause: ef.suspensionCause,
          crashCartId: ef.crashCartId,
        },
      });

      if (payload.defibrillations.length) {
        await tx.defibrillationRecord.createMany({
          data: payload.defibrillations.map((d) => ({
            eventFormId: eventForm.id,
            sequenceNumber: d.sequenceNumber,
            performedAt: d.performedAt,
            energyDelivered: d.energyDelivered ?? null,
            rhythm: d.rhythm ?? null,
          })),
        });
      }

      if (payload.drugsAdministered.length) {
        await tx.drugAdministered.createMany({
          data: payload.drugsAdministered.map((d) => ({
            eventFormId: eventForm.id,
            drugName: d.drugName,
            dose: d.dose,
            unit: d.unit,
            route: d.route ?? null,
            administeredAt: d.administeredAt,
          })),
        });
      }

      if (payload.teamAssignments.length) {
        await tx.responseTeamAssignment.createMany({
          data: payload.teamAssignments.map((a) => ({
            eventFormId: eventForm.id,
            positionId: a.positionId,
            staffMemberId: a.staffMemberId,
          })),
        });
      }

      if (payload.crashCartConsumptions.length) {
        const crashCartId = ef.crashCartId;
        for (const cons of payload.crashCartConsumptions) {
          await tx.crashCartConsumption.create({
            data: {
              callId: call.id,
              crashCartId,
              crashCartItemId: cons.crashCartItemId,
              quantity: cons.quantity,
            },
          });
          await tx.crashCartItemStock.update({
            where: {
              crashCartId_crashCartItemId: { crashCartId, crashCartItemId: cons.crashCartItemId },
            },
            data: { intactUnitsRemaining: { decrement: cons.quantity } },
          });
        }
        // Regla de negocio v2.3: cualquier consumo deja el CARRO COMPLETO fuera de servicio.
        await tx.crashCart.update({ where: { id: crashCartId }, data: { status: "OUT_OF_SERVICE" } });
      }

      return call.id;
    }, { timeout: 20000, maxWait: 10000 });

    // Re-query fuera de la transacción para no consumir su ventana de tiempo.
    return prisma.call.findUnique({ where: { id: callId }, include: fullInclude });
  },
};
