const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");
const controller = require("./areas.controller");

const router = Router();
router.use(authenticate);

// Lectura: ambos roles (el Jefe de Piso necesita elegir área al cargar un llamado).
router.get("/", controller.list);
router.get("/:id", controller.getById);

// Escritura: solo Admin.
router.post("/", authorize("ADMIN"), controller.create);
router.patch("/:id", authorize("ADMIN"), controller.update);
router.post("/:id/deactivate", authorize("ADMIN"), controller.deactivate);

module.exports = router;
