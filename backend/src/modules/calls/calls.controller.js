const service = require("./calls.service");

module.exports = {
  list: async (req, res) => res.json(await service.list(req.user, req.query)),
  create: async (req, res) => res.status(201).json(await service.create(req.user, req.body)),
  getById: async (req, res) => res.json(await service.getById(req.user, req.params.id)),
};
