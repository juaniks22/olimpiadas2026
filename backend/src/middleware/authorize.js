// Restringe una ruta a ciertos roles. Usar siempre después de authenticate.
const AppError = require("../utils/AppError");

// Función de orden superior que devuelve un middleware de autorización basado en roles.
// Se ejecuta DESPUÉS de `authenticate`, verificando que req.user.role esté entre los permitidos.
// Lanza un AppError 403 (manejado por el errorHandler) si el usuario no tiene los permisos necesarios.
function authorize(...roles) {
  return function authorizeMiddleware(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, "No tenés permisos para esta operación");
    }
    next();
  };
}

module.exports = authorize;
