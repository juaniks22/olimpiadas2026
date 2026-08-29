// Política de contraseñas (CP-15): 8 a 12 caracteres combinando mayúsculas, minúsculas,
// números y símbolos especiales. Aplica a AMBOS tipos de cuenta. Generación automática opcional.
const bcrypt = require("bcrypt");
const { randomInt } = require("crypto");
const AppError = require("./AppError");

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?";
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

const BCRYPT_ROUNDS = 10;
const MIN_LEN = 8;
const MAX_LEN = 12;

// Validar que la contraseña cumpla con las políticas de seguridad: 
// longitud mínima y máxima, y caracteres requeridos (mayúsculas, minúsculas, números y símbolos).
function assertPolicy(password) {
  const problems = [];
  if (typeof password !== "string" || password.length < MIN_LEN || password.length > MAX_LEN) {
    problems.push(`debe tener entre ${MIN_LEN} y ${MAX_LEN} caracteres`);
  }
  if (!/[a-z]/.test(password)) problems.push("debe incluir una minúscula");
  if (!/[A-Z]/.test(password)) problems.push("debe incluir una mayúscula");
  if (!/[0-9]/.test(password)) problems.push("debe incluir un número");
  if (!/[^A-Za-z0-9]/.test(password)) problems.push("debe incluir un símbolo especial");
  if (problems.length) {
    throw new AppError(400, `La contraseña ${problems.join(", ")}`);
  }
}

// Helper para seleccionar aleatoriamente un carácter de un string o arreglo de caracteres.
function pick(chars) {
  return chars[randomInt(chars.length)];
}

// Genera una contraseña segura y aleatoria de 12 caracteres.
// Garantiza que contenga al menos un carácter de cada grupo obligatorio, usando Fisher-Yates para mezclar sus posiciones.
function generate() {
  const out = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  while (out.length < MAX_LEN) out.push(pick(ALL));
  // Fisher-Yates para que las 4 clases obligatorias no queden siempre al principio.
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join("");
}

// Hashea la contraseña en texto plano utilizando bcrypt y la cantidad de rondas definida.
function hash(plainPassword) {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

// Compara una contraseña en texto plano contra un hash de bcrypt para verificar si coinciden.
function compare(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

module.exports = { assertPolicy, generate, hash, compare };
