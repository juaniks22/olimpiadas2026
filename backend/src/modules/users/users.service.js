// ABM de cuentas GENERIC (Jefe de Piso). Exclusivo del Admin (rutas ya lo restringen).
// El Administrador es cuenta única sembrada aparte (scripts/seedAdmin.js): este ABM
// solo crea/edita cuentas GENERIC.
const AppError = require("../../utils/AppError");
const password = require("../../utils/password");
const { requireFields, parseBool } = require("../../utils/validate");
const repo = require("./users.repository");

function resolvePassword(body) {
  let plain = body.password;
  const generated = !plain && body.generatePassword === true;
  if (generated) plain = password.generate();
  if (!plain) {
    throw new AppError(400, "Indicá 'password' o pedí 'generatePassword: true'");
  }
  password.assertPolicy(plain);
  return { plain, generated };
}

async function list(query) {
  const where = {};
  const isActive = parseBool(query.isActive);
  if (isActive !== undefined) where.isActive = isActive;
  return repo.findMany(where);
}

async function getById(id) {
  const user = await repo.findByIdPublic(id);
  if (!user) throw new AppError(404, "Cuenta no encontrada");
  return user;
}

async function create(body) {
  requireFields(body, ["username"]);
  if (await repo.findByUsername(body.username)) {
    throw new AppError(409, "El nombre de usuario ya está en uso");
  }
  const { plain, generated } = resolvePassword(body);
  const user = await repo.create({
    username: body.username,
    passwordHash: await password.hash(plain),
    role: "GENERIC",
  });
  return generated ? { ...user, generatedPassword: plain } : user;
}

async function update(id, body) {
  await getById(id);
  const data = {};
  if (body.username !== undefined) {
    const clash = await repo.findByUsername(body.username);
    if (clash && clash.id !== id) throw new AppError(409, "El nombre de usuario ya está en uso");
    data.username = body.username;
  }
  if (!Object.keys(data).length) throw new AppError(400, "Nada para actualizar");
  return repo.update(id, data);
}

async function setActive(id, isActive) {
  const user = await repo.findById(id);
  if (!user) throw new AppError(404, "Cuenta no encontrada");
  if (user.role === "ADMIN") throw new AppError(400, "No se puede desactivar la cuenta Administradora");
  return repo.update(id, { isActive });
}

async function resetPassword(id, body) {
  const user = await repo.findById(id);
  if (!user) throw new AppError(404, "Cuenta no encontrada");
  const { plain, generated } = resolvePassword(body);
  await repo.update(id, { passwordHash: await password.hash(plain) });
  return generated ? { generatedPassword: plain } : { ok: true };
}

function suggestPassword() {
  return { password: password.generate() };
}

module.exports = { list, getById, create, update, setActive, resetPassword, suggestPassword };
