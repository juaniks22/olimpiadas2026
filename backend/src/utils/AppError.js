// Error de dominio con código HTTP. Lo lanzan los Services; lo formatea el errorHandler.
class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.details = details;
  }
}

module.exports = AppError;
