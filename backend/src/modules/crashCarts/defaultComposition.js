// Composición estándar POR DEFECTO de un carro de paro: 28 medicamentos con su categoría
// terapéutica. Fuente única de verdad — la usan el seed (prisma/seed.js) y el endpoint
// POST /crash-carts (loadDefaultComposition) / GET /crash-carts/default-composition.
//
// Las categorías ya están resueltas: 5 medicamentos de la lista original aparecían en dos
// categorías; se les asignó una sola. No hay filas duplicadas.

const DEFAULT_MEDICATION_POSITION = "Medicación";
const DEFAULT_STANDARD_QUANTITY = 1;

const DEFAULT_MEDICATIONS = [
  { name: "Diazepam", category: "Benzodiacepinas" },
  { name: "Lorazepam", category: "Benzodiacepinas" },
  { name: "Midazolam", category: "Benzodiacepinas" },
  { name: "Clonazepam", category: "Benzodiacepinas" },
  { name: "Fenitoína", category: "Anticonvulsivos" },
  { name: "Levetiracetam", category: "Anticonvulsivos" },
  { name: "Fentanilo", category: "Opioides" },
  { name: "Morfina", category: "Opioides" },
  { name: "Nalbufina", category: "Opioides" },
  { name: "Adenosina", category: "Cardíacos" },
  { name: "Digoxina", category: "Cardíacos" },
  { name: "Dopamina", category: "Cardíacos" },
  { name: "Noradrenalina", category: "Cardíacos" },
  { name: "Nitroglicerina", category: "Cardíacos" },
  { name: "Labetalol", category: "Cardíacos" },
  { name: "Adrenalina", category: "Fármacos para Paro Cardíaco" },
  { name: "Amiodarona", category: "Fármacos para Paro Cardíaco" },
  { name: "Atropina", category: "Fármacos para Paro Cardíaco" },
  { name: "Cloruro de Sodio (Suero)", category: "Fármacos para Paro Cardíaco" },
  { name: "Gluconato de Calcio", category: "Fármacos para Paro Cardíaco" },
  { name: "Flumazenil", category: "Antídotos" },
  { name: "Naloxona", category: "Antídotos" },
  { name: "Ácido Tranexámico", category: "Otros" },
  { name: "Haloperidol", category: "Otros" },
  { name: "Levomepromazina", category: "Otros" },
  { name: "Risperidona", category: "Otros" },
  { name: "Ketamina", category: "Otros" },
  { name: "Diclofenac", category: "Otros" },
];

// Categorías conocidas (para selects en el frontend).
const MEDICATION_CATEGORIES = [
  "Benzodiacepinas",
  "Anticonvulsivos",
  "Opioides",
  "Cardíacos",
  "Fármacos para Paro Cardíaco",
  "Antídotos",
  "Otros",
];

module.exports = {
  DEFAULT_MEDICATION_POSITION,
  DEFAULT_STANDARD_QUANTITY,
  DEFAULT_MEDICATIONS,
  MEDICATION_CATEGORIES,
};
