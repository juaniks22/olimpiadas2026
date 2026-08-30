const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");
const controller = require("./responseTeam.controller");

// Dos routers: se montan en /response-team-positions y /staff-members (ver app.js).

const positions = Router();
positions.use(authenticate);
positions.get("/", controller.listPositions);
positions.post("/", authorize("ADMIN"), controller.createPosition);
positions.patch("/:id", authorize("ADMIN"), controller.updatePosition);

const staff = Router();
staff.use(authenticate);
// Lectura: ambos roles (el Jefe de Piso elige personal al completar teamAssignments en un Call).
staff.get("/", controller.listStaff);
staff.get("/:id", controller.getStaff);
staff.post("/", authorize("ADMIN"), controller.createStaff);
staff.patch("/:id", authorize("ADMIN"), controller.updateStaff);
staff.delete("/:id", authorize("ADMIN"), controller.removeStaff);

module.exports = { positions, staff };
