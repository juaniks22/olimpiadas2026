const service = require("./crashCarts.service");

module.exports = {
  listPositions: async (req, res) => res.json(await service.listPositions(req.query)),
  createPosition: async (req, res) => res.status(201).json(await service.createPosition(req.body)),
  updatePosition: async (req, res) => res.json(await service.updatePosition(req.params.id, req.body)),

  defaultComposition: (req, res) => res.json(service.getDefaultComposition()),

  listItems: async (req, res) => res.json(await service.listItems(req.query)),
  createItem: async (req, res) => res.status(201).json(await service.createItem(req.body)),
  updateItem: async (req, res) => res.json(await service.updateItem(req.params.id, req.body)),
  removeItem: async (req, res) => res.json(await service.removeItem(req.params.id)),

  listCarts: async (req, res) => res.json(await service.listCarts(req.query)),
  getCart: async (req, res) => res.json(await service.getCart(req.params.id)),
  listConsumptions: async (req, res) => res.json(await service.listConsumptions(req.params.id)),
  createCart: async (req, res) => res.status(201).json(await service.createCart(req.body)),
  loadDefaultComposition: async (req, res) =>
    res.json(await service.loadDefaultComposition(req.params.id)),
  updateCart: async (req, res) => res.json(await service.updateCart(req.params.id, req.body)),
  reactivate: async (req, res) => res.json(await service.reactivate(req.params.id, req.user.id)),
};
