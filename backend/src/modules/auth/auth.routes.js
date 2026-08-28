const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const controller = require("./auth.controller");

const router = Router();

router.post("/login", controller.login);
router.get("/me", authenticate, controller.me);
router.post("/change-password", authenticate, controller.changePassword);

module.exports = router;
