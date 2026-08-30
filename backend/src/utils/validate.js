// Helpers de validación livianos (sin librería externa, por presupuesto de tiempo).
const AppError = require("./AppError");

// Lanza un AppError con estado 400 (Bad Request). Útil para abortar operaciones cuando fallan las validaciones.
function fail(message, details) {
  throw new AppError(400, message, details);
}

// Verifica una condición lógica y, si es falsa, lanza un error con el mensaje especificado.
function ensure(condition, message) {
  if (!condition) fail(message);
}

// Valida que un objeto contenga todos los campos obligatorios listados en el arreglo `fields`.
// Lanza error 400 indicando qué campos faltan si la validación falla.
function requireFields(obj, fields) {
  const source = obj || {};
  const missing = fields.filter(
    (f) => source[f] === undefined || source[f] === null || source[f] === ""
  );
  if (missing.length) fail(`Faltan campos obligatorios: ${missing.join(", ")}`);
}

// Comprueba si un valor dado se encuentra dentro del arreglo de valores permitidos (útil para enumeraciones).
function isEnum(value, allowed) {
  return allowed.includes(value);
}

// Convierte un valor a booleano explícito. 
// Acepta true/false o los strings "true"/"false". Retorna undefined en cualquier otro caso.
function parseBool(value) {
  if (value === undefined) return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

// Parsea un string a un objeto Date. 
// Si el valor está presente pero no es una fecha válida, lanza un error 400 asociado al nombre del campo.
function parseDate(value, field) {
  if (value === undefined || value === null || value === "") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) fail(`Fecha inválida en ${field}`);
  return date;
}

// El Jefe de Piso carga un evento que ya ocurrió y ya está firmado en papel (Documento de
// Visión, 1.1: "Flujo de carga de datos"). Ninguna fecha/hora del evento puede ser futura,
// y como el llamado es inmutable, un error de tipeo acá queda pegado para siempre.
function ensureNotFuture(date, field) {
  if (date && date.getTime() > Date.now()) {
    fail(`${field} no puede ser una fecha u hora futura`);
  }
}

// DNI argentino real: 6 a 8 dígitos numéricos únicamente.
const DNI_PATTERN = /^\d{6,8}$/;
function ensureValidDni(value, field) {
  ensure(DNI_PATTERN.test(String(value).trim()), `${field} debe tener entre 6 y 8 dígitos numéricos`);
}

module.exports = {
  fail,
  ensure,
  requireFields,
  isEnum,
  parseBool,
  parseDate,
  ensureNotFuture,
  ensureValidDni,
};
