// Seed de datos demo para el módulo de Reportes.
// Crea áreas, llamados con formularios Utstein realistas para demostración.
// Idempotente: si ya hay ≥ 20 llamados, no crea nada.
const prisma = require("../../config/prisma");

const DEMO_AREAS = [
  "UTI - Unidad de Terapia Intensiva",
  "Guardia Central",
  "Quirófano 1",
  "Sala General 2°P",
  "Neonatología",
];

const SEXES = ["M", "F", "M", "F", "M", "M", "F"];
const AIRWAY_OPTIONS = [
  "Tubo endotraqueal",
  "Máscara laríngea",
  "Cánula orofaríngea",
  "Bolsa-válvula-máscara",
];
const VENOUS_OPTIONS = [
  "Acceso periférico 18G",
  "Acceso periférico 20G",
  "Vía central subclavia",
  "Acceso intraóseo tibial",
];
const POST_RESUS = [
  "Estable, derivado a UTI",
  "Requiere ARM, derivado a UTI",
  "Estable con monitoreo continuo",
  "Derivado a hemodinámica",
];
const SUSPENSION_CAUSES = [
  "Asistolia refractaria > 20 min",
  "Decisión médica consensuada",
  "Voluntad anticipada del paciente",
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

async function seedDemoData() {
  // Idempotencia: no crear si ya hay suficientes datos
  const existingCount = await prisma.call.count();
  if (existingCount >= 20) {
    return { created: 0, message: "Ya existen datos suficientes en la base." };
  }

  // 1. Asegurar que existan áreas demo
  const areaRecords = [];
  for (const name of DEMO_AREAS) {
    const area = await prisma.area.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    areaRecords.push(area);
  }

  // 2. Obtener un usuario ADMIN para asignar como creador
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!adminUser) {
    throw new Error("No existe usuario ADMIN para asignar como creador de los llamados demo.");
  }

  // 3. Crear ~25 llamados distribuidos en los últimos 30 días
  const now = new Date();
  const TOTAL = 25;
  let created = 0;

  for (let i = 0; i < TOTAL; i++) {
    // Fecha aleatoria en los últimos 30 días
    const daysAgo = randomInt(0, 29);
    const hour = randomInt(0, 23);
    const minute = randomInt(0, 59);
    const baseDate = new Date(now);
    baseDate.setDate(baseDate.getDate() - daysAgo);
    baseDate.setHours(hour, minute, 0, 0);

    // Tipo y origen
    const isEmergency = Math.random() < 0.6; // 60% emergencias
    const type = isEmergency ? "EMERGENCY" : "NORMAL";
    const origin = Math.random() < 0.7 ? "INTRA_HOSPITAL" : "EXTRA_HOSPITAL";
    const area = randomPick(areaRecords);

    // Cronología Utstein
    const callReceivedAt = baseDate;
    const teamArrivalMinutes = randomInt(1, 6); // 1–6 min
    const teamArrivalAt = addMinutes(callReceivedAt, teamArrivalMinutes);
    const cprStartedAt = addMinutes(teamArrivalAt, randomInt(0, 2));

    // RCE: ~60% de las emergencias, ~80% de los normales
    const rceChance = isEmergency ? 0.6 : 0.8;
    const hasRce = Math.random() < rceChance;
    const rceAt = hasRce ? addMinutes(cprStartedAt, randomInt(3, 12)) : null;
    const eventEndedAt = addMinutes(cprStartedAt, randomInt(15, 45));

    // Paciente
    const identType = randomPick(["DNI", "TEMPORARY_ID", "NN"]);
    const patientDni = identType === "DNI" ? String(randomInt(10000000, 45000000)) : null;
    const patientTempId = identType === "TEMPORARY_ID" ? `TP-${randomInt(1000, 9999)}` : null;
    const patientAge = randomInt(25, 88);
    const patientSex = randomPick(SEXES);

    await prisma.call.create({
      data: {
        type,
        origin,
        areaId: area.id,
        createdByUserId: adminUser.id,
        createdAt: callReceivedAt,
        eventForm: {
          create: {
            patientIdentificationType: identType,
            patientDni,
            patientTemporaryId: patientTempId,
            patientSex,
            patientAge,
            callReceivedAt,
            teamArrivalAt,
            cprStartedAt,
            returnOfSpontaneousCirculationAt: rceAt,
            eventEndedAt,
            airwayManagement: randomPick(AIRWAY_OPTIONS),
            venousAccess: randomPick(VENOUS_OPTIONS),
            postResuscitationStatus: hasRce ? randomPick(POST_RESUS) : null,
            suspensionCause: !hasRce ? randomPick(SUSPENSION_CAUSES) : null,
          },
        },
      },
    });

    created++;
  }

  return { created, message: `Se crearon ${created} llamados de demostración.` };
}

module.exports = { seedDemoData };
