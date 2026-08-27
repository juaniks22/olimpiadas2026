// Verifica el JWT del header Authorization: Bearer <token>.
// Sesión deslizante: cada request válido devuelve un token nuevo en el header X-Session-Token,
// renovando la ventana de 15 min. Es expiración POR INACTIVIDAD (CP-15), no un límite duro.
// El cliente (web/mobile) debe reemplazar su token guardado con el de ese header en cada respuesta.
const AppError = require("../utils/AppError");
const token = require("../utils/token");
const usersRepository = require("../modules/users/users.repository");

async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, value] = header.split(" ");

  if (scheme !== "Bearer" || !value) {
    throw new AppError(401, "Falta el token de sesión");
  }

  let payload;
  try {
    payload = token.verify(value);
  } catch (err) {
    const expired = err.name === "TokenExpiredError";
    throw new AppError(401, expired ? "La sesión expiró por inactividad" : "Token inválido");
  }

  const user = await usersRepository.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new AppError(401, "La cuenta no existe o está desactivada");
  }

  req.user = { id: user.id, username: user.username, role: user.role };
  res.setHeader("X-Session-Token", token.sign(user));
  next();
}

module.exports = authenticate;
