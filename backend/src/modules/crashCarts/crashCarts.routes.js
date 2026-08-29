const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");
const controller = require("./crashCarts.controller");

// Tres routers: /crash-cart-positions, /crash-cart-items, /crash-carts (ver app.js).

const positions = Router();
positions.use(authenticate);
positions.get("/", controller.listPositions);
positions.post("/", authorize("ADMIN"), controller.createPosition);
positions.patch("/:id", authorize("ADMIN"), controller.updatePosition);

const items = Router();
items.use(authenticate);
items.get("/", controller.listItems);
items.post("/", authorize("ADMIN"), controller.createItem);
items.patch("/:id", authorize("ADMIN"), controller.updateItem);
items.delete("/:id", authorize("ADMIN"), controller.removeItem);

const carts = Router();
carts.use(authenticate);
// Composición estándar por defecto (28 medicamentos). Va antes de "/:id".
carts.get("/default-composition", controller.defaultComposition);
// Lectura: ambos roles (el Jefe de Piso debe ver qué carros están En operación para elegir uno).
carts.get("/", controller.listCarts);
carts.get("/:id", controller.getCart);
carts.get("/:id/consumptions", controller.listConsumptions);
carts.post("/", authorize("ADMIN"), controller.createCart);
carts.post("/:id/load-default-composition", authorize("ADMIN"), controller.loadDefaultComposition);
carts.patch("/:id", authorize("ADMIN"), controller.updateCart);
carts.delete("/:id", authorize("ADMIN"), controller.deleteCart);
carts.post("/:id/reactivate", authorize("ADMIN"), controller.reactivate);

module.exports = { positions, items, carts };
