// Restringe una ruta a ciertos roles. Usar siempre después de authenticate.
const AppError = require("../utils/AppError");

function authorize(...roles) {
  return function authorizeMiddleware(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, "No tenés permisos para esta operación");
    }
    next();
  };
}

module.exports = authorize;
