// Error de dominio con código HTTP. Lo lanzan los Services; lo formatea el errorHandler.
class AppError extends Error {
  // Constructor que inicializa el error con el status HTTP, el mensaje principal y detalles adicionales opcionales.
  constructor(status, message, details) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.details = details;
  }
}

module.exports = AppError;
