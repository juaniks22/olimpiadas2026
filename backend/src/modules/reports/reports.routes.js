const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");
const controller = require("./reports.controller");

const router = Router();
router.use(authenticate, authorize("ADMIN"));

router.get("/summary", controller.summary);
router.get("/calls", controller.calls);
router.get("/crash-carts", controller.crashCarts);
router.get("/export/csv", controller.exportCsv);
router.get("/export/pdf", controller.exportPdf);
router.post("/seed-demo", controller.seedDemo);

module.exports = router;

