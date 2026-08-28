const AppError = require("../../utils/AppError");
const password = require("../../utils/password");
const token = require("../../utils/token");
const { requireFields } = require("../../utils/validate");
const usersRepository = require("../users/users.repository");

function toPublic(user) {
  return { id: user.id, username: user.username, role: user.role, isActive: user.isActive };
}

async function login(body) {
  requireFields(body, ["username", "password"]);
  const user = await usersRepository.findByUsername(body.username);
  // Mismo mensaje para usuario inexistente / inactivo / password mala: no filtrar info.
  if (!user || !user.isActive) throw new AppError(401, "Usuario o contraseña incorrectos");

  const ok = await password.compare(body.password, user.passwordHash);
  if (!ok) throw new AppError(401, "Usuario o contraseña incorrectos");

  return { token: token.sign(user), user: toPublic(user) };
}

async function me(userId) {
  const user = await usersRepository.findByIdPublic(userId);
  if (!user) throw new AppError(404, "Cuenta no encontrada");
  return user;
}

async function changePassword(userId, body) {
  requireFields(body, ["currentPassword", "newPassword"]);
  const user = await usersRepository.findById(userId);
  if (!user) throw new AppError(404, "Cuenta no encontrada");

  const ok = await password.compare(body.currentPassword, user.passwordHash);
  if (!ok) throw new AppError(400, "La contraseña actual es incorrecta");

  password.assertPolicy(body.newPassword);
  await usersRepository.update(userId, { passwordHash: await password.hash(body.newPassword) });
  return { ok: true };
}

module.exports = { login, me, changePassword };
