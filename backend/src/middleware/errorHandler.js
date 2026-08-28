const AppError = require("../utils/AppError");

function notFound(req, res) {
  res.status(404).json({
    error: { message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` },
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { message: err.message, details: err.details } });
  }

  // Errores conocidos de Prisma
  if (err.code === "P2002") {
    return res
      .status(409)
      .json({ error: { message: `Ya existe un registro con ese valor único (${err.meta?.target})` } });
  }
  if (err.code === "P2025") {
    return res.status(404).json({ error: { message: "Registro no encontrado" } });
  }
  if (err.code === "P2003") {
    return res.status(400).json({ error: { message: "Referencia inválida a otro registro" } });
  }

  // Body JSON mal formado (express.json)
  if (err.type === "entity.parse.failed" || (err instanceof SyntaxError && "body" in err)) {
    return res.status(400).json({ error: { message: "JSON inválido en el cuerpo del request" } });
  }

  console.error("[error]", err);
  res.status(500).json({ error: { message: "Error interno del servidor" } });
}

module.exports = { notFound, errorHandler };
