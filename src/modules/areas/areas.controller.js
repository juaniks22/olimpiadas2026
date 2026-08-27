const service = require("./areas.service");

module.exports = {
  list: async (req, res) => res.json(await service.list(req.query)),
  getById: async (req, res) => res.json(await service.getById(req.params.id)),
  create: async (req, res) => res.status(201).json(await service.create(req.body)),
  update: async (req, res) => res.json(await service.update(req.params.id, req.body)),
  deactivate: async (req, res) => res.json(await service.deactivate(req.params.id)),
};
