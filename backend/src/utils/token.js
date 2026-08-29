// Utilidades para firma y verificación de JWT. 
// No se implementa refresh token por decisión de diseño (forzar re-logins en terminales compartidas).
const jwt = require("jsonwebtoken");
const env = require("../config/env");

// Firma un nuevo token JWT inyectando el ID (sub), username y rol del usuario.
// El token expira según lo definido en las variables de entorno (por defecto 15 mins).
function sign(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

// Verifica la validez y firma de un token JWT recibido.
// Retorna el payload decodificado si es válido, o lanza un error si expiró o fue adulterado.
function verify(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = { sign, verify };
