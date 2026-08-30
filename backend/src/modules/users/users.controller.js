const service = require("./users.service");

module.exports = {
  list: async (req, res) => res.json(await service.list(req.query)),
  getById: async (req, res) => res.json(await service.getById(req.params.id)),
  create: async (req, res) => res.status(201).json(await service.create(req.body)),
  update: async (req, res) => res.json(await service.update(req.params.id, req.body)),
  remove: async (req, res) => res.json(await service.remove(req.params.id)),
  deactivate: async (req, res) => res.json(await service.setActive(req.params.id, false)),
  reactivate: async (req, res) => res.json(await service.setActive(req.params.id, true)),
  resetPassword: async (req, res) => res.json(await service.resetPassword(req.params.id, req.body)),
  generatePassword: (req, res) => res.json(service.suggestPassword()),
};
