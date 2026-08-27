const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");
const controller = require("./users.controller");

const router = Router();
router.use(authenticate, authorize("ADMIN"));

// Utilidad: sugiere una contraseña segura sin persistir. Va antes de "/:id".
router.post("/generate-password", controller.generatePassword);

router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:id", controller.getById);
router.patch("/:id", controller.update);
router.post("/:id/deactivate", controller.deactivate);
router.post("/:id/reactivate", controller.reactivate);
router.post("/:id/reset-password", controller.resetPassword);

module.exports = router;
