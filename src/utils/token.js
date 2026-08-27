// Firma/verificación de JWT. Sin refresh token (decisión consciente, RN-3/RN-4).
const jwt = require("jsonwebtoken");
const env = require("../config/env");

function sign(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function verify(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = { sign, verify };
