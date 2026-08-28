const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const controller = require("./calls.controller");

const router = Router();
router.use(authenticate);

// Ambos roles pueden crear (el flujo normal lo hace el Jefe de Piso).
// Sin PUT/PATCH/DELETE: el llamado es inmutable una vez cargado.
router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:id", controller.getById);

module.exports = router;
