// Composición estándar POR DEFECTO de un carro de paro: 28 medicamentos con su categoría
// terapéutica. Fuente única de verdad — la usan el seed (prisma/seed.js) y el endpoint
// POST /crash-carts (loadDefaultComposition) / GET /crash-carts/default-composition.
//
// Las categorías ya están resueltas: 5 medicamentos de la lista original aparecían en dos
// categorías; se les asignó una sola. No hay filas duplicadas.

const DEFAULT_MEDICATION_POSITION = "Medicación";
const DEFAULT_STANDARD_QUANTITY = 1;

const DEFAULT_MEDICATIONS = [
  { name: "Diazepam", category: "Benzodiacepinas", unit: "Ampolla / comprimido" },
  { name: "Lorazepam", category: "Benzodiacepinas", unit: "Ampolla / comprimido" },
  { name: "Midazolam", category: "Benzodiacepinas", unit: "Ampolla / frasco ampolla" },
  { name: "Clonazepam", category: "Benzodiacepinas", unit: "Comprimido / gotas" },
  { name: "Fenitoína", category: "Anticonvulsivos", unit: "Ampolla / frasco ampolla" },
  { name: "Levetiracetam", category: "Anticonvulsivos", unit: "Frasco ampolla / comprimido" },
  { name: "Fentanilo", category: "Opioides", unit: "Ampolla" },
  { name: "Morfina", category: "Opioides", unit: "Ampolla" },
  { name: "Nalbufina", category: "Opioides", unit: "Ampolla" },
  { name: "Adenosina", category: "Cardíacos", unit: "Ampolla / jeringa" },
  { name: "Digoxina", category: "Cardíacos", unit: "Ampolla / comprimido" },
  { name: "Dopamina", category: "Cardíacos", unit: "Ampolla / frasco ampolla" },
  { name: "Noradrenalina", category: "Cardíacos", unit: "Ampolla / frasco ampolla" },
  { name: "Nitroglicerina", category: "Cardíacos", unit: "Ampolla / frasco ampolla" },
  { name: "Labetalol", category: "Cardíacos", unit: "Ampolla / comprimido" },
  { name: "Adrenalina", category: "Fármacos para Paro Cardíaco", unit: "Ampolla" },
  { name: "Amiodarona", category: "Fármacos para Paro Cardíaco", unit: "Ampolla" },
  { name: "Atropina", category: "Fármacos para Paro Cardíaco", unit: "Ampolla" },
  { name: "Cloruro de Sodio (Suero)", category: "Fármacos para Paro Cardíaco", unit: "Bolsa / frasco" },
  { name: "Gluconato de Calcio", category: "Fármacos para Paro Cardíaco", unit: "Ampolla" },
  { name: "Flumazenil", category: "Antídotos", unit: "Ampolla" },
  { name: "Naloxona", category: "Antídotos", unit: "Ampolla" },
  { name: "Ácido Tranexámico", category: "Otros", unit: "Ampolla" },
  { name: "Haloperidol", category: "Otros", unit: "Ampolla / comprimido" },
  { name: "Levomepromazina", category: "Otros", unit: "Ampolla / comprimido" },
  { name: "Risperidona", category: "Otros", unit: "Comprimido / solución oral" },
  { name: "Ketamina", category: "Otros", unit: "Ampolla / frasco ampolla" },
  { name: "Diclofenac", category: "Otros", unit: "Ampolla / comprimido" },
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
