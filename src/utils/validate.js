// Helpers de validación livianos (sin librería externa, por presupuesto de tiempo).
const AppError = require("./AppError");

function fail(message, details) {
  throw new AppError(400, message, details);
}

function ensure(condition, message) {
  if (!condition) fail(message);
}

function requireFields(obj, fields) {
  const source = obj || {};
  const missing = fields.filter(
    (f) => source[f] === undefined || source[f] === null || source[f] === ""
  );
  if (missing.length) fail(`Faltan campos obligatorios: ${missing.join(", ")}`);
}

function isEnum(value, allowed) {
  return allowed.includes(value);
}

function parseBool(value) {
  if (value === undefined) return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

// Devuelve Date o undefined; lanza 400 si el valor está presente pero es inválido.
function parseDate(value, field) {
  if (value === undefined || value === null || value === "") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) fail(`Fecha inválida en ${field}`);
  return date;
}

module.exports = { fail, ensure, requireFields, isEnum, parseBool, parseDate };
